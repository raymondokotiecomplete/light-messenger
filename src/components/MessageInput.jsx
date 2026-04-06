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
  const [uploading, setUploading] = useState(false);

  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

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
        setUploading(true);
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
        setUploading(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      setUploading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // 📷 FILE UPLOAD
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    // Auto-send file immediately
    setTimeout(() => sendMessage(selectedFile), 100);
  };

  // 📩 SEND MESSAGE
  const sendMessage = async (directFile = null) => {
    const messageText = text;
    const messageFile = directFile || file;
    
    if (!messageText.trim() && !messageFile) return;

    setUploading(true);

    try {
      const chatRef = doc(db, "chats", chatId);

      let fileUrl = null;

      if (messageFile) {
        const data = new FormData();
        data.append("file", messageFile);
        data.append("upload_preset", "wo1in6oj");

        const isImage = messageFile.type.startsWith("image/");
        const uploadUrl = isImage
          ? "https://api.cloudinary.com/v1_1/djdy04naj/image/upload"
          : "https://api.cloudinary.com/v1_1/djdy04naj/video/upload";

        const res = await fetch(uploadUrl, {
          method: "POST",
          body: data,
        });

        const result = await res.json();
        fileUrl = result.secure_url;
      }

      await addDoc(collection(chatRef, "messages"), {
        text: messageText,
        file: fileUrl,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false,
      });

      await setDoc(
        chatRef,
        {
          participants: [user.uid, selectedUser.uid],
          lastMessage: messageFile ? "📷 Image" : messageText,
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setUploading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "#FFFFFF",
        borderTop: "1px solid #E5E5EA",
        flexShrink: 0,
        minHeight: "60px",
      }}
    >
      {/* 📎 ATTACH BUTTON */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || recording}
        style={{
          background: "none",
          border: "none",
          fontSize: "24px",
          cursor: uploading || recording ? "not-allowed" : "pointer",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: (uploading || recording) ? "#C6C6C8" : "#0A84FF",
          flexShrink: 0,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!uploading && !recording) e.currentTarget.style.background = "#F2F2F7";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        📎
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* 💬 MESSAGE INPUT BUBBLE */}
      <div
        style={{
          flex: 1,
          minWidth: 0, // CRITICAL: Prevents overflow in landscape
          background: recording ? "#FFE5E5" : "#F2F2F7",
          borderRadius: "25px",
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background 0.2s",
        }}
      >
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
          onKeyPress={handleKeyPress}
          placeholder={
            recording ? "Recording..." : uploading ? "Uploading..." : "Type a message"
          }
          disabled={uploading || recording}
          style={{
            flex: 1,
            minWidth: 0, // CRITICAL: Prevents input overflow
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "16px",
            padding: "10px 0",
            color: recording ? "#FF3B30" : "#1C1C1E",
          }}
        />

        {/* 😊 EMOJI BUTTON (optional) */}
        <button
          type="button"
          disabled={uploading || recording}
          style={{
            background: "none",
            border: "none",
            fontSize: "22px",
            cursor: uploading || recording ? "not-allowed" : "pointer",
            padding: "4px",
            color: (uploading || recording) ? "#C6C6C8" : "#8E8E93",
            flexShrink: 0,
            opacity: uploading || recording ? 0.5 : 1,
          }}
        >
          😊
        </button>
      </div>

      {/* 🎤 MIC / ✈️ SEND / ⏹️ STOP BUTTON */}
      <div style={{ flexShrink: 0 }}>
        {recording ? (
          // ⏹️ STOP RECORDING BUTTON
          <button
            onClick={stopRecording}
            style={{
              background: "#FF3B30",
              border: "none",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "white",
              animation: "pulse 1s infinite",
            }}
          >
            ⏹️
          </button>
        ) : text.trim() === "" && !file ? (
          // 🎤 MIC BUTTON (when no text or file)
          <button
            onClick={startRecording}
            disabled={uploading}
            style={{
              background: "#0A84FF",
              border: "none",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "white",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            🎤
          </button>
        ) : (
          // ✈️ SEND BUTTON (when typing or has file)
          <button
            onClick={() => sendMessage()}
            disabled={uploading}
            style={{
              background: "#0A84FF",
              border: "none",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "white",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            ✈️
          </button>
        )}
      </div>

      {/* Animation keyframes for recording pulse */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}
      </style>
    </div>
  );
}