import React, { useEffect, useState } from "react";
import styles from "../styles/PostCreatePage.module.css";
import { useNavigate, useLocation } from "react-router-dom";

const PERSON_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";

const Sidebar = ({ userProfile, sidebarOpen }) => {
  const [profile, setProfile] = useState(userProfile);
  useEffect(() => {
    const cached = localStorage.getItem("sidebarProfile");
    if (cached) {
      setProfile(JSON.parse(cached));
    } else if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <aside
      className={
        styles.sidebar + (sidebarOpen ? " " + styles.sidebarActive : "")
      }
    >
      <div className={styles.logo}>criterium</div>
      <div className={styles.userInfo}>
        <img
          className={styles.userInfoImg}
          src={profile?.photoURL || PERSON_ICON}
          alt="Profile"
        />
        <div className={styles.userDetails}>
          <span className={styles.username}>
            {profile?.firstName || profile?.email?.split("@")[0] || "User"}
          </span>
          <span className={styles.handle}>
            {profile?.username || "@username"}
          </span>
        </div>
      </div>
      <div className={styles.navLinks}>
        <a href="#" className={styles.navItem}>
          <span className={styles.icon + " " + styles.hashtag}>#</span>{" "}
          <span>explore</span>
        </a>
        <button
          type="button"
          className={
            styles.navItem +
            (location.pathname === "/dashboard"
              ? " " + styles.navItemActive
              : "")
          }
          onClick={() => navigate("/dashboard")}
        >
          <span className={styles.icon}>
            {/* Home SVG */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>{" "}
          <span>Home</span>
        </button>
        <button
          type="button"
          className={
            styles.navItem +
            (location.pathname === "/create" ? " " + styles.navItemActive : "")
          }
          onClick={() => navigate("/create")}
        >
          <span className={styles.icon}>
            {/* New Thought SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </span>
          New thought
        </button>
        <a href="#" className={styles.navItem}>
          <span className={styles.icon}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Menu 2</span>
        </a>
        <a href="#" className={styles.navItem}>
          <span className={styles.icon + " " + styles.hashtag}>#</span>{" "}
          <span>preferences</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
