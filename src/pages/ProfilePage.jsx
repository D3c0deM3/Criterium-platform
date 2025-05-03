import React, { useState, useRef, useEffect } from "react";
import styles from "../styles/ProfilePage.module.css";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const CLOUDINARY_CLOUD_NAME = "dn6uypx98";
const CLOUDINARY_UPLOAD_PRESET = "profile_pics";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const ProfilePage = () => {
  const [profilePic, setProfilePic] = useState(
    "https://via.placeholder.com/100"
  );
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkingProfile, setCheckingProfile] = useState(true);
  const profilePicInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setCheckingProfile(false);
        return;
      }
      if (localStorage.getItem("profileComplete") === "true") {
        navigate("/dashboard");
        return;
      }
      // Fallback to Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        localStorage.setItem(
          "sidebarProfile",
          JSON.stringify({
            firstName: userDoc.data().firstName,
            lastName: userDoc.data().lastName,
            username: userDoc.data().username,
            photoURL: userDoc.data().photoURL,
            email: userDoc.data().email,
          })
        );
        localStorage.setItem("profileComplete", "true");
        navigate("/dashboard");
        return;
      } else {
        // setUserProfile(null); // REMOVE
      }
      setCheckingProfile(false);
    };
    checkProfile();
  }, [navigate]);

  if (checkingProfile) {
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

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
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      alert("No user logged in. Please log in.");
      navigate("/register");
      return;
    }
    const usernameValue = username.trim().startsWith("@")
      ? username.trim()
      : `@${username.trim()}`;
    // Check if username is unique
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
    // Upload image if present
    const saveProfile = async (photoURL = null) => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          email: user.email,
          username: usernameValue,
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          bio: bio.trim() || null,
          photoURL,
          createdAt: new Date(),
        });
        localStorage.setItem(
          "sidebarProfile",
          JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim() || null,
            username: usernameValue,
            photoURL,
            email: user.email,
          })
        );
        localStorage.setItem("profileComplete", "true");
        setLoading(false);
        navigate("/dashboard");
      } catch (error) {
        setLoading(false);
        alert("Error saving profile: " + error.message);
      }
    };
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
          await saveProfile(data.secure_url);
        } else {
          setLoading(false);
          alert("Error uploading image to Cloudinary.");
        }
      } catch (error) {
        setLoading(false);
        alert("Error uploading picture: " + error.message);
      }
    } else {
      await saveProfile();
    }
  };

  return (
    <div className={styles.centerWrapper}>
      <div className={styles.profileContainer}>
        <h2 className={styles.title}>Your Info</h2>
        <div className={styles.profilePic} onClick={handleProfilePicClick}>
          <img
            className={styles.profilePicImg}
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
            className={styles.profileFormInput}
            type="text"
            placeholder="Username (e.g., @markbrown)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {usernameError && (
            <div className={styles.errorMessage}>{usernameError}</div>
          )}
          <input
            className={styles.profileFormInput}
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            className={styles.profileFormInput}
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <textarea
            className={styles.profileFormTextarea}
            placeholder="Tell us about yourself..."
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
