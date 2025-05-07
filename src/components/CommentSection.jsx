import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/DashboardPage.module.css";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { containsBannedWords } from "../utils/contentFilter";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

function formatLikesCount(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return num;
}

const CommentEditModal = ({ open, onClose, comment, onSave, submitting }) => {
  const [editText, setEditText] = useState("");
  const [alertInfo, setAlertInfo] = useState(null);

  // Update editText when the modal is opened with a new comment
  React.useEffect(() => {
    if (comment) {
      setEditText(comment.text);
    }
  }, [comment]);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setEditText(newText);

    // Clear warning if text is empty
    if (!newText.trim()) {
      setAlertInfo(null);
      return;
    }

    // Check for banned words
    if (containsBannedWords(newText)) {
      setAlertInfo({
        message:
          "Your comment contains inappropriate or banned words. Please revise and try again.",
      });
    } else {
      setAlertInfo(null);
    }
  };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for banned words
    if (containsBannedWords(editText)) {
      setAlertInfo({
        message:
          "Your comment contains inappropriate or banned words. Please revise and try again.",
      });
      return;
    }

    // Perspective API moderation check
    try {
      const moderationRes = await fetch(
        "https://content-moderation-server.onrender.com/moderate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editText }),
        }
      );
      const moderationData = await moderationRes.json();
      if (moderationData.flagged) {
        setAlertInfo({
          message:
            "Your comment contains content that is considered inappropriate or toxic. Please revise and try again.",
        });
        return;
      }
    } catch (err) {
      setAlertInfo({
        message:
          "Content moderation service is unavailable. Please try again later.",
      });
      return;
    }

    onSave(editText);
  };

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
        <h2 style={{ marginBottom: 20, fontSize: "1.2rem" }}>Edit Comment</h2>
        <form onSubmit={handleSubmit}>
          {alertInfo && (
            <div
              style={{
                background: "#fff3cd",
                color: "#856404",
                border: "1px solid #ffeeba",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                fontSize: "0.95rem",
              }}
            >
              {alertInfo.message}
            </div>
          )}
          <textarea
            value={editText}
            onChange={handleTextChange}
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 20,
              fontSize: "1rem",
              resize: "vertical",
            }}
            disabled={submitting}
            maxLength={300}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#fff",
                color: "#333",
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
              }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: "#1a3c34",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
              }}
              disabled={submitting || !editText.trim()}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CommentSection({
  postId,
  currentUser,
  authorImageCache,
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [likeLoading, setLikeLoading] = useState({});
  const [alertInfo, setAlertInfo] = useState(null);
  const [commentPosting, setCommentPosting] = useState(false);
  const [lastPostedCommentId, setLastPostedCommentId] = useState(null);
  const [menuOpen, setMenuOpen] = useState({});
  const menuRefs = useRef({});

  // Add click outside handler
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
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleMenuToggle = (commentId) => {
    setMenuOpen((prev) => {
      const isOpen = prev[commentId];
      // Close other menus when opening a new one
      return isOpen ? {} : { [commentId]: true };
    });
  };

  // Get user profile from localStorage
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    const cached = localStorage.getItem("sidebarProfile");
    if (cached) {
      setProfile(JSON.parse(cached));
    } else if (currentUser) {
      setProfile(currentUser);
      const fetchProfile = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          localStorage.setItem("sidebarProfile", JSON.stringify(data));
        }
      };
      fetchProfile();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!postId) return;
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      where("createdAt", "!=", null),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (
      lastPostedCommentId &&
      comments.find((c) => c.id === lastPostedCommentId)
    ) {
      setCommentPosting(false);
      setLastPostedCommentId(null);
    }
  }, [comments, lastPostedCommentId]);

  const handleCommentChange = (e) => {
    const newText = e.target.value;
    setNewComment(newText);

    // Clear warning if text is empty
    if (!newText.trim()) {
      setAlertInfo(null);
      return;
    }

    // Check for banned words
    if (containsBannedWords(newText)) {
      setAlertInfo({
        message:
          "Your comment contains inappropriate or banned words. Please revise and try again.",
      });
    } else {
      setAlertInfo(null);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !profile) return;

    // Check for banned words
    if (containsBannedWords(newComment)) {
      setAlertInfo({
        message:
          "Your comment contains inappropriate or banned words. Please revise and try again.",
      });
      return;
    }

    setCommentPosting(true);

    // Perspective API moderation check
    try {
      const moderationRes = await fetch(
        "https://content-moderation-server.onrender.com/moderate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment }),
        }
      );
      const moderationData = await moderationRes.json();
      if (moderationData.flagged) {
        setAlertInfo({
          message:
            "Your comment contains content that is considered inappropriate or toxic. Please revise and try again.",
        });
        setCommentPosting(false);
        return;
      }
    } catch (err) {
      setAlertInfo({
        message:
          "Content moderation service is unavailable. Please try again later.",
      });
      setCommentPosting(false);
      return;
    }

    // Create comment object with temporary ID
    const tempId = Date.now().toString();
    setLastPostedCommentId(tempId);

    const newCommentObj = {
      id: tempId,
      postId,
      text: newComment.trim(),
      authorId: currentUser.uid,
      authorUsername: profile.username || profile.displayName || "User",
      authorName: profile.firstName || profile.displayName || "User",
      authorPhoto: profile.photoURL || null,
      createdAt: { seconds: Date.now() / 1000 },
      likes: 0,
      likedBy: [],
    };

    setComments((prev) => [newCommentObj, ...prev]);
    setNewComment("");

    try {
      const batch = writeBatch(db);
      // Add the comment
      const commentRef = doc(collection(db, "comments"));
      batch.set(commentRef, {
        postId,
        text: newCommentObj.text,
        authorId: newCommentObj.authorId,
        authorUsername: newCommentObj.authorUsername,
        authorName: newCommentObj.authorName,
        authorPhoto: newCommentObj.authorPhoto,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });

      // Update post's comment count
      const postRef = doc(db, "posts", postId);
      batch.update(postRef, {
        commentCount: increment(1),
      });

      await batch.commit();
      setAlertInfo(null);
    } catch (err) {
      setComments((prev) => prev.filter((comment) => comment.id !== tempId));
      setAlertInfo({
        message: "Failed to add comment. Please try again.",
      });
      setCommentPosting(false);
      setLastPostedCommentId(null);
    }
  };

  const handleLikeComment = async (comment) => {
    if (!currentUser || likeLoading[comment.id]) return;
    setLikeLoading((prev) => ({ ...prev, [comment.id]: true }));
    const isLiked = comment.likedBy?.includes(currentUser.uid);

    setComments((prevComments) =>
      prevComments.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              likes: (c.likes || 0) + (isLiked ? -1 : 1),
              likedBy: isLiked
                ? c.likedBy.filter((id) => id !== currentUser.uid)
                : [...(c.likedBy || []), currentUser.uid],
            }
          : c
      )
    );

    try {
      const commentRef = doc(db, "comments", comment.id);
      await updateDoc(commentRef, {
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (err) {
      setComments((prevComments) =>
        prevComments.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                likes: (c.likes || 0) + (isLiked ? 1 : -1),
                likedBy: isLiked
                  ? [...(c.likedBy || []), currentUser.uid]
                  : c.likedBy.filter((id) => id !== currentUser.uid),
              }
            : c
        )
      );
      alert("Failed to update like. Please try again.");
    } finally {
      setLikeLoading((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  const handleEditComment = async (text) => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "comments", editingComment.id), {
        text: text.trim(),
      });
      setEditingComment(null);
    } catch (err) {
      alert("Failed to edit comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const batch = writeBatch(db);

      // Delete the comment
      const commentRef = doc(db, "comments", commentId);
      batch.delete(commentRef);

      // Update post's comment count
      const postRef = doc(db, "posts", postId);
      batch.update(postRef, {
        commentCount: increment(-1),
      });

      await batch.commit();
    } catch (err) {
      alert("Failed to delete comment. Please try again.");
    }
  };

  return (
    <div
      className={styles.postCard}
      style={{ marginTop: 16, marginBottom: 12, padding: "0 20px" }}
    >
      <form className={styles.commentForm} onSubmit={handleAddComment}>
        {alertInfo && (
          <div
            style={{
              background: "#fff3cd",
              color: "#856404",
              border: "1px solid #ffeeba",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: "0.95rem",
            }}
          >
            {alertInfo.message}
          </div>
        )}
        <input
          className={styles.commentInput}
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={handleCommentChange}
          disabled={commentPosting}
          maxLength={300}
        />
        <button
          className={styles.commentButton}
          type="submit"
          disabled={commentPosting || !newComment.trim()}
        >
          {commentPosting ? (
            <div className={styles.commentButtonSpinner} />
          ) : (
            "Post"
          )}
        </button>
      </form>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {comments.length === 0 ? (
          <div className={styles.noComments}>No comments yet.</div>
        ) : (
          comments.map((comment) => {
            const isOwn = currentUser && comment.authorId === currentUser.uid;
            const isLiked =
              currentUser && comment.likedBy?.includes(currentUser.uid);
            return (
              <div
                key={comment.id}
                className={styles.postCard}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "16px 16px 14px 16px",
                  marginBottom: 8,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(52,73,85,0.1)",
                  borderRadius: 12,
                  position: "relative",
                }}
              >
                <img
                  src={comment.authorPhoto || PERSON_ICON}
                  alt={comment.authorUsername || "User"}
                  className={styles.authorAvatar}
                  width={32}
                  height={32}
                  style={{ marginRight: 10 }}
                />
                <div
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      className={styles.authorName}
                      style={{ fontWeight: 500 }}
                    >
                      {comment.authorUsername || "User"}
                    </span>
                  </div>
                  <span
                    className={styles.postContent}
                    style={{
                      color: "#222",
                      fontSize: "1.05rem",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {comment.text}
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  {isOwn && (
                    <div
                      ref={(el) => (menuRefs.current[comment.id] = el)}
                      style={{ position: "relative", padding: "8px 12px" }}
                    >
                      <button
                        className={styles.dotsButton}
                        onClick={() => handleMenuToggle(comment.id)}
                        aria-label="Comment options"
                      >
                        ⋮
                      </button>
                      {menuOpen[comment.id] && (
                        <div className={styles.commentMenuDropdown}>
                          <button
                            className={styles.commentMenuButton}
                            onClick={() => {
                              setEditingComment(comment);
                              setMenuOpen({});
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.commentMenuButton}
                            onClick={() => {
                              handleDeleteComment(comment.id);
                              setMenuOpen({});
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ paddingRight: 12 }}>
                    <button
                      className={
                        styles.likeButton + (isLiked ? " " + styles.liked : "")
                      }
                      style={{ fontSize: 18, padding: "2px 8px" }}
                      onClick={() => handleLikeComment(comment)}
                      aria-label={isLiked ? "Unlike comment" : "Like comment"}
                      disabled={likeLoading[comment.id]}
                    >
                      {isLiked ? "❤️" : "🤍"}{" "}
                      {formatLikesCount(comment.likes || 0)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <CommentEditModal
        open={!!editingComment}
        onClose={() => setEditingComment(null)}
        comment={editingComment}
        onSave={handleEditComment}
        submitting={submitting}
      />
    </div>
  );
}
