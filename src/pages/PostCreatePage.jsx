import React, { useState, useEffect } from "react";
import styles from "../styles/PostCreatePage.module.css";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Sidebar from "./Sidebar";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../constants";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const PostCreatePage = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
    if (!title.trim() || !contentEditableRef.current.innerText.trim()) {
      alert("Please enter both a title and content for your post.");
      return;
    }
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const postId = Date.now().toString();
      // Extract first image as photoURL, remove it from content
      let content = contentEditableRef.current.innerHTML;
      let photoURL = null;
      let cleanedContent = content;
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch) {
        photoURL = imgMatch[1];
        // Remove only the first <img ...> tag
        cleanedContent = content.replace(imgMatch[0], "");
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

  // Image upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        // Only insert image after successful upload
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const img = document.createElement("img");
          img.src = data.secure_url;
          img.alt = "uploaded";
          img.className = "editorImage";
          img.style.maxWidth = "100%";
          const range = sel.getRangeAt(0);
          range.insertNode(img);
          // Insert a space after the image and move cursor there
          const space = document.createTextNode(" ");
          img.after(space);
          // Move cursor after the space node
          range.setStartAfter(space);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        setContent(contentEditableRef.current.innerHTML);
      } else {
        // Show Cloudinary error message if available
        alert(
          "Image upload failed: " + (data.error?.message || "Unknown error")
        );
      }
    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
  };

  // Keep content state in sync with contenteditable
  const handleContentInput = () => {
    setContent(contentEditableRef.current.innerHTML);
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
