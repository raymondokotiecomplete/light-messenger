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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const chatId = selectedUser?.chatId || selectedUser?.id;

  // 📱 Detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#F5F7FA",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {/* 🔵 SIDEBAR */}
      {(!isMobile || !selectedUser) && (
        <div
          style={{
            width: isMobile ? "100%" : "320px",
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
      )}

      {/* 💬 CHAT AREA */}
      {(!isMobile || selectedUser) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          
          {selectedUser ? (
            <>
              {/* 🔥 HEADER */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "15px",
                  background: "#FFFFFF",
                  borderBottom: "1px solid #E5E5EA",
                }}
              >
                {/* 🔙 BACK BUTTON (MOBILE ONLY) */}
                {isMobile && (
                  <button
                    onClick={() => setSelectedUser(null)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "18px",
                      cursor: "pointer",
                    }}
                  >
                    ←
                  </button>
                )}

                {/* Avatar */}
                <img
                  src={
                    selectedUser.photoURL ||
                    "https://via.placeholder.com/40"
                  }
                  alt="avatar"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />

                {/* Name + Status */}
                <div>
                  <div style={{ fontWeight: "600" }}>
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

              {/* 💬 Messages */}
              <ChatWindow
                user={user}
                selectedUser={{ ...selectedUser, chatId }}
              />

              {/* ✍️ Input */}
              <MessageInput
                user={user}
                selectedUser={{ ...selectedUser, chatId }}
              />
            </>
          ) : (
            !isMobile && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#6E6E73",
                }}
              >
                Select a chat to start messaging 💬
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}