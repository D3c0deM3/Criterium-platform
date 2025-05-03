import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";
import Starfield from "../components/Starfield";
import styles from "../styles/LandingPage.module.css";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Firebase initialization
    const firebaseConfig = {
      apiKey: "AIzaSyAtxgJGFhLqCrhyUptk5wkDqM37YUed_vQ",
      authDomain: "criterium-d1615.firebaseapp.com",
      projectId: "criterium-d1615",
      storageBucket: "criterium-d1615.firebasestorage.app",
      messagingSenderId: "478195768548",
      appId: "1:478195768548:web:a1c3491ea3ef950045e0f1",
      measurementId: "G-0SWM8M4VJ3",
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    // const analytics = getAnalytics(app);

    // Expose auth functions to window (mimicking the original code)
    window.auth = auth;
    window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
    window.signInWithEmailAndPassword = signInWithEmailAndPassword;
    window.sendEmailVerification = sendEmailVerification;

    // GSAP animations
    if (typeof gsap !== "undefined") {
      // GSAP code can go here if needed
    }
  }, []);

  const handleStartWriting = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      if (localStorage.getItem("profileComplete") === "true") {
        navigate("/dashboard");
      } else {
        navigate("/profile");
      }
    } else {
      navigate("/register");
    }
  };

  return (
    <>
      <Starfield />
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.animatedText}>
            .Criterium -{" "}
            <span className={styles.highlight}>New Perspective</span>
          </h1>
          <p className={styles.subtitle}>
            A platform for curious minds to write, read, and inspire.
          </p>
          <button className={styles.ctaButton} onClick={handleStartWriting}>
            Start Writing
          </button>
        </div>
      </section>
    </>
  );
}

export default App;
