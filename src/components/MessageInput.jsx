import { useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  increment,
} from "firebase/firestore";

export default function MessageInput({ user, selectedUser }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const typingTimeout = useRef(null);

  if (!selectedUser || !user) return null;

  const chatId = selectedUser.chatId;

  // 🟢 Start typing
  const handleTyping = async () => {
    if (!chatId) return;

    await setDoc(
      doc(db, "typing", chatId),
      { [user.uid]: true },
      { merge: true }
    );
  };

  // 🔴 Stop typing
  const handleStopTyping = async () => {
    if (!chatId) return;

    await setDoc(
      doc(db, "typing", chatId),
      { [user.uid]: false },
      { merge: true }
    );
  };

  // 🎤 START RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });

        const data = new FormData();
        data.append("file", blob);
        data.append("upload_preset", "wo1in6oj");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/djdy04naj/video/upload",
          {
            method: "POST",
            body: data,
          }
        );

        const result = await res.json();

        const chatRef = doc(db, "chats", chatId);

        await addDoc(collection(chatRef, "messages"), {
          audio: result.secure_url,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seen: false,
        });

        await setDoc(
          chatRef,
          {
            participants: [user.uid, selectedUser.uid],
            lastMessage: "🎤 Voice message",
            lastMessageTime: serverTimestamp(),
            lastMessageSender: user.uid,
          },
          { merge: true }
        );

        await handleStopTyping();

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // 📩 SEND MESSAGE
  const sendMessage = async () => {
    if (!text.trim() && !file) return;

    try {
      const chatRef = doc(db, "chats", chatId);

      let fileUrl = null;

      if (file) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "wo1in6oj");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/djdy04naj/image/upload",
          {
            method: "POST",
            body: data,
          }
        );

        const result = await res.json();
        fileUrl = result.secure_url;
      }

      await addDoc(collection(chatRef, "messages"), {
        text: text,
        file: fileUrl,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false,
      });

      await setDoc(
        chatRef,
        {
          participants: [user.uid, selectedUser.uid],
          lastMessage: file ? "📷 Image" : text,
          lastMessageTime: serverTimestamp(),
          lastMessageSender: user.uid,
        },
        { merge: true }
      );

      await updateDoc(chatRef, {
        [`unreadCount.${selectedUser.uid}`]: increment(1),
      });

      await handleStopTyping();

      setText("");
      setFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px",
        borderTop: "1px solid #E5E5EA",
        background: "#FFFFFF",
        gap: "8px",
      }}
    >
      {/* 📎 FILE */}
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      {/* 💬 INPUT */}
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          handleTyping();

          if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
          }

          typingTimeout.current = setTimeout(() => {
            handleStopTyping();
          }, 1500);
        }}
        placeholder="Type a message"
        style={{
          flex: 1,
          padding: "12px",
          borderRadius: "20px",
          border: "1px solid #E5E5EA",
          outline: "none",
        }}
      />

      {/* 🎤 VOICE */}
      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          background: recording ? "red" : "#0A84FF",
          color: "white",
          border: "none",
          padding: "10px",
          borderRadius: "50%",
          cursor: "pointer",
        }}
      >
        {recording ? "⏹" : "🎤"}
      </button>

      {/* 📩 SEND */}
      <button
        onClick={sendMessage}
        style={{
          background: "#0A84FF",
          color: "white",
          border: "none",
          padding: "10px 16px",
          borderRadius: "20px",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
}