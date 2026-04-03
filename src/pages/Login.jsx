import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Login() {

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      // 🔥 Save user to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        email: user.email,
      });

    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>Light Messenger</h1>
      <button onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}