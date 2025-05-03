import React, { useEffect, useState, useMemo, useRef } from "react";
import styles from "../styles/DashboardPage.module.css";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";

const POSTS_PAGE_SIZE = 15;

// Add PERSON_ICON for default profile
const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]); // Store following posts separately
  const [activeTab, setActiveTab] = useState("for-you");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState([]); // post IDs liked by user
  const [authorNames, setAuthorNames] = useState({}); // { username: fullName }
  const [followingUsernames, setFollowingUsernames] = useState([]); // Usernames of users being followed
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimeout = useRef();
  const navigate = useNavigate();
  const [lastVisible, setLastVisible] = useState(null);
  const feedRef = useRef();
  const [menuOpen, setMenuOpen] = useState({}); // { postId: boolean }
  const [expandedPosts, setExpandedPosts] = useState({}); // { postId: true/false }

  // Debounce search input
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

  // Memoized filtered posts (search only loaded posts)
  const filteredPosts = useMemo(() => {
    // Select the appropriate post array based on active tab
    const sourceArray = activeTab === "for-you" ? posts : followingPosts;

    if (!debouncedQuery.trim()) return sourceArray;
    const q = debouncedQuery.trim().toLowerCase();
    return sourceArray.filter((post) => {
      const title = post.title?.toLowerCase() || "";
      const text = post.text?.toLowerCase() || "";
      const author = (
        authorNames[post.username] ||
        post.username ||
        ""
      ).toLowerCase();
      return title.includes(q) || text.includes(q) || author.includes(q);
    });
  }, [debouncedQuery, posts, followingPosts, authorNames, activeTab]);

  // Load posts from sessionStorage if available
  useEffect(() => {
    const cached = sessionStorage.getItem("postsWindow");
    if (cached) {
      const { posts, lastVisible } = JSON.parse(cached);
      setPosts(posts);
      setLastVisible(lastVisible);
    }
  }, []);

  // Real-time listener for the first page
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "posts"),
      orderBy("publishedAt", "desc"),
      limit(POSTS_PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(newPosts);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      sessionStorage.setItem(
        "postsWindow",
        JSON.stringify({
          posts: newPosts,
          lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
        })
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time listener for current user's profile to update following list
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        setUserProfile(userData);
        setLikedPosts(userData.likedPosts || []);

        // Get followingId from user document
        const userFollowingList = userData.followingId || [];

        // Get usernames of followed users
        if (userFollowingList.length > 0) {
          const followedUsers = await Promise.all(
            userFollowingList.map((uid) => getDoc(doc(db, "users", uid)))
          );

          const followedUsernames = followedUsers
            .filter((doc) => doc.exists())
            .map((doc) => doc.data().username)
            .filter(Boolean);

          setFollowingUsernames(followedUsernames);
        } else {
          setFollowingUsernames([]);
        }
      }
    });

    return () => unsub();
  }, [user]);

  // Infinite scroll: load more posts as user scrolls near end
  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current || loading) return;
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200 && lastVisible) {
        // Load next page
        setLoading(true);
        const q = query(
          collection(db, "posts"),
          orderBy("publishedAt", "desc"),
          startAfter(lastVisible),
          limit(POSTS_PAGE_SIZE)
        );
        onSnapshot(q, (snapshot) => {
          const morePosts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPosts((prev) => {
            let combined = [...prev, ...morePosts];
            // Sliding window: keep only the latest 25
            if (combined.length > 25)
              combined = combined.slice(combined.length - 25);
            sessionStorage.setItem(
              "postsWindow",
              JSON.stringify({
                posts: combined,
                lastVisible: snapshot.docs[snapshot.docs.length - 1],
              })
            );
            return combined;
          });
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setLoading(false);
        });
      }
    };
    const feed = feedRef.current;
    if (feed) feed.addEventListener("scroll", handleScroll);
    return () => feed && feed.removeEventListener("scroll", handleScroll);
  }, [lastVisible, loading]);

  // Clear sessionStorage on browser close
  useEffect(() => {
    const clearCache = () => sessionStorage.removeItem("postsWindow");
    window.addEventListener("beforeunload", clearCache);
    return () => window.removeEventListener("beforeunload", clearCache);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const currentUser = auth.currentUser;
      setUser(currentUser);
      let userLikedPosts = [];
      let userFollowingList = [];

      if (currentUser) {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData);
          userLikedPosts = userData.likedPosts || [];
          setLikedPosts(userLikedPosts);

          // Get followingId from user document
          userFollowingList = userData.followingId || [];

          // Get usernames of followed users
          if (userFollowingList.length > 0) {
            const followedUsers = await Promise.all(
              userFollowingList.map((uid) => getDoc(doc(db, "users", uid)))
            );

            const followedUsernames = followedUsers
              .filter((doc) => doc.exists())
              .map((doc) => doc.data().username)
              .filter(Boolean);

            setFollowingUsernames(followedUsernames);
          }
        } else {
          setUserProfile(null);
        }
      }
      // Fetch posts
      const postsSnapshot = await getDocs(collection(db, "posts"));
      const postsList = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Fetch all authors' names in one go
      const usernames = Array.from(
        new Set(postsList.map((post) => post.username).filter(Boolean))
      );
      const authorNameMap = {};
      const authorPhotoMap = {};
      if (usernames.length > 0) {
        // Query all users with usernames in the posts
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersSnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.username && usernames.includes(data.username)) {
            authorNameMap[data.username] =
              (data.firstName || "") +
              (data.lastName ? " " + data.lastName : "");
            authorPhotoMap[data.username] = data.photoURL || null;
          }
        });
      }
      setAuthorNames(authorNameMap);

      const sortedPosts = postsList
        .map((post) => ({
          ...post,
          authorPhotoURL: authorPhotoMap[post.username] || null,
        }))
        .sort(
          (a, b) =>
            (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0)
        );

      setPosts(sortedPosts);

      // Filter posts for following feed
      const followingPostsList = sortedPosts.filter((post) =>
        followingUsernames?.includes(post.username)
      );
      setFollowingPosts(followingPostsList);

      setLoading(false);
    };
    fetchData();
  }, []);

  // Update followingPosts when posts or followingUsernames change
  useEffect(() => {
    if (
      posts.length > 0 &&
      followingUsernames &&
      followingUsernames.length > 0
    ) {
      const filtered = posts.filter((post) =>
        followingUsernames.includes(post.username)
      );
      setFollowingPosts(filtered);
    } else {
      setFollowingPosts([]);
    }
  }, [posts, followingUsernames]);

  const handleTabClick = (tab) => setActiveTab(tab);

  // Like/unlike logic
  const handleLike = async (postId, isLiked) => {
    if (!user) return;
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, likes: (post.likes || 0) + (isLiked ? -1 : 1) }
          : post
      )
    );
    setFollowingPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? { ...post, likes: (post.likes || 0) + (isLiked ? -1 : 1) }
          : post
      )
    );
    setLikedPosts((prev) =>
      isLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    try {
      const postRef = doc(db, "posts", postId);
      const userRef = doc(db, "users", user.uid);
      await Promise.all([
        updateDoc(postRef, { likes: increment(isLiked ? -1 : 1) }),
        updateDoc(userRef, {
          likedPosts: isLiked ? arrayRemove(postId) : arrayUnion(postId),
        }),
      ]);
    } catch (err) {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes: (post.likes || 0) + (isLiked ? 1 : -1) }
            : post
        )
      );
      setFollowingPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes: (post.likes || 0) + (isLiked ? 1 : -1) }
            : post
        )
      );
      setLikedPosts((prev) =>
        isLiked ? [...prev, postId] : prev.filter((id) => id !== postId)
      );
      alert("Failed to update like. Please try again later.");
    }
  };

  // Helper for pretty date
  const prettyDate = (publishedAt) => {
    if (!publishedAt) return "";
    let dateObj;
    if (publishedAt.seconds) {
      dateObj = new Date(publishedAt.seconds * 1000);
    } else if (
      typeof publishedAt === "string" ||
      typeof publishedAt === "number"
    ) {
      dateObj = new Date(publishedAt);
    } else {
      return "";
    }
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper to format like counts (e.g., 1.2K, 3.4M)
  const formatLikesCount = (num) => {
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num;
  };

  const handleMenuToggle = (postId) => {
    setMenuOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleRemovePost = async (postId) => {
    if (!window.confirm("Are you sure you want to remove this post?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "posts", postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setFollowingPosts((prev) => prev.filter((p) => p.id !== postId));
      setMenuOpen((prev) => {
        const copy = { ...prev };
        delete copy[postId];
        return copy;
      });
      // Remove from session storage
      const cached = sessionStorage.getItem("postsWindow");
      if (cached) {
        const { posts, lastVisible } = JSON.parse(cached);
        const updatedPosts = posts.filter((p) => p.id !== postId);
        sessionStorage.setItem(
          "postsWindow",
          JSON.stringify({ posts: updatedPosts, lastVisible })
        );
      }
      setLoading(false);
      alert("Post removed successfully");
    } catch (err) {
      setLoading(false);
      alert("Failed to remove post. Please try again.");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Sidebar
        userProfile={userProfile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {/* Main Content */}
      <main
        className={styles.mainContent}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
            </div>
          )}
          <div className={styles.headerRow}>
            <div className={styles.searchContainer}>
              <div className={styles.searchIcon}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 21L16.65 16.65"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <input
                type="text"
                className={styles.searchBar}
                placeholder="Search for a writer or post..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Hamburger for mobile */}
            <div
              className={
                styles.hamburger +
                (sidebarOpen ? " " + styles.hamburgerActive : "")
              }
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div className={styles.tabs}>
            <button
              className={
                styles.tab +
                (activeTab === "following" ? " " + styles.tabActive : "")
              }
              onClick={() => handleTabClick("following")}
            >
              #following
            </button>
            <button
              className={
                styles.tab +
                (activeTab === "for-you" ? " " + styles.tabActive : "")
              }
              onClick={() => handleTabClick("for-you")}
            >
              #foryou
            </button>
          </div>
          {/* Feeds */}
          {/* Only the feed area scrolls for infinite scroll */}
          <div
            className={styles.feed}
            ref={feedRef}
            style={{
              display: "flex",
              flex: 1,
              overflowY: "auto",
              paddingBottom: 0,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{ width: "100%" }}
              >
                {filteredPosts.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#888",
                      marginTop: 40,
                      width: "100%",
                    }}
                  >
                    {activeTab === "following" &&
                    followingUsernames.length === 0
                      ? "You haven't followed anyone yet. Follow users to see their posts here."
                      : "No posts found."}
                  </div>
                ) : (
                  filteredPosts.map((post) => {
                    const isLiked = likedPosts.includes(post.id);
                    const authorFullName =
                      authorNames[post.username] || post.username || "Unknown";
                    let imageStyle = {
                      width: "100%",
                      display: "block",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "10px",
                    };
                    const hasImage = Boolean(post.photoURL);
                    const isOwnPost =
                      userProfile && post.username === userProfile.username;
                    const isExpanded = expandedPosts[post.id];
                    return (
                      <div
                        key={post.id}
                        className={styles.post}
                        style={{ position: "relative" }}
                      >
                        {/* Three dots menu for own posts */}
                        {isOwnPost && (
                          <div
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              zIndex: 2,
                            }}
                          >
                            <button
                              className={styles.dotsButton}
                              onClick={() => handleMenuToggle(post.id)}
                              aria-label="Post options"
                            >
                              ⋮
                            </button>
                            {menuOpen[post.id] && (
                              <div className={styles.postMenuDropdown}>
                                <button
                                  onClick={() => alert("Edit coming soon!")}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemovePost(post.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Article-style title on top */}
                        <div className={styles.articleTitle}>{post.title}</div>
                        {/* Image (if present) */}
                        {hasImage && (
                          <div className={styles.imageWrapper}>
                            <img
                              className={styles.postImage}
                              src={post.photoURL}
                              alt="Post"
                              style={imageStyle}
                              loading="lazy"
                              decoding="async"
                              width={600}
                              height={340}
                              srcSet={
                                post.photoURL
                                  ? `${
                                      post.photoURL
                                    } 1x, ${post.photoURL.replace(
                                      "/upload/",
                                      "/upload/w_1200/"
                                    )} 2x`
                                  : undefined
                              }
                            />
                          </div>
                        )}
                        {/* Article-style text content with collapse/expand */}
                        {post.text && (
                          <>
                            <div
                              className={
                                styles.articleText +
                                (!isExpanded ? " " + styles.collapsedText : "")
                              }
                              dangerouslySetInnerHTML={{ __html: post.text }}
                              style={
                                !isExpanded
                                  ? {
                                      maxHeight: "5.8em", // ~4 lines at 1.45em line-height
                                      overflow: "hidden",
                                      position: "relative",
                                      WebkitLineClamp: 4,
                                      display: "-webkit-box",
                                      WebkitBoxOrient: "vertical",
                                    }
                                  : {}
                              }
                            />
                            {/* Show more/less button if text is long */}
                            <ShowMoreButton
                              postId={post.id}
                              postText={post.text}
                              isExpanded={isExpanded}
                              setExpandedPosts={setExpandedPosts}
                            />
                          </>
                        )}
                        {/* Author/date/like row for all posts */}
                        <div
                          className={
                            styles.postFooterIG + " " + styles.textOnlyFooter
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <img
                              src={post.authorPhotoURL || PERSON_ICON}
                              alt={authorFullName}
                              className={styles.authorAvatar}
                              width={32}
                              height={32}
                              loading="lazy"
                              decoding="async"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                if (
                                  userProfile &&
                                  post.username === userProfile.username
                                ) {
                                  navigate("/account");
                                } else {
                                  navigate(`/user/${post.username}`);
                                }
                              }}
                            />
                            <span
                              className={styles.authorNameIG}
                              onClick={() => {
                                if (
                                  userProfile &&
                                  post.username === userProfile.username
                                ) {
                                  navigate("/account");
                                } else {
                                  navigate(`/user/${post.username}`);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {authorFullName}
                            </span>
                            <span className={styles.postDateIG}>
                              {prettyDate(post.publishedAt)}
                            </span>
                          </div>
                          <span
                            className={styles.likesRow}
                            style={{ marginLeft: "auto" }}
                          >
                            <button
                              className={
                                styles.likeButton +
                                (isLiked ? " " + styles.liked : "")
                              }
                              onClick={() => handleLike(post.id, isLiked)}
                              aria-label={isLiked ? "Unlike" : "Like"}
                            >
                              {isLiked ? "❤️" : "🤍"}
                            </button>
                            <span className={styles.likeCount}>
                              {formatLikesCount(post.likes || 0)}
                              <span className={styles.likeWord}>
                                {" "}
                                {post.likes === 1 ? "like" : "likes"}
                              </span>
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className={styles.feedSpacer} />
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Floating Action Button (Pencil) */}
          <button
            className={styles.fab}
            title="New thought"
            onClick={() => navigate("/create")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 3C17.2626 2.73735 17.5744 2.52901 17.9176 2.38687C18.2608 2.24473 18.6286 2.17157 19 2.17157C19.3714 2.17157 19.7392 2.24473 20.0824 2.38687C20.4256 2.52901 20.7374 2.73735 21 3C21.2626 3.26264 21.471 3.57444 21.6131 3.9176C21.7553 4.26077 21.8284 4.62856 21.8284 5C21.8284 5.37143 21.7553 5.73923 21.6131 6.08239C21.471 6.42555 21.2626 6.73735 21 7L7.5 20.5L2 22L3.5 16.5L17 3Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </motion.div>
      </main>
    </div>
  );
};

// Helper component for Show More/Less button
function ShowMoreButton({ postId, postText, isExpanded, setExpandedPosts }) {
  const [isLong, setIsLong] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      setIsLong(ref.current.scrollHeight > ref.current.clientHeight + 2);
    }
  }, [postText]);
  // Render hidden div to measure height
  return (
    <>
      <div
        ref={ref}
        style={{
          position: "absolute",
          visibility: "hidden",
          height: "auto",
          maxHeight: "none",
          overflow: "visible",
          whiteSpace: "normal",
          pointerEvents: "none",
          zIndex: -1,
          width: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: postText }}
      />
      {isLong && (
        <button
          className={styles.showMoreBtn}
          onClick={() =>
            setExpandedPosts((prev) => ({ ...prev, [postId]: !isExpanded }))
          }
          style={{
            marginTop: 4,
            color: "#344955",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

export default DashboardPage;
