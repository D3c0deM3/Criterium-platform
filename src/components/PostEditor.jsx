import React, { useState, useRef, useLayoutEffect } from "react";
import styles from "../styles/PostCreatePage.module.css";
import {
  CLOUDINARY_UPLOAD_URL,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_POST_IMAGE_UPLOAD_PRESET,
} from "../constants";
import { containsBannedWords, bannedWords } from "../utils/contentFilter";
import { isImageSafe } from "../utils/imageContentChecker";

export const Modal = ({ open, onClose, children }) => {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2000,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          minWidth: 320,
          maxWidth: 540,
          width: "95%",
          maxHeight: "96vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: 24,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "none",
            border: "none",
            fontSize: 22,
            color: "#888",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

const PostEditor = ({
  initialTitle = "",
  initialContent = "",
  initialImage = null,
  onSave,
  onCancel,
  submitting,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initialImage);
  const [imageUploading, setImageUploading] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);
  const contentEditableRef = useRef();
  const fileInputRef = useRef();
  const caretPosRef = useRef(null);

  // Save and restore caret position helpers
  function saveCaretPosition(editableDiv) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(editableDiv);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return start;
  }
  function restoreCaretPosition(editableDiv, pos) {
    if (!editableDiv || pos == null) return;
    const setPos = (node, remaining) => {
      if (node.nodeType === 3) {
        // text node
        if (node.length >= remaining) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(node, remaining);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        } else {
          remaining -= node.length;
        }
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          const found = setPos(node.childNodes[i], remaining);
          if (found) return true;
          if (node.childNodes[i].textContent)
            remaining -= node.childNodes[i].textContent.length;
        }
      }
      return false;
    };
    setPos(editableDiv, pos);
  }

  // Remove all <img> tags from content
  const removeImagesFromContent = (html) => html.replace(/<img[^>]*>/gi, "");

  // Helper to delete old post image from Cloudinary
  async function deletePostImageFromCloudinary(imageUrl) {
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUploading(true);
    const safe = await isImageSafe(file);
    setImageUploading(false);
    if (!safe) {
      setAlertInfo({
        word: null,
        message:
          "The selected image contains explicit, violent, or NSFW content and cannot be uploaded. Please choose another image.",
      });
      return;
    }
    // Remove any existing image in the editor
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = removeImagesFromContent(
        contentEditableRef.current.innerHTML
      );
    }
    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    // Insert preview image at the end
    if (contentEditableRef.current) {
      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = "preview";
      img.className = "editorImage";
      img.style.maxWidth = "100%";
      contentEditableRef.current.appendChild(img);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !contentEditableRef.current.innerText.trim()) {
      setAlertInfo({
        word: null,
        message: "Please enter both a title and content for your post.",
      });
      return;
    }
    const plainText =
      contentEditableRef.current.innerText ||
      contentEditableRef.current.textContent ||
      "";
    // Find which banned word is causing the violation
    const allText = title + "\n" + plainText;
    let violatingWord = null;
    for (let i = 0; i < bannedWords.length; i++) {
      const match = allText.match(bannedWords[i]);
      if (match) {
        violatingWord = match[0];
        break;
      }
    }
    if (violatingWord) {
      setAlertInfo({
        word: violatingWord,
        message: `Using word "${violatingWord}" violates our rules. Please remove that word or you are not able to save the changes or publish.`,
      });
      return;
    }
    let photoURL = initialImage;
    let cleanedContent = contentEditableRef.current.innerHTML;
    // If a new image is selected, upload to Cloudinary
    if (imageFile) {
      // Delete old image if it exists and is not a blob (Cloudinary image)
      if (initialImage && !initialImage.startsWith("blob:")) {
        await deletePostImageFromCloudinary(initialImage);
      }
      setImageUploading(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", CLOUDINARY_POST_IMAGE_UPLOAD_PRESET);
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
        return;
      }
      // Remove the preview image from the content
      cleanedContent = removeImagesFromContent(cleanedContent);
    } else if (!imagePreviewUrl) {
      // If image was removed
      if (initialImage && !initialImage.startsWith("blob:")) {
        await deletePostImageFromCloudinary(initialImage);
      }
      photoURL = null;
      cleanedContent = removeImagesFromContent(cleanedContent);
    }
    setAlertInfo(null);
    onSave({
      title: title.trim(),
      text: cleanedContent.trim(),
      photoURL,
    });
  };

  const handleInput = (e) => {
    // Save caret before updating content
    caretPosRef.current = saveCaretPosition(e.currentTarget);
    setContent(e.currentTarget.innerHTML);
  };

  useLayoutEffect(() => {
    if (!contentEditableRef.current) return;
    if (
      caretPosRef.current != null &&
      document.activeElement === contentEditableRef.current
    ) {
      restoreCaretPosition(contentEditableRef.current, caretPosRef.current);
    }
  }, [content]);

  return (
    <div className={styles.postCard} style={{ position: "relative" }}>
      {alertInfo && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "#fff3cd",
            color: "#856404",
            border: "1px solid #ffeeba",
            borderRadius: 8,
            padding: "20px 24px 16px 48px",
            minWidth: 220,
            maxWidth: 340,
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 18,
              top: 22,
              fontSize: 20,
              color: "#e0a800",
            }}
          >
            <svg
              width="20"
              height="20"
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
          <span style={{ marginLeft: 16, marginBottom: 12 }}>
            {alertInfo.message}
          </span>
          <button
            style={{
              alignSelf: "flex-end",
              background: "#344955",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setAlertInfo(null)}
          >
            OK
          </button>
        </div>
      )}
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
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {imagePreviewUrl && (
        <div className={styles.previewImageWrapper}>
          <img
            src={imagePreviewUrl}
            alt="Preview"
            className={styles.previewImage}
            style={{ maxWidth: "100%", borderRadius: 8, margin: "10px 0" }}
          />
        </div>
      )}
      {imageUploading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
      <div
        className={styles.formActions}
        style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}
      >
        <button
          type="button"
          title="Image"
          onClick={() => fileInputRef.current.click()}
          disabled={submitting}
          style={{
            background: "#f5f5f5",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "10px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
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
            style={{ marginRight: 4 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          Image
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        {imagePreviewUrl && (
          <button
            type="button"
            style={{
              color: "#c00",
              background: "#f5f5f5",
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "10px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => {
              setImageFile(null);
              setImagePreviewUrl(null);
              if (contentEditableRef.current) {
                contentEditableRef.current.innerHTML = removeImagesFromContent(
                  contentEditableRef.current.innerHTML
                );
              }
            }}
          >
            Remove Image
          </button>
        )}
        <button
          className={styles.publishButton}
          type="button"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "#eee",
            color: "#333",
            border: "none",
            borderRadius: 6,
            padding: "10px 18px",
            cursor: "pointer",
          }}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PostEditor;
