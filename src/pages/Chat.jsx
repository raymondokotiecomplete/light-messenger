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

  const isMobile = window.innerWidth < 768;

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
    <div
      style={{
        height: "100dvh",
        background: "#F5F7FA",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* 📱 MOBILE MODE */}
      {isMobile ? (
        selectedUser ? (
          // 👉 CHAT SCREEN
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            
            {/* 🔙 HEADER WITH BACK BUTTON */}
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

              <div>
                <div style={{ fontWeight: "600" }}>
                  {selectedUser.name}
                </div>
                <div style={{ fontSize: "12px", color: "#6E6E73" }}>
                  {isTyping
                    ? "typing..."
                    : isOnline
                    ? "Online"
                    : "Offline"}
                </div>
              </div>
            </div>

            <ChatWindow
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />

            <MessageInput
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />
          </div>
        ) : (
          // 👉 CHAT LIST SCREEN
          <div style={{ width: "100%" }}>
            <h2
              style={{
                padding: "20px",
                margin: 0,
                color: "#0A84FF",
                borderBottom: "1px solid #E5E5EA",
                background: "#fff",
              }}
            >
              Light Messenger
            </h2>

            <UserSearch user={user} setSelectedUser={setSelectedUser} />
            <ChatList user={user} setSelectedUser={setSelectedUser} />
          </div>
        )
      ) : (
        // 💻 DESKTOP MODE (UNCHANGED)
        <>
          {/* SIDEBAR */}
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

          {/* CHAT */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {selectedUser ? (
              <>
                <ChatWindow
                  user={user}
                  selectedUser={{ ...selectedUser, chatId }}
                />
                <MessageInput
                  user={user}
                  selectedUser={{ ...selectedUser, chatId }}
                />
              </>
            ) : (
              <div style={{ padding: "20px" }}>
                Select a chat
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}