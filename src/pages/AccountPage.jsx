import React, { useEffect, useState, useRef } from "react";
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
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import dashboardStyles from "../styles/DashboardPage.module.css";
import ExpandablePostText from "../components/ExpandablePostText";
import PostEditor, { Modal } from "../components/PostEditor.jsx";
import profileStyles from "../styles/ProfilePage.module.css";
import { containsBannedWords } from "../utils/contentFilter";
import { isImageSafe } from "../utils/imageContentChecker";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../constants";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const PencilIcon = (props) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#344955"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
  </svg>
);

async function deleteImageFromCloudinary(imageUrl) {
  if (!imageUrl) return;
  try {
    const matches = imageUrl.match(/\/([^/]+)\.(jpg|jpeg|png|gif|webp)$/i);
    if (!matches) return;
    const publicId = encodeURIComponent(matches[1]);
    await fetch(
      `https://content-moderation-server.onrender.com/delete-image/${publicId}`,
      { method: "DELETE" }
    );
  } catch (err) {}
}

async function deleteProfilePicFromCloudinary(imageUrl) {
  if (!imageUrl) return;
  try {
    const matches = imageUrl.match(/\/([^/]+)\.(jpg|jpeg|png|gif|webp)$/i);
    if (!matches) return;
    const publicId = encodeURIComponent(matches[1]);
    await fetch(
      `https://content-moderation-server.onrender.com/delete-image/${publicId}`,
      { method: "DELETE" }
    );
  } catch (err) {}
}

function EditProfileModal({ open, onClose, userProfile, onSave }) {
  const [profilePic, setProfilePic] = useState(
    userProfile.photoURL || "https://via.placeholder.com/100"
  );
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [username, setUsername] = useState(userProfile.username || "");
  const [firstName, setFirstName] = useState(userProfile.firstName || "");
  const [lastName, setLastName] = useState(userProfile.lastName || "");
  const [bio, setBio] = useState(userProfile.bio || "");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [alertInfo, setAlertInfo] = useState(null);
  const profilePicInputRef = useRef();

  const handleProfilePicClick = () => {
    profilePicInputRef.current.click();
  };
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(null); // Reset first
      // Check image safety before preview/upload
      setLoading(true);
      const safe = await isImageSafe(file);
      setLoading(false);
      if (!safe) {
        setAlertInfo({
          word: null,
          message:
            "The selected image contains explicit, violent, or NSFW content and cannot be uploaded. Please choose another image.",
        });
        return;
      }
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePic(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUsernameError("");
    // Content filtering for all fields
    if (
      containsBannedWords(username) ||
      containsBannedWords(firstName) ||
      containsBannedWords(lastName) ||
      containsBannedWords(bio)
    ) {
      setLoading(false);
      setAlertInfo({
        word: null,
        message:
          "Your profile contains inappropriate or banned words. Please revise and try again.",
      });
      return;
    }
    // Perspective API moderation check (after banned words check)
    try {
      const moderationRes = await fetch(
        "https://content-moderation-server.onrender.com/moderate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: username + "\n" + firstName + "\n" + lastName + "\n" + bio,
          }),
        }
      );
      const moderationData = await moderationRes.json();
      if (moderationData.flagged) {
        setUsernameError("");
        setAlertInfo({
          word: null,
          message:
            "Your profile contains content that is considered toxic or inappropriate by our moderation system. Please revise and try again.",
        });
        setLoading(false);
        return;
      }
    } catch (err) {
      setUsernameError("");
      setAlertInfo({
        word: null,
        message:
          "Content moderation service is unavailable. Please try again later.",
      });
      setLoading(false);
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      alert("No user logged in. Please log in.");
      return;
    }
    const usernameValue = username.trim().startsWith("@")
      ? username.trim()
      : `@${username.trim()}`;
    // Only check username if changed
    if (usernameValue !== userProfile.username) {
      try {
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", usernameValue)
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          setUsernameError("Username is already taken.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setUsernameError("Error checking username.");
        setLoading(false);
        return;
      }
    }
    // Upload image if present
    let photoURL = profilePic;
    let oldPhotoURL = userProfile.photoURL;
    if (profilePicFile) {
      // If replacing, delete old profile pic (not default)
      if (oldPhotoURL && !oldPhotoURL.includes("via.placeholder.com")) {
        await deleteProfilePicFromCloudinary(oldPhotoURL);
      }
      const formData = new FormData();
      formData.append("file", profilePicFile);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      try {
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
          photoURL = data.secure_url;
        } else {
          setLoading(false);
          alert("Error uploading image to Cloudinary.");
          return;
        }
      } catch (error) {
        setLoading(false);
        alert("Error uploading picture: " + error.message);
        return;
      }
    }
    // Update profile and posts in a batch
    try {
      const userDocRef = doc(db, "users", user.uid);
      const batch = writeBatch(db);

      // Update user profile
      batch.update(userDocRef, {
        username: usernameValue,
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        bio: bio.trim() || null,
        photoURL,
      });

      // If username changed, update all posts by this user
      if (usernameValue !== userProfile.username) {
        const postsQuery = query(
          collection(db, "posts"),
          where("username", "==", userProfile.username)
        );
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.docs.forEach((postDoc) => {
          batch.update(doc(db, "posts", postDoc.id), {
            username: usernameValue,
          });
        });

        // Also update all comments by this user
        const commentsQuery = query(
          collection(db, "comments"),
          where("username", "==", userProfile.username)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.docs.forEach((commentDoc) => {
          batch.update(doc(db, "comments", commentDoc.id), {
            username: usernameValue,
          });
        });
      }

      await batch.commit();
      onSave &&
        onSave({ username: usernameValue, firstName, lastName, bio, photoURL });
      setLoading(false);
      onClose();
    } catch (error) {
      setLoading(false);
      alert("Error saving profile: " + error.message);
    }
  };
  if (!open) return null;
  return (
    <div
      className={profileStyles.centerWrapper}
      style={{ zIndex: 3000, position: "fixed", top: 0, left: 0 }}
    >
      <div
        className={profileStyles.profileContainer}
        style={{ position: "relative" }}
      >
        <h2 className={profileStyles.title}>Edit Profile</h2>
        <div
          className={profileStyles.profilePic}
          onClick={handleProfilePicClick}
          style={{ margin: "0 auto 1.5rem auto" }}
        >
          <img
            className={profileStyles.profilePicImg}
            src={profilePic}
            alt="Profile"
          />
          <input
            type="file"
            accept="image/*"
            ref={profilePicInputRef}
            style={{ display: "none" }}
            onChange={handleProfilePicChange}
          />
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className={profileStyles.profileFormInput}
            type="text"
            placeholder="Username (e.g., @markbrown)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {usernameError && (
            <div className={profileStyles.errorMessage}>{usernameError}</div>
          )}
          <input
            className={profileStyles.profileFormInput}
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            className={profileStyles.profileFormInput}
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <textarea
            className={profileStyles.profileFormTextarea}
            placeholder="Tell us about yourself..."
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          {alertInfo && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  background: "#fff3cd",
                  color: "#856404",
                  border: "1px solid #ffeeba",
                  borderRadius: 8,
                  padding: "28px 32px 20px 56px",
                  minWidth: 260,
                  maxWidth: 400,
                  fontWeight: 500,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 22,
                    top: 28,
                    fontSize: 22,
                    color: "#e0a800",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e0a800"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <circle cx="12" cy="16" r="1" />
                  </svg>
                </span>
                <span
                  style={{ marginLeft: 20, marginBottom: 16, marginTop: 2 }}
                >
                  {alertInfo.message}
                </span>
                <button
                  style={{
                    alignSelf: "flex-end",
                    background: "#344955",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 28px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setAlertInfo(null)}
                  type="button"
                >
                  OK
                </button>
              </div>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#eee",
                color: "#333",
                border: "none",
                borderRadius: 6,
                padding: "10px 18px",
                cursor: "pointer",
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={profileStyles.saveBtn}
              style={{ width: "auto", minWidth: 90 }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
        {loading && (
          <div className={profileStyles.loadingOverlay}>
            <div className={profileStyles.spinner}></div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatLikesCount(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return num;
}

const AccountPage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editModalPost, setEditModalPost] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
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
    const post = userPosts.find((p) => p.id === postId);
    if (post && post.photoURL) {
      await deleteImageFromCloudinary(post.photoURL);
    }
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

  // Handle post update
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
        <div className={styles.accountHeader} style={{ position: "relative" }}>
          {/* Edit icon in top left above profile photo */}
          <button
            type="button"
            title="Edit profile"
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              background: "#f8f9fa",
              border: "none",
              borderRadius: "50%",
              padding: 6,
              cursor: "pointer",
              zIndex: 10,
              boxShadow: "0 1px 4px rgba(52,73,85,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setEditProfileOpen(true)}
            aria-label="Edit profile"
          >
            <PencilIcon />
          </button>
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
                  <React.Fragment key={post.id}>
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
                              <button
                                onClick={() => {
                                  setEditModalPost(post);
                                  setMenuOpen({});
                                }}
                              >
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
                          {isLiked ? "❤️" : "🤍"}{" "}
                          {formatLikesCount(post.likes || 0)}
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
                    {editModalPost && editModalPost.id === post.id && (
                      <Modal open={true} onClose={() => setEditModalPost(null)}>
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
              })}
            </div>
          )}
        </div>
        <EditProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          userProfile={userProfile}
          onSave={(updated) => {
            // Optionally update local state if needed
            setUserProfile((prev) => ({ ...prev, ...updated }));
          }}
        />
      </main>
    </div>
  );
};

export default AccountPage;
