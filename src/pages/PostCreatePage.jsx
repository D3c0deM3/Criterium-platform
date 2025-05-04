import React, { useState, useEffect } from "react";
import styles from "../styles/PostCreatePage.module.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Sidebar from "./Sidebar";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../constants";

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
    .replace(/\s+/g, ""); // Remove spaces for stricter matching
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
    /\bbla\b/i,
    /\bblat\b/i,
    /\bblin\b/i,
    /\bnegas\b/i,
    /\bneggas\b/i,
    /\bnigga\b/i,
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

const PostCreatePage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = React.useRef();
  const contentEditableRef = React.useRef();
  const [toolbarBottom, setToolbarBottom] = useState(0);
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    bullet: false,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/register");
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        navigate("/profile");
        return;
      }
      setLoading(false);
    };
    fetchUserProfile();
  }, [navigate]);

  // Keep formatting bar above mobile keyboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleResize = () => {
      // Only apply on mobile
      if (window.innerWidth <= 768) {
        const offset = window.innerHeight - window.visualViewport.height;
        setToolbarBottom(offset > 0 ? offset : 0);
      } else {
        setToolbarBottom(0);
      }
    };
    window.visualViewport.addEventListener("resize", handleResize);
    handleResize();
    return () =>
      window.visualViewport.removeEventListener("resize", handleResize);
  }, []);

  // Update formatState on selection change
  const updateFormatState = () => {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      bullet: document.queryCommandState("insertUnorderedList"),
    });
  };
  useEffect(() => {
    document.addEventListener("selectionchange", updateFormatState);
    return () =>
      document.removeEventListener("selectionchange", updateFormatState);
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    const plainText = title + "\n" + contentEditableRef.current.innerText;
    if (!title.trim() || !contentEditableRef.current.innerText.trim()) {
      alert("Please enter both a title and content for your post.");
      return;
    }
    // Check both title and content for banned words
    if (
      containsBannedWords(title) ||
      containsBannedWords(contentEditableRef.current.innerText)
    ) {
      alert(
        "Your post contains inappropriate or banned words. Please revise and try again."
      );
      return;
    }
    setSubmitting(true);
    try {
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
        setSubmitting(false);
        return;
      }

      const user = auth.currentUser;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const postId = Date.now().toString();
      let content = contentEditableRef.current.innerHTML;
      let photoURL = null;
      let cleanedContent = content;
      // If an image file is selected, upload to Cloudinary
      if (imageFile) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setImageUploading(false);
        if (data.secure_url) {
          photoURL = data.secure_url;
        } else {
          alert(
            "Image upload failed: " + (data.error?.message || "Unknown error")
          );
          setSubmitting(false);
          return;
        }
        // Remove the preview image from the content
        cleanedContent = cleanedContent.replace(
          /<img[^>]*src=["']([^"']+)["'][^>]*>/i,
          ""
        );
      } else {
        // Remove any <img> tags if present (shouldn't be, but for safety)
        cleanedContent = cleanedContent.replace(/<img[^>]*>/gi, "");
      }
      await setDoc(doc(db, "posts", postId), {
        id: postId,
        title: title.trim(),
        text: cleanedContent.trim(),
        username: userData.username,
        photoURL: photoURL,
        likes: 0,
        publishedAt: serverTimestamp(),
      });
      // Clean up preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      setImageFile(null);
      navigate("/dashboard");
    } catch (error) {
      alert("Failed to publish post. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  // Formatting handlers (to be implemented)
  const handleFormat = (command) => {
    contentEditableRef.current.focus();
    document.execCommand(command, false, null);
    setTimeout(updateFormatState, 0);
  };

  // Image upload handler (for preview only, not Cloudinary upload)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Remove any existing image in the editor
    const editor = contentEditableRef.current;
    if (editor) {
      // Remove all <img> tags
      editor.innerHTML = editor.innerHTML.replace(/<img[^>]*>/gi, "");
    }
    // Revoke previous preview URL if any
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    // Insert preview image at cursor or at the end
    if (editor) {
      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = "preview";
      img.className = "editorImage";
      img.style.maxWidth = "100%";
      // Insert at cursor or append
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.insertNode(img);
        // Insert a space after the image and move cursor there
        const space = document.createTextNode(" ");
        img.after(space);
        range.setStartAfter(space);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(img);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar userProfile={userProfile} sidebarOpen={sidebarOpen} />
        <main className={styles.mainContent}>
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar userProfile={userProfile} sidebarOpen={sidebarOpen} />
      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Header Row */}
        <div className={styles.headerRow}>
          <div style={{ flex: 1 }}></div>
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
        {/* Formatting Toolbar */}
        <div className={styles.formatToolbar} style={{ bottom: toolbarBottom }}>
          <button
            type="button"
            title="Bold"
            onClick={() => handleFormat("bold")}
            className={formatState.bold ? styles.active : ""}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z" />
            </svg>
          </button>
          <button
            type="button"
            title="Italic"
            onClick={() => handleFormat("italic")}
            className={formatState.italic ? styles.active : ""}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <button
            type="button"
            title="Underline"
            onClick={() => handleFormat("underline")}
            className={formatState.underline ? styles.active : ""}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4v6a6 6 0 0 0 12 0V4" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
          </button>
          <button
            type="button"
            title="Bullet List"
            onClick={() => handleFormat("insertUnorderedList")}
            className={formatState.bullet ? styles.active : ""}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="4" cy="6" r="2" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="4" cy="18" r="2" />
            </svg>
          </button>
          <button
            type="button"
            title="Undo"
            onClick={() => handleFormat("undo")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 14H5v-4" />
              <path d="M20 20a9 9 0 1 0-7.32-15.88L5 10" />
            </svg>
          </button>
          <button
            type="button"
            title="Redo"
            onClick={() => handleFormat("redo")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 14h4v-4" />
              <path d="M4 20a9 9 0 1 1 7.32-15.88L19 10" />
            </svg>
          </button>
          <button
            type="button"
            title="Image"
            onClick={() => fileInputRef.current.click()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>
        {imageUploading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
        <form className={styles.postForm} onSubmit={handlePublish}>
          <input
            className={styles.postTitle}
            type="text"
            placeholder="Your title here..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
          <div
            id="post-content"
            className={styles.postContent}
            contentEditable
            ref={contentEditableRef}
            suppressContentEditableWarning={true}
            style={{ minHeight: 120, outline: "none" }}
            spellCheck={true}
            tabIndex={0}
            aria-label="Post content editor"
            disabled={submitting}
            data-placeholder="What is on your mind...."
          />
          <div className={styles.formActions}>
            <button
              className={styles.publishButton}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PostCreatePage;
