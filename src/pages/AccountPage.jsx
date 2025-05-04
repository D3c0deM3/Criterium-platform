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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import dashboardStyles from "../styles/DashboardPage.module.css";
import ExpandablePostText from "../components/ExpandablePostText";
import PostEditor, { Modal } from "../components/PostEditor.jsx";
import profileStyles from "../styles/ProfilePage.module.css";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const CLOUDINARY_CLOUD_NAME = "dn6uypx98";
const CLOUDINARY_UPLOAD_PRESET = "profile_pics";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
  const profilePicInputRef = useRef();

  const handleProfilePicClick = () => {
    profilePicInputRef.current.click();
  };
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
      alert(
        "Your profile contains inappropriate or banned words. Please revise and try again."
      );
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
    if (profilePicFile) {
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
    // Save profile
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        username: usernameValue,
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        bio: bio.trim() || null,
        photoURL,
      });
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

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[1!|il]/g, "i")
    .replace(/[@]/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[0]/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/\*/g, "")
    .replace(/\./g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "");
}

function containsBannedWords(text) {
  const banned = [
    /\bsex\b/i,
    /\bfuck\b/i,
    /\bnigg[ae]r\b/i,
    /\bass\b/i,
    /\bshit\b/i,
    /\bcum\b/i,
    /\blox\b/i,
    /\bshoxi\b/i,
    /\bdalbayob\b/i,
    /\bchumo\b/i,
    /\bseks\b/i,
    /\bskay\b/i,
    /\bnegr\b/i,
    /\bnegas\b/i,
    /\bneggas\b/i,
    /\bnigga\b/i,
    /\bbla\b/i,
    /\bblat\b/i,
    /\bblin\b/i,
    /\bporn\b/i,
    /\bdick\b/i,
    /\bpussy\b/i,
    /\bcock\b/i,
    /\bslut\b/i,
    /\bwhore\b/i,
    /\bfag\b/i,
    /\bretard\b/i,
    /\bcunt\b/i,
    /\bpenis\b/i,
    /\bvagina\b/i,
    /\btits?\b/i,
    /\bboobs?\b/i,
    /\banal\b/i,
    /\brape\b/i,
    /\bincest\b/i,
    /\bmolest\b/i,
    /\bkill\b/i,
    /\bmurder\b/i,
    /\bsuicide\b/i,
    /\bterrorist?\b/i,
    /\bisis\b/i,
    /\bjihad\b/i,
    /\bblowjob\b/i,
    /\bhandjob\b/i,
    /\borgy\b/i,
    /\bgangbang\b/i,
    /\bpaedophile\b/i,
    /\bpedophile\b/i,
    /\bchild\s*abuse\b/i,
    /\bzoophilia\b/i,
    /\bbeastiality\b/i,
    /\bnecrophilia\b/i,
    /\bbestiality\b/i,
    /\bqueer\b/i,
    /\bslur\b/i,
    /\blynch\b/i,
    /\bgenocide\b/i,
    /\bholocaust\b/i,
    /\bshoot\b/i,
    /\bstab\b/i,
    /\bgun\b/i,
    /\bweapon\b/i,
    /\bexplosive\b/i,
    /\bbomb\b/i,
    /\bexecute\b/i,
    /\bhang\b/i,
    /\bpoison\b/i,
    /\bselfharm\b/i,
    /\bcutting\b/i,
    /\bselfmutilation\b/i,
    /\baddict\b/i,
    /\bdrugs?\b/i,
    /\bheroin\b/i,
    /\bcocaine\b/i,
    /\bcrack\b/i,
    /\bmeth\b/i,
    /\bweed\b/i,
    /\bmarijuana\b/i,
    /\bopium\b/i,
    /\bhash\b/i,
    /\bthc\b/i,
    /\bmdma\b/i,
    /\becstasy\b/i,
    /\bshrooms?\b/i,
    /\bpsychedelic\b/i,
    /\btrippy\b/i,
    /\bped0\b/i,
    /\bpedo\b/i,
    /\bpaedo\b/i,
    /\bpaed0\b/i,
    /\bmolester\b/i,
    /\bchildporn\b/i,
    /\bcp\b/i,
    /\bzoophile\b/i,
    /\bbeastial\b/i,
    /\bnecrophile\b/i,
    /\binc3st\b/i,
    /\binc3st\b/i,
    /\bterror\b/i,
    /\bextremist\b/i,
    /\bwhitepower\b/i,
    /\bkkk\b/i,
    /\bklan\b/i,
    /\bwhitepride\b/i,
    /\bwhitesupremacy\b/i,
    /\bblacksupremacy\b/i,
    /\bantisemitic\b/i,
    /\bzionist\b/i,
    /\bzionism\b/i,
    /\bnazi\b/i,
    /\bhitler\b/i,
    /\bsemen\b/i,
    /\bsp3rm\b/i,
    /\bsperm\b/i,
    /\btesticle\b/i,
    /\bscrotum\b/i,
    /\bforeskin\b/i,
    /\banus\b/i,
    /\brectum\b/i,
    /\bprostitute\b/i,
    /\bescort\b/i,
    /\bstripper\b/i,
    /\bstripclub\b/i,
    /\bwh0re\b/i,
    /\bwh0r3\b/i,
    /\bbiatch\b/i,
    /\bbitch\b/i,
    /\bhoe\b/i,
    /\bho\b/i,
    /\btranny\b/i,
    /\btranssexual\b/i,
    /\btransgender\b/i,
    /\bdyke\b/i,
    /\bspic\b/i,
    /\bkike\b/i,
    /\bchink\b/i,
    /\bgook\b/i,
    /\bjap\b/i,
    /\bwetback\b/i,
    /\bbeaner\b/i,
    /\bcoon\b/i,
    /\bspook\b/i,
    /\bporchmonkey\b/i,
    /\btowelhead\b/i,
    /\bsandnigger\b/i,
    /\braghead\b/i,
    /\bcameljockey\b/i,
    /\bgypsy\b/i,
    /\bretarded\b/i,
    /\bcripple\b/i,
    /\bspaz\b/i,
    /\bspastic\b/i,
    /\bautist\b/i,
    /\bautistic\b/i,
    /\bmidget\b/i,
    /\bdwarf\b/i,
    /\bhermaphrodite\b/i,
    /\bintersex\b/i,
    /\bdownsyndrome\b/i,
    /\bspina\b/i,
    /\bbastard\b/i,
    /\bslant\b/i,
    /\bcrip\b/i,
    /\bcrips\b/i,
    /\bbloods\b/i,
    /\bgang\b/i,
    /\bmafia\b/i,
    /\bcartel\b/i,
    /\bsyndicate\b/i,
    /\bextort\b/i,
    /\bblackmail\b/i,
    /\bbribe\b/i,
    /\bcorrupt\b/i,
    /\bscam\b/i,
    /\bfraud\b/i,
    /\bcheat\b/i,
    /\bembezzle\b/i,
    /\bforgery\b/i,
    /\bplagiarize\b/i,
    /\bplagiarism\b/i,
  ];
  const norm = normalizeText(text);
  return banned.some((re) => re.test(norm));
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
            content: plainText + "\n" + normalizeText(plainText),
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
