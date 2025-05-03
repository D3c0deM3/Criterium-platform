import React, { useEffect, useState } from "react";
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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const AccountPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        navigate("/register");
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
        setLikedPosts(userDoc.data().likedPosts || []);
        // Fetch posts by this user
        const postsQuery = query(
          collection(db, "posts"),
          where("username", "==", userDoc.data().username)
        );
        const postsSnapshot = await getDocs(postsQuery);
        setUserPosts(
          postsSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a, b) =>
                (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0)
            )
        );
      }
      setLoading(false);
    };
    fetchProfileAndPosts();
  }, [navigate]);

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
    setMenuOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
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
                <span className={styles.statNumber}>0</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNumber}>
                  {userProfile.likedPosts ? userProfile.likedPosts.length : 0}
                </span>
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
                return (
                  <div key={post.id} className={styles.postCard}>
                    {/* Three dots menu for post options */}
                    <div className={styles.postOptionsMenu}>
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
                    {post.photoURL && (
                      <img
                        src={post.photoURL}
                        alt={post.title}
                        className={styles.postImage}
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
                    )}
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
                      style={{ cursor: "pointer", marginBottom: 4 }}
                    >
                      {post.username}
                    </span>
                    <div className={styles.postTitle}>{post.title}</div>
                    <div
                      className={styles.postContent}
                      dangerouslySetInnerHTML={{
                        __html:
                          post.text?.slice(0, 120) +
                          (post.text?.length > 120 ? "..." : ""),
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
