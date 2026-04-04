import { useState, useEffect } from "react";
import UserSearch from "../components/UserSearch";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Chat({ user }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // ✅ Normalize chatId safely
  const chatId = selectedUser?.chatId || selectedUser?.id;

  // 🟢 ONLINE STATUS
  useEffect(() => {
    if (!selectedUser?.uid) return;

    const ref = doc(db, "onlineUsers", selectedUser.uid);

    const unsubscribe = onSnapshot(ref, (docSnap) => {
      setIsOnline(docSnap.exists() ? docSnap.data().online : false);
    });

    return () => unsubscribe();
  }, [selectedUser?.uid]);

  // ⌨️ TYPING STATUS
  useEffect(() => {
    if (!chatId || !selectedUser?.uid) return;

    const ref = doc(db, "typing", chatId);

    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsTyping(data[selectedUser.uid] === true);
      } else {
        setIsTyping(false);
      }
    });

    return () => unsubscribe();
  }, [chatId, selectedUser?.uid]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F5F7FA" }}>
      
      {/* 🔵 SIDEBAR */}
      <div
        style={{
          width: "320px",
          background: "#FFFFFF",
          borderRight: "1px solid #E5E5EA",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2
          style={{
            padding: "20px",
            margin: 0,
            color: "#0A84FF",
            borderBottom: "1px solid #E5E5EA",
          }}
        >
          Light Messenger
        </h2>

        <UserSearch user={user} setSelectedUser={setSelectedUser} />
        <ChatList user={user} setSelectedUser={setSelectedUser} />
      </div>

      {/* 💬 CHAT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {selectedUser ? (
          <>
            {/* 🔥 HEADER */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "15px 20px",
                background: "#FFFFFF",
                borderBottom: "1px solid #E5E5EA",
              }}
            >
              {/* 👤 Avatar */}
              <img
                src={
                  selectedUser.photoURL ||
                  "https://via.placeholder.com/40"
                }
                alt="avatar"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%", // ✅ STEP 5 applied
                  objectFit: "cover",  // ✅ STEP 5 applied
                }}
              />

              {/* Name + Status */}
              <div>
                <div style={{ fontWeight: "600", color: "#1C1C1E" }}>
                  {selectedUser.name || "Chat"}
                </div>

                <div style={{ fontSize: "12px", color: "#6E6E73" }}>
                  {isTyping ? (
                    <span style={{ color: "#0A84FF" }}>typing...</span>
                  ) : isOnline ? (
                    <span style={{ color: "#0A84FF" }}>Online</span>
                  ) : (
                    "Offline"
                  )}
                </div>
              </div>
            </div>

            {/* 💬 MESSAGES */}
            <ChatWindow
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />

            {/* ✍️ INPUT */}
            <MessageInput
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#6E6E73",
              fontSize: "18px",
            }}
          >
            Select a chat to start messaging 💬
          </div>
        )}
      </div>
    </div>
  );
}