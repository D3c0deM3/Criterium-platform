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

const bannedWords = [
  /\bsex\b/i,
  /\bfuck\b/i,
  /\bnigg[ae]r\b/i,
  /\bass\b/i,
  /\bshit\b/i,
  /\bcum\b/i,
  /\bnegr\b/i,
  /\bshoxi\b/i,
  /\blox\b/i,
  /\bdalbayob\b/i,
  /\bchumo\b/i,
  /\bseks\b/i,
  /\bskay\b/i,
  /\bnegr\b/i,
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
  const norm = normalizeText(text || "");
  return bannedWords.some((re) => re.test(norm));
}

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
