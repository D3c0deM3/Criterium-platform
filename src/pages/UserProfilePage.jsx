import React, { useEffect, useState } from "react";
import styles from "../styles/AccountPage.module.css";
import Sidebar from "./Sidebar";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import dashboardStyles from "../styles/DashboardPage.module.css";
import ExpandablePostText from "../components/ExpandablePostText";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

// Utility to format like numbers (e.g. 1.1K, 1M)
function formatLikesCount(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return num;
}

const UserProfilePage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [likedPosts, setLikedPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState({});
  const { username } = useParams();

  // Real-time listener for current user's profile (for sidebar and like logic)
  useEffect(() => {
    let unsubscribe = null;
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserProfile({
            ...docSnap.data(),
            uid: docSnap.id,
          });
          setLikedPosts(docSnap.data().likedPosts || []);
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Real-time listener for viewed user's profile and posts
  useEffect(() => {
    let unsubUserProfile = null;
    let unsubUserPosts = null;
    setLoading(true);
    const fetchProfileAndPosts = async () => {
      // Fetch user by username
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userDocRef = doc(db, "users", userDoc.id);
        // Real-time listener for the viewed user
        unsubUserProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              ...data,
              uid: docSnap.id,
            });
            setFollowers(data.followersId || []);
          }
        });
        // Real-time listener for posts by this user
        const postsQuery = query(
          collection(db, "posts"),
          where("username", "==", username)
        );
        unsubUserPosts = onSnapshot(postsQuery, (snapshot) => {
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
    };
    fetchProfileAndPosts();
    return () => {
      if (unsubUserProfile) unsubUserProfile();
      if (unsubUserPosts) unsubUserPosts();
    };
  }, [username]);

  // Check if current user is following the viewed user
  useEffect(() => {
    if (currentUserProfile?.followingId && userProfile?.uid) {
      const isUserFollowed = currentUserProfile.followingId.includes(
        userProfile.uid
      );
      setIsFollowing(isUserFollowed);
    }
  }, [currentUserProfile, userProfile]);

  const handleFollow = async () => {
    if (!userProfile?.uid || !currentUserProfile?.uid || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setIsFollowing(true);

    try {
      // Update the viewed user's followers
      await updateDoc(doc(db, "users", userProfile.uid), {
        followersId: arrayUnion(currentUserProfile.uid),
      });

      // Update current user's following
      await updateDoc(doc(db, "users", currentUserProfile.uid), {
        followingId: arrayUnion(userProfile.uid),
      });
    } catch (err) {
      console.error("Error during follow operation:", err);
      setIsFollowing(false);
      alert("Failed to follow. Please try again.");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleUnfollow = async () => {
    if (!userProfile?.uid || !currentUserProfile?.uid || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setIsFollowing(false);

    try {
      // Update the viewed user's followers
      await updateDoc(doc(db, "users", userProfile.uid), {
        followersId: arrayRemove(currentUserProfile.uid),
      });

      // Update current user's following
      await updateDoc(doc(db, "users", currentUserProfile.uid), {
        followingId: arrayRemove(userProfile.uid),
      });
    } catch (err) {
      console.error("Error during unfollow operation:", err);
      setIsFollowing(true);
      alert("Failed to unfollow. Please try again.");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Like/unlike logic (same as AccountPage)
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

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          userProfile={currentUserProfile}
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

  if (!userProfile) return <div>User not found.</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        userProfile={currentUserProfile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className={styles.mainContent}>
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
                <span className={styles.statNumber}>
                  {userProfile && userProfile.likedPosts
                    ? userProfile.likedPosts.length
                    : 0}
                </span>
                <span className={styles.statLabel}>Favourite Posts</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {!isFollowing ? (
                <button
                  className={styles.followBtn}
                  onClick={handleFollow}
                  disabled={isTransitioning}
                >
                  Follow
                </button>
              ) : (
                <button
                  className={styles.followingBtn}
                  onClick={handleUnfollow}
                  disabled={isTransitioning}
                >
                  Following
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.postsSection}>
          <h3 className={styles.sectionTitle}>Posts</h3>
          {userPosts.length === 0 ? (
            <div className={styles.emptyState}>No posts yet.</div>
          ) : (
            <div className={styles.postsGrid}>
              {userPosts.map((post) => {
                const isLiked = likedPosts.includes(post.id);
                return (
                  <div key={post.id} className={styles.postCard}>
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
                      <span className={styles.dateMeta}>
                        {post.publishedAt?.seconds
                          ? new Date(
                              post.publishedAt.seconds * 1000
                            ).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    {post.photoURL && (
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
                        />
                      </div>
                    )}
                    <div className={styles.postContent}>
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
                    <div
                      className={styles.postMetaRow}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <span style={{ opacity: 0.6, fontSize: "0.98em" }}>
                        {post.username}
                      </span>
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
                        {isLiked ? "❤️" : "🤍"}{" "}
                        {formatLikesCount(post.likes || 0)}
                      </button>
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

export default UserProfilePage;
