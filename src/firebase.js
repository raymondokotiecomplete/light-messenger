import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// In your firebase.js, add:
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAxoDYLffKmP7-cFKLL1JZFb8jRNbkGAbo",
  authDomain: "meetupapp-361c4.firebaseapp.com",
  projectId: "meetupapp-361c4",
  storageBucket: "meetupapp-361c4.firebasestorage.app",
  messagingSenderId: "889323989767",
  appId: "1:889323989767:web:580ffa85660b83ac6a73a2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Then export it
export const messaging = getMessaging(app);
// Add this to your firebase.js or a separate setup file
// Message Reactions Collection Structure:
// reactions/{messageId}/userReactions/{userId}
// Each reaction doc: { reaction: "❤️", timestamp: timestamp }

// Edit History Collection:
// messageEdits/{editId}
// { messageId, newText, editedAt, editedBy }