import React, { useState, useRef } from "react";
import styles from "../styles/PostCreatePage.module.css";
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from "../constants";

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
  const contentEditableRef = useRef();
  const fileInputRef = useRef();

  // Remove all <img> tags from content
  const removeImagesFromContent = (html) => html.replace(/<img[^>]*>/gi, "");

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      alert("Please enter both a title and content for your post.");
      return;
    }
    let photoURL = initialImage;
    let cleanedContent = contentEditableRef.current.innerHTML;
    // If a new image is selected, upload to Cloudinary
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
        return;
      }
      // Remove the preview image from the content
      cleanedContent = removeImagesFromContent(cleanedContent);
    } else if (!imagePreviewUrl) {
      // If image was removed
      photoURL = null;
      cleanedContent = removeImagesFromContent(cleanedContent);
    }
    onSave({
      title: title.trim(),
      text: cleanedContent.trim(),
      photoURL,
    });
  };

  return (
    <div className={styles.postCard} style={{ position: "relative" }}>
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
        onInput={(e) => setContent(e.currentTarget.innerHTML)}
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
          <button
            type="button"
            style={{
              marginLeft: 8,
              color: "#c00",
              background: "none",
              border: "none",
              cursor: "pointer",
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
        </div>
      )}
      <div className={styles.formatToolbar}>
        <button
          type="button"
          title="Image"
          onClick={() => fileInputRef.current.click()}
          disabled={submitting}
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
      <div
        className={styles.formActions}
        style={{ justifyContent: "flex-end" }}
      >
        <button
          className={styles.publishButton}
          type="button"
          onClick={handleSave}
          disabled={submitting}
          style={{ position: "fixed", right: 32, bottom: 32, zIndex: 1001 }}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginLeft: 12,
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
