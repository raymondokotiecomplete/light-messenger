import { useState, useRef, useEffect } from "react";
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

export default function MessageInput({ user, selectedUser, replyTo, onReplyCleared }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null); // ✅ For focusing on reply

  if (!selectedUser || !user) return null;

  const chatId = selectedUser.chatId;

  // ✅ Focus input when replying
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recording timer
  useEffect(() => {
    if (recording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [recording]);

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

        // ✅ Prepare message data with reply support
        const messageData = {
          audio: result.secure_url,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seen: false,
        };

        // ✅ Add reply reference if replying
        if (replyTo) {
          messageData.replyTo = {
            id: replyTo.id,
            text: replyTo.text || (replyTo.file ? "📷 Image" : replyTo.audio ? "🎤 Voice message" : "Message"),
            senderId: replyTo.senderId,
          };
          onReplyCleared?.(); // Clear reply after sending
        }

        await addDoc(collection(chatRef, "messages"), messageData);

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

  // 📷 FILE UPLOAD with preview
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }

    setFile(selectedFile);
  };

  const cancelFilePreview = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 😊 EMOJI PICKER
  const commonEmojis = ["😀", "😂", "❤️", "👍", "😊", "🥺", "🔥", "🎉", "😢", "😡", "🤔", "👋", "🙏", "💀", "✨", "😭", "🥰", "😍", "🤣", "😎"];
  
  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 📩 SEND MESSAGE with reply support
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

      // ✅ Prepare message data with reply support
      const messageData = {
        text: messageText,
        file: fileUrl,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seen: false,
      };

      // ✅ Add reply reference if replying
      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text || (replyTo.file ? "📷 Image" : replyTo.audio ? "🎤 Voice message" : "Message"),
          senderId: replyTo.senderId,
        };
        onReplyCleared?.(); // Clear reply after sending
      }

      await addDoc(collection(chatRef, "messages"), messageData);

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
      setFilePreview(null);
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
    <>
      {/* ✅ REPLY INDICATOR BAR */}
      {replyTo && (
        <div
          style={{
            padding: "8px 12px",
            background: "#E8F0FE",
            borderLeft: "4px solid #0A84FF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            margin: "0 12px",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <span>↪️ Replying to: {replyTo.text?.substring(0, 50) || (replyTo.file ? "📷 Image" : replyTo.audio ? "🎤 Voice message" : "Message")}</span>
          <button
            onClick={onReplyCleared}
            style={{
              background: "none",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
              color: "#8E8E93",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Image preview */}
      {filePreview && (
        <div
          style={{
            padding: "8px 12px",
            background: "#F2F2F7",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "0 12px",
            borderRadius: "12px",
          }}
        >
          <img
            src={filePreview}
            alt="Preview"
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "8px",
              objectFit: "cover",
            }}
          />
          <span style={{ flex: 1, fontSize: "14px", color: "#1C1C1E" }}>
            {file?.name || "Image ready to send"}
          </span>
          <button
            onClick={cancelFilePreview}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#FF3B30",
            }}
          >
            ✕
          </button>
        </div>
      )}

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
          position: "relative",
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
            minWidth: 0,
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
            ref={inputRef}
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
              recording ? `Recording... ${formatDuration(recordingDuration)}` : 
              uploading ? "Uploading..." : 
              "Type a message"
            }
            disabled={uploading || recording}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "16px",
              padding: "10px 0",
              color: recording ? "#FF3B30" : "#1C1C1E",
            }}
          />

          {/* 😊 EMOJI BUTTON with picker */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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

            {/* Emoji Picker Dropdown */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: "absolute",
                  bottom: "50px",
                  right: "0",
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  padding: "12px",
                  width: "280px",
                  zIndex: 1000,
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
                  gap: "8px",
                }}
              >
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "24px",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "8px",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F2F2F7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🎤 MIC / ✈️ SEND / ⏹️ STOP BUTTON */}
        <div style={{ flexShrink: 0 }}>
          {recording ? (
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
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}
      </style>
    </>
  );
}