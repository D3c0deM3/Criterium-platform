import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/AccountPage.module.css";
import Sidebar from "./Sidebar";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import dashboardStyles from "../styles/DashboardPage.module.css";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const AccountPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState({});
  const navigate = useNavigate();
  const menuRefs = useRef({});

  useEffect(() => {
    let unsubUser = null;
    let unsubPosts = null;
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      navigate("/register");
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setLikedPosts(data.likedPosts || []);
        setFollowers(data.followersId || []);
        // Listen to posts by this user
        const postsQuery = query(
          collection(db, "posts"),
          where("username", "==", data.username)
        );
        if (unsubPosts) unsubPosts();
        unsubPosts = onSnapshot(postsQuery, (snapshot) => {
          setUserPosts(
            snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort(
                (a, b) =>
                  (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0)
              )
          );
        });
      }
      setLoading(false);
    });
    return () => {
      if (unsubUser) unsubUser();
      if (unsubPosts) unsubPosts();
    };
  }, [navigate]);

  // Close menu on outside click
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

  // Like/unlike logic for account page
  const handleLike = async (postId, isLiked) => {
    const user = auth.currentUser;
    if (!user) return;
    setUserPosts((prevPosts) =>
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
      setUserPosts((prevPosts) =>
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

  // Toggle post menu
  const handleMenuToggle = (postId) => {
    setMenuOpen((prev) => {
      const isOpen = prev[postId];
      // Only one menu open at a time
      return isOpen ? {} : { [postId]: true };
    });
  };

  // Handle post removal
  const handleRemovePost = async (postId) => {
    if (!window.confirm("Are you sure you want to remove this post?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "posts", postId));
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
      setLoading(false);
      alert("Post removed successfully");
    } catch (err) {
      console.error("Error removing post:", err);
      setLoading(false);
      alert("Failed to remove post. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          userProfile={userProfile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className={styles.mainContent}>
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        </main>
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        userProfile={userProfile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className={styles.mainContent}>
        {/* Header Row with Hamburger for mobile */}
        <div className={styles.headerRow}>
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
        <div className={styles.accountHeader}>
          <div className={styles.profilePicWrapper}>
            <img
              src={userProfile.photoURL || PERSON_ICON}
              alt={userProfile.firstName || userProfile.username}
              className={styles.profilePic}
            />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.nameRow}>
              <span className={styles.fullName}>
                {userProfile.firstName} {userProfile.lastName}
              </span>
              <span className={styles.username}>{userProfile.username}</span>
            </div>
            {userProfile.bio && (
              <div className={styles.bio}>{userProfile.bio}</div>
            )}
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statNumber}>{userPosts.length}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNumber}>{followers.length}</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNumber}>{likedPosts.length}</span>
                <span className={styles.statLabel}>Favourite Posts</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.postsSection}>
          <h3 className={styles.sectionTitle}>Your Posts</h3>
          {userPosts.length === 0 ? (
            <div className={styles.emptyState}>You haven't posted yet.</div>
          ) : (
            <div className={styles.postsGrid}>
              {userPosts.map((post) => {
                const isLiked = likedPosts.includes(post.id);
                const hasImage = Boolean(post.photoURL);
                return (
                  <div key={post.id} className={styles.postCard}>
                    {/* Row with title and 3-dot menu */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        minHeight: 32,
                      }}
                    >
                      <div className={styles.postTitle} style={{ margin: 0 }}>
                        {post.title}
                      </div>
                      <div
                        className={styles.postOptionsMenu}
                        ref={(el) => (menuRefs.current[post.id] = el)}
                        style={{ position: "relative", top: 0, right: 0 }}
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
                            <button onClick={() => alert("Edit coming soon!")}>
                              Edit
                            </button>
                            <button onClick={() => handleRemovePost(post.id)}>
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {hasImage && (
                      <div className={dashboardStyles.imageWrapper}>
                        <img
                          className={dashboardStyles.postImage}
                          src={post.photoURL}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          width={600}
                          height={340}
                          srcSet={
                            post.photoURL
                              ? `${post.photoURL} 1x, ${post.photoURL.replace(
                                  "/upload/",
                                  "/upload/w_1200/"
                                )} 2x`
                              : undefined
                          }
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
                      </div>
                    )}
                    <div
                      className={styles.postContent}
                      dangerouslySetInnerHTML={{
                        __html: post.text,
                      }}
                    />
                    <div className={styles.postMetaRow}>
                      <button
                        className={
                          styles.likeButton +
                          (isLiked ? " " + styles.liked : "")
                        }
                        onClick={() => handleLike(post.id, isLiked)}
                        aria-label={isLiked ? "Unlike" : "Like"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {isLiked ? "❤️" : "🤍"} {post.likes || 0}
                      </button>
                      <span className={styles.dateMeta}>
                        {post.publishedAt?.seconds
                          ? new Date(
                              post.publishedAt.seconds * 1000
                            ).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AccountPage;
