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
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import PostEditor, { Modal } from "../components/PostEditor.jsx";
import ExpandablePostText from "../components/ExpandablePostText";
import { containsBannedWords } from "../utils/contentFilter";

const POSTS_PAGE_SIZE = 15;

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

// Utility to format like numbers (e.g. 1.1K, 1M)
function formatLikesCount(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return num;
}

// Author image cache (in-memory + localStorage)
const authorImageCache = (() => {
  let cache = {};
  try {
    const stored = localStorage.getItem("authorImageCache");
    if (stored) cache = JSON.parse(stored);
  } catch {}
  return cache;
})();
function setAuthorImageCache(username, photoURL) {
  if (!username) return;
  if (authorImageCache[username] !== photoURL) {
    authorImageCache[username] = photoURL;
    localStorage.setItem("authorImageCache", JSON.stringify(authorImageCache));
  }
}

// Memoized by username, not just photoURL
const AuthorAvatar = React.memo(
  function AuthorAvatar({ username, photoURL, alt, onClick }) {
    return (
      <img
        src={photoURL}
        alt={alt}
        className={styles.authorAvatar}
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
        style={{ cursor: "pointer" }}
        onClick={onClick}
      />
    );
  },
  (prev, next) =>
    prev.username === next.username && prev.photoURL === next.photoURL
);

// LikeButton component to isolate like UI and prevent post re-render
const LikeButton = React.memo(function LikeButton({
  isLiked,
  likeCount,
  onClick,
  loading,
}) {
  return (
    <span className={styles.likesRow} style={{ marginLeft: "auto" }}>
      <button
        className={styles.likeButton + (isLiked ? " " + styles.liked : "")}
        onClick={onClick}
        aria-label={isLiked ? "Unlike" : "Like"}
        disabled={loading}
      >
        {isLiked ? "❤️" : "🤍"} {formatLikesCount(likeCount)}
      </button>
      <span className={styles.likeCount}>
        <span className={styles.likeWord}>
          {" "}
          {likeCount === 1 ? "like" : "likes"}
        </span>
      </span>
    </span>
  );
});

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followingPosts, setFollowingPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("for-you");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState([]);
  const [authorNames, setAuthorNames] = useState({});
  const [followingUsernames, setFollowingUsernames] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimeout = useRef();
  const navigate = useNavigate();
  const [lastVisible, setLastVisible] = useState(null);
  const feedRef = useRef();
  const [menuOpen, setMenuOpen] = useState({});
  const [likeLoading, setLikeLoading] = useState({});
  const menuRefs = useRef({});
  const [allUsers, setAllUsers] = useState([]); // Store all users for @ search
  const [filteredUsers, setFilteredUsers] = useState([]); // Users matching @ search
  const [expandedPosts, setExpandedPosts] = useState({}); // Track expanded/collapsed state
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editModalPost, setEditModalPost] = useState(null);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      setAllUsers(usersSnapshot.docs.map((doc) => doc.data()));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().startsWith("@")) {
      const q = debouncedQuery.trim().slice(1).toLowerCase();
      if (!q) {
        setFilteredUsers([]);
        return;
      }
      setFilteredUsers(
        allUsers.filter((user) => {
          const username = user.username?.toLowerCase() || "";
          const firstName = user.firstName?.toLowerCase() || "";
          const lastName = user.lastName?.toLowerCase() || "";
          return (
            username.includes(q) ||
            firstName.includes(q) ||
            lastName.includes(q)
          );
        })
      );
    } else {
      setFilteredUsers([]);
    }
  }, [debouncedQuery, allUsers]);

  const filteredPosts = useMemo(() => {
    const sourceArray = activeTab === "for-you" ? posts : followingPosts;
    if (!debouncedQuery.trim() || debouncedQuery.trim().startsWith("@"))
      return sourceArray;
    const q = debouncedQuery.trim().toLowerCase();
    return sourceArray.filter((post) => {
      const title =
        typeof post.title === "string" ? post.title.toLowerCase() : "";
      const text = typeof post.text === "string" ? post.text.toLowerCase() : "";
      let author = "";
      if (authorNames[post.username]) {
        const a = authorNames[post.username];
        author = [a.firstName, a.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      } else if (typeof post.username === "string") {
        author = post.username.toLowerCase();
      }
      return title.includes(q) || text.includes(q) || author.includes(q);
    });
  }, [debouncedQuery, posts, followingPosts, authorNames, activeTab]);

  useEffect(() => {
    const cached = sessionStorage.getItem("postsWindow");
    if (cached) {
      const { posts, lastVisible } = JSON.parse(cached);
      setPosts(posts);
      setLastVisible(lastVisible);
    }
  }, []);

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

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        setUserProfile(userData);
        setLikedPosts(userData.likedPosts || []);
        const userFollowingList = userData.followingId || [];
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

  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current || loading) return;
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200 && lastVisible) {
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
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData);
          userLikedPosts = userData.likedPosts || [];
          setLikedPosts(userLikedPosts);
          userFollowingList = userData.followingId || [];
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
      const postsSnapshot = await getDocs(collection(db, "posts"));
      const postsList = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const usernames = Array.from(
        new Set(postsList.map((post) => post.username).filter(Boolean))
      );
      const authorNameMap = {};
      const authorPhotoMap = {};
      if (usernames.length > 0) {
        const usersSnapshot = await getDocs(collection(db, "users"));
        usersSnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.username && usernames.includes(data.username)) {
            authorNameMap[data.username] = {
              firstName: data.firstName || data.username || "Unknown",
              lastName: data.lastName || "",
            };
            authorPhotoMap[data.username] = data.photoURL || null;
            setAuthorImageCache(data.username, data.photoURL || null);
          }
        });
      }
      setAuthorNames(authorNameMap);
      const sortedPosts = postsList
        .map((post) => ({
          ...post,
          authorPhotoURL:
            authorPhotoMap[post.username] ||
            authorImageCache[post.username] ||
            null,
        }))
        .sort(
          (a, b) =>
            (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0)
        );
      setPosts(sortedPosts);
      const followingPostsList = sortedPosts.filter((post) =>
        followingUsernames?.includes(post.username)
      );
      setFollowingPosts(followingPostsList);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (posts.length > 0 && followingUsernames.length > 0) {
      const filtered = posts.filter((post) =>
        followingUsernames.includes(post.username)
      );
      setFollowingPosts(filtered);
    } else {
      setFollowingPosts([]);
    }
  }, [posts, followingUsernames]);

  const handleTabClick = (tab) => setActiveTab(tab);

  const handleLike = async (postId, isLiked) => {
    if (!user || likeLoading[postId]) return;
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
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
      const batch = writeBatch(db);
      batch.update(postRef, { likes: increment(isLiked ? -1 : 1) });
      batch.update(userRef, {
        likedPosts: isLiked ? arrayRemove(postId) : arrayUnion(postId),
      });
      await batch.commit();
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
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleEditSave = async (postId, updated) => {
    setSubmittingEdit(true);
    try {
      const plainText =
        updated.title + "\n" + updated.text.replace(/<[^>]+>/g, "");
      // Check both title and content for banned words
      if (
        containsBannedWords(updated.title) ||
        containsBannedWords(updated.text.replace(/<[^>]+>/g, ""))
      ) {
        alert(
          "Your post contains inappropriate or banned words. Please revise and try again."
        );
        setSubmittingEdit(false);
        return;
      }
      // Moderation check (stricter)
      const moderationRes = await fetch(
        "https://content-moderation-server.onrender.com/moderate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: plainText,
          }),
        }
      );
      const moderationData = await moderationRes.json();
      if (moderationData.flagged) {
        alert(
          "Your post contains content that is not allowed (politically sensitive or inappropriate). Please revise and try again."
        );
        setSubmittingEdit(false);
        return;
      }
      await updateDoc(doc(db, "posts", postId), {
        title: updated.title,
        text: updated.text,
        photoURL: updated.photoURL || null,
      });
      setEditModalPost(null);
    } catch (err) {
      alert("Failed to update post. Please try again.");
    } finally {
      setSubmittingEdit(false);
    }
  };

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
      const cached = sessionStorage.getItem("postsWindow");
      if (cached) {
        const { posts, lastVisible } = JSON.parse(cached);
        const updatedPosts = posts.filter((p) => p.id !== postId);
        sessionStorage.setItem(
          "postsWindow",
          JSON.stringify({
            posts: updatedPosts,
            lastVisible,
          })
        );
      }
      setLoading(false);
      alert("Post removed successfully");
    } catch (err) {
      console.error("Error removing post:", err);
      setLoading(false);
      alert("Failed to remove post. Please try again.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const openMenuId = Object.keys(menuOpen).find((id) => menuOpen[id]);
      if (!openMenuId) return;
      const ref = menuRefs.current[openMenuId];
      if (ref && !ref.contains(event.target)) {
        setMenuOpen({});
      }
    };
    if (Object.values(menuOpen).some(Boolean)) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        userProfile={userProfile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
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
            {debouncedQuery.trim().startsWith("@") &&
            filteredUsers.length > 0 ? (
              <div style={{ width: "100%" }}>
                <div style={{ padding: 16, color: "#555" }}>Accounts</div>
                {filteredUsers.map((user) => (
                  <div
                    key={user.username}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/user/${user.username}`)}
                  >
                    <img
                      src={user.photoURL || PERSON_ICON}
                      alt={user.username}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                        background: "#ccc",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ color: "#888" }}>{user.username}</div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#888",
                      marginTop: 40,
                    }}
                  >
                    No accounts found.
                  </div>
                )}
              </div>
            ) : (
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
                      const authorFirstName =
                        authorNames[post.username]?.firstName ||
                        post.username ||
                        "Unknown";
                      const authorLastName =
                        authorNames[post.username]?.lastName || "";
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
                      return (
                        <React.Fragment key={post.id}>
                          <div
                            key={post.id}
                            className={styles.post}
                            style={{ position: "relative" }}
                          >
                            {isOwnPost && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  zIndex: 2,
                                }}
                                ref={(el) => (menuRefs.current[post.id] = el)}
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
                                      onClick={() => {
                                        setEditModalPost(post);
                                        setMenuOpen({});
                                      }}
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
                            <div className={styles.articleTitle}>
                              {post.title}
                            </div>
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
                            {post.text && (
                              <div style={{ position: "relative" }}>
                                <ExpandablePostText
                                  html={post.text}
                                  expanded={!!expandedPosts[post.id]}
                                  onToggle={() =>
                                    setExpandedPosts((prev) => ({
                                      ...prev,
                                      [post.id]: !prev[post.id],
                                    }))
                                  }
                                />
                              </div>
                            )}
                            <div
                              className={
                                styles.postFooterIG +
                                " " +
                                styles.textOnlyFooter
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <AuthorAvatar
                                  username={post.username}
                                  photoURL={
                                    authorImageCache[post.username] ||
                                    post.authorPhotoURL ||
                                    PERSON_ICON
                                  }
                                  alt={authorFirstName}
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
                                <div
                                  className={styles.authorNameIG}
                                  style={{
                                    display: "inline",
                                    cursor: "pointer",
                                  }}
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
                                >
                                  <span className={styles.authorFirstName}>
                                    {authorFirstName}
                                  </span>
                                  <span className={styles.authorLastName}>
                                    {authorLastName ? ` ${authorLastName}` : ""}
                                  </span>
                                </div>
                                <span className={styles.postDateIG}>
                                  {prettyDate(post.publishedAt)}
                                </span>
                              </div>
                              <LikeButton
                                isLiked={isLiked}
                                likeCount={post.likes || 0}
                                loading={likeLoading[post.id]}
                                onClick={() => handleLike(post.id, isLiked)}
                              />
                            </div>
                          </div>
                          {editModalPost && editModalPost.id === post.id && (
                            <Modal
                              open={true}
                              onClose={() => setEditModalPost(null)}
                            >
                              <PostEditor
                                initialTitle={editModalPost.title}
                                initialContent={editModalPost.text}
                                initialImage={editModalPost.photoURL}
                                submitting={submittingEdit}
                                onSave={(updated) =>
                                  handleEditSave(editModalPost.id, updated)
                                }
                                onCancel={() => setEditModalPost(null)}
                              />
                            </Modal>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  <div className={styles.feedSpacer} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
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

export default DashboardPage;
