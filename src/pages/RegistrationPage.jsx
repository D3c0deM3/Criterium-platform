import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { auth } from "../firebase";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import styles from "../styles/RegistrationPage.module.css";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";

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
getAnalytics(app);

const RegistrationPage = () => {
  const [formType, setFormType] = useState("register");
  const [loading, setLoading] = useState(false);
  const registerContainerRef = useRef(null);
  const logoRef = useRef(null);
  const registerFormRef = useRef(null);
  const loginFormRef = useRef(null);
  const verifyFormRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // GSAP Animations
  useEffect(() => {
    gsap.fromTo(
      registerContainerRef.current,
      {
        scale: 0.8,
        opacity: 0,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: "power4.out",
      }
    );

    gsap.fromTo(
      logoRef.current,
      {
        opacity: 0,
        y: -20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power4.out",
      }
    );
  }, []);

  useEffect(() => {
    if (formType === "register" && registerFormRef.current) {
      gsap.fromTo(
        registerFormRef.current,
        {
          scale: 0.8,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power4.out",
        }
      );
    } else if (formType === "login" && loginFormRef.current) {
      gsap.fromTo(
        loginFormRef.current,
        {
          scale: 0.8,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power4.out",
        }
      );
    } else if (formType === "verify" && verifyFormRef.current) {
      gsap.fromTo(
        verifyFormRef.current,
        {
          scale: 0.8,
          opacity: 0,
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power4.out",
        }
      );
    }
  }, [formType]);

  // Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    let particleCount, maxDistance;

    function setParticleSettings() {
      const isMobile = window.innerWidth < 500;
      particleCount = isMobile ? 30 : 100;
      maxDistance = isMobile ? 80 : 150;

      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
      }

      draw() {
        ctx.fillStyle = `rgba(52, 73, 85, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    setParticleSettings();

    function connectParticles() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            ctx.strokeStyle = `rgba(52, 73, 85, ${
              (1 - distance / maxDistance) * 0.4
            })`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      connectParticles();
      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setParticleSettings();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Helper to check if user profile exists
  const checkUserProfileExists = async (uid) => {
    if (!uid) return false;
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists();
  };

  // Form Handlers
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target[0].value;
    const password = e.target[1].value;
    const confirmPassword = e.target[2].value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      setLoading(false);
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log("Registered:", user.email);

        sendEmailVerification(user)
          .then(() => {
            console.log("Verification email sent");
            setFormType("verify");
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error sending verification email:", error.message);
            alert(error.message);
            setLoading(false);
          });
      })
      .catch((error) => {
        console.error("Registration error:", error.message);
        alert(error.message);
        setLoading(false);
      });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("Logged in:", user.email);
      if (user.emailVerified) {
        const hasProfile = await checkUserProfileExists(user.uid);
        setLoading(false);
        if (hasProfile) {
          navigate("/dashboard");
        } else {
          navigate("/profile");
        }
      } else {
        alert("Please verify your email before logging in.");
        auth.signOut();
        setFormType("verify");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error.message);
      alert(error.message);
      setLoading(false);
    }
  };

  const handleVerifyClick = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        const hasProfile = await checkUserProfileExists(user.uid);
        setLoading(false);
        if (hasProfile) {
          navigate("/dashboard");
        } else {
          navigate("/profile");
        }
      } else {
        alert("Please click the verification link in your email first.");
        setLoading(false);
      }
    } else {
      alert("No user logged in. Please register or log in.");
      setFormType("register");
      setLoading(false);
    }
  };

  return (
    <>
      <canvas id="particle-bg" ref={canvasRef}></canvas>
      <div className={styles.centerWrapper}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
        <div className={styles.logo} ref={logoRef}>
          .<span>Criterium</span>
        </div>
        <div className={styles.registerContainer} ref={registerContainerRef}>
          <div id="form-container">
            {formType === "register" && (
              <div
                id="register-form"
                className={styles.formContent}
                ref={registerFormRef}
              >
                <h2>Register</h2>
                <form
                  className={styles.registerForm}
                  onSubmit={handleRegisterSubmit}
                >
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    disabled={loading}
                  />
                  <input
                    type="password"
                    placeholder="Create password"
                    required
                    disabled={loading}
                  />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    required
                    disabled={loading}
                  />
                  <p className={styles.loginLink}>
                    Already a member?{" "}
                    <button
                      type="button"
                      onClick={() => setFormType("login")}
                      className={styles.linkButton}
                      disabled={loading}
                    >
                      Log in here!
                    </button>
                  </p>
                  <button
                    type="submit"
                    className={styles.registerBtn}
                    disabled={loading}
                  >
                    Register
                  </button>
                </form>
              </div>
            )}

            {formType === "login" && (
              <div
                id="login-form"
                className={styles.formContent}
                ref={loginFormRef}
              >
                <h2>Login</h2>
                <form className={styles.loginForm} onSubmit={handleLoginSubmit}>
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    disabled={loading}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    disabled={loading}
                  />
                  <p className={styles.registerLink}>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => setFormType("register")}
                      className={styles.linkButton}
                      disabled={loading}
                    >
                      Join us now!
                    </button>
                  </p>
                  <button
                    type="submit"
                    className={styles.loginBtn}
                    disabled={loading}
                  >
                    Login
                  </button>
                </form>
              </div>
            )}

            {formType === "verify" && (
              <div
                id="verify-form"
                className={styles.formContent}
                ref={verifyFormRef}
              >
                <h2>Verify Your Email</h2>
                <p>
                  We've sent a verification link to your email. Please click it,
                  then press "Continue" below.
                </p>
                <button
                  className={styles.verifyBtn}
                  onClick={handleVerifyClick}
                  disabled={loading}
                >
                  Continue
                </button>
                <p className={styles.loginLink}>
                  Already verified?{" "}
                  <button
                    type="button"
                    onClick={() => setFormType("login")}
                    className={styles.linkButton}
                    disabled={loading}
                  >
                    Log in here!
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RegistrationPage;
