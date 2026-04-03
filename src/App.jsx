import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./pages/Login";
import Chat from "./pages/Chat";

import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [user, setUser] = useState(null);

  // 🔐 Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // 🟢 Online status tracker
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "onlineUsers", user.uid);

    // 🔥 Set user online
    setDoc(userRef, {
      online: true,
      lastSeen: new Date(),
    });

    // 🔥 Set offline when user leaves
    const handleOffline = () => {
      setDoc(userRef, {
        online: false,
        lastSeen: new Date(),
      });
    };

    window.addEventListener("beforeunload", handleOffline);

    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user]);

  return (
    <div>
      {user ? <Chat user={user} /> : <Login />}
    </div>
  );
}

export default App;