import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "../styles/AccountPage.module.css";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const FollowerListModal = ({ open, onClose, followers, currentUserProfile }) => {
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowerProfiles = async () => {
      if (!open || !followers?.length) {
        setFollowerProfiles([]);
        setLoading(false);
        return;
      }

      try {
        const profiles = await Promise.all(
          followers.map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
          })
        );

        setFollowerProfiles(profiles.filter(Boolean));
        
        // Set following status
        if (currentUserProfile?.followingId) {
          setFollowingIds(new Set(currentUserProfile.followingId));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching follower profiles:", error);
        setLoading(false);
      }
    };

    fetchFollowerProfiles();
  }, [open, followers, currentUserProfile]);

  const handleFollowToggle = async (userId) => {
    if (!auth.currentUser) return;
    
    const isFollowing = followingIds.has(userId);
    const currentUserId = auth.currentUser.uid;

    try {
      // Update current user's following list
      await updateDoc(doc(db, "users", currentUserId), {
        followingId: isFollowing ? arrayRemove(userId) : arrayUnion(userId),
      });

      // Update target user's followers list
      await updateDoc(doc(db, "users", userId), {
        followersId: isFollowing ? arrayRemove(currentUserId) : arrayUnion(currentUserId),
      });

      // Update local state
      setFollowingIds(prev => {
        const newSet = new Set(prev);
        if (isFollowing) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  };

  const handleProfileClick = (username) => {
    if (currentUserProfile?.username === username) {
      navigate("/account");
    } else {
      navigate(`/user/${username}`);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          width: "90%",
          maxWidth: "400px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <h3 style={{ marginBottom: "20px", fontSize: "1.2rem" }}>Followers</h3>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#666",
          }}
        >
          ×
        </button>
        
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              Loading...
            </div>
          ) : followerProfiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
              No followers yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {followerProfiles.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: "1 1 auto",
                      minWidth: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => handleProfileClick(profile.username)}
                  >
                    <img
                      src={profile.photoURL || PERSON_ICON}
                      alt={profile.username}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ 
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      <div style={{ color: "#666", fontSize: "0.95rem" }}>
                        {profile.username}
                      </div>
                    </div>
                  </div>
                  
                  {currentUserProfile?.uid !== profile.id && (
                    <div style={{ marginLeft: "16px", flexShrink: 0 }}>
                      <button
                        className={followingIds.has(profile.id) ? styles.followingBtn : styles.followBtn}
                        onClick={() => handleFollowToggle(profile.id)}
                        style={{
                          padding: "6px 16px",
                          minWidth: "auto",
                          maxWidth: "100px",
                          fontSize: "0.9rem",
                        }}
                      >
                        {followingIds.has(profile.id) ? "Following" : "Follow"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowerListModal;