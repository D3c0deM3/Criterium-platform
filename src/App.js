import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import RegistrationPage from "./pages/RegistrationPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PostCreatePage from "./pages/PostCreatePage.jsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
// Placeholder ProfilePage component
// const ProfilePage = () => <div style={{padding: 40, textAlign: 'center'}}><h1>Profile Page</h1><p>You are logged in!</p></div>;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check localStorage first
        if (localStorage.getItem("profileComplete") === "true") {
          setProfileExists(true);
        } else {
          // Fallback to Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setProfileExists(true);
            localStorage.setItem("profileComplete", "true");
          } else {
            setProfileExists(false);
          }
        }
      } else {
        setProfileExists(null);
        localStorage.removeItem("profileComplete");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || (user && profileExists === null)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/register" />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              profileExists ? (
                <DashboardPage />
              ) : (
                <Navigate to="/profile" />
              )
            ) : (
              <Navigate to="/register" />
            )
          }
        />
        <Route
          path="/create"
          element={
            user ? (
              profileExists ? (
                <PostCreatePage />
              ) : (
                <Navigate to="/profile" />
              )
            ) : (
              <Navigate to="/register" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
