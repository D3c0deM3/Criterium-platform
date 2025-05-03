import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const db = getFirestore(app);

export { app, auth, db }; 