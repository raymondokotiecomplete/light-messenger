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

  // 🟢 ONLINE STATUS LISTENER
  useEffect(() => {
    if (!selectedUser?.uid) return;

    const ref = doc(db, "onlineUsers", selectedUser.uid);

    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        setIsOnline(docSnap.data().online);
      } else {
        setIsOnline(false);
      }
    });

    return () => unsubscribe();
  }, [selectedUser?.uid]);

  // ⌨️ TYPING LISTENER
  useEffect(() => {
    if (!selectedUser?.chatId || !selectedUser?.uid) return;

    const ref = doc(db, "typing", selectedUser.chatId);

    const unsubscribe = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        setIsTyping(data[selectedUser.uid] === true);
      } else {
        setIsTyping(false);
      }
    });

    return () => unsubscribe();
  }, [selectedUser?.chatId, selectedUser?.uid]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>
      
      {/* 🔥 SIDEBAR */}
      <div
        style={{
          width: "320px",
          background: "#111b21",
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ padding: "15px", borderBottom: "1px solid #222" }}>
          Chats
        </h2>

        <UserSearch user={user} setSelectedUser={setSelectedUser} />
        <ChatList user={user} setSelectedUser={setSelectedUser} />
      </div>

      {/* 🔥 CHAT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {selectedUser ? (
          <>
            {/* 🔥 Header */}
            <div
              style={{
                padding: "15px",
                borderBottom: "1px solid #ddd",
                background: "#f0f2f5",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {selectedUser.name || "Chat"}
              </div>

              {/* 🟢 STATUS (Typing > Online > Offline) */}
              <div style={{ fontSize: "12px" }}>
                {isTyping ? (
                  <span style={{ color: "green" }}>typing...</span>
                ) : (
                  <span style={{ color: isOnline ? "green" : "gray" }}>
                    {isOnline ? "🟢 Online" : "⚫ Offline"}
                  </span>
                )}
              </div>
            </div>

            {/* 🔥 Messages */}
            <ChatWindow user={user} selectedUser={selectedUser} />

            {/* 🔥 Input */}
            <MessageInput user={user} selectedUser={selectedUser} />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#555",
            }}
          >
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}