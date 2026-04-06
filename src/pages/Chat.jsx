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

  // ✅ Responsive fix
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
      height: "100dvh",
      background: "#F5F7FA",
      overflow: "hidden",
    }}
  >
    {/* 📱 MOBILE MODE */}
    {isMobile ? (
      selectedUser ? (
        // 👉 CHAT SCREEN
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%", // Fixed: use height instead of minHeight
            overflow: "hidden",
          }}
        >
          {/* HEADER - Fixed tap target size */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              background: "#FFFFFF",
              borderBottom: "1px solid #E5E5EA",
              flexShrink: 0, // Prevents header from shrinking
            }}
          >
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                padding: "8px",
                margin: "-8px 0",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F2F2F7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ←
            </button>

            <div>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>
                {selectedUser.name}
              </div>
              <div style={{ fontSize: "12px", color: "#6E6E73" }}>
                {isTyping ? "typing..." : isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {/* 💬 MESSAGES - Fixed scrolling */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0, // Important for flex overflow
            }}
          >
            <ChatWindow
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />
          </div>

          {/* ✍️ INPUT - Fixed positioning */}
          <div style={{ flexShrink: 0 }}>
            <MessageInput
              user={user}
              selectedUser={{ ...selectedUser, chatId }}
            />
          </div>
        </div>
      ) : (
        // 👉 CHAT LIST SCREEN
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <h2
            style={{
              padding: "20px",
              margin: 0,
              color: "#0A84FF",
              borderBottom: "1px solid #E5E5EA",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            Light Messenger
          </h2>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <UserSearch user={user} setSelectedUser={setSelectedUser} />
            <ChatList user={user} setSelectedUser={setSelectedUser} />
          </div>
        </div>
      )
    ) : (
      // 💻 DESKTOP MODE
      <>
        {/* SIDEBAR */}
        <div
          style={{
            width: "320px",
            background: "#FFFFFF",
            borderRight: "1px solid #E5E5EA",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <h2
            style={{
              padding: "20px",
              margin: 0,
              color: "#0A84FF",
              borderBottom: "1px solid #E5E5EA",
              flexShrink: 0,
            }}
          >
            Light Messenger
          </h2>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <UserSearch user={user} setSelectedUser={setSelectedUser} />
            <ChatList user={user} setSelectedUser={setSelectedUser} />
          </div>
        </div>

        {/* CHAT AREA */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {selectedUser ? (
            <>
              {/* Desktop Header - ADD THIS (was missing) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  background: "#FFFFFF",
                  borderBottom: "1px solid #E5E5EA",
                  flexShrink: 0,
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", fontSize: "16px" }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6E6E73" }}>
                    {isTyping ? "typing..." : isOnline ? "Online" : "Offline"}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <ChatWindow
                  user={user}
                  selectedUser={{ ...selectedUser, chatId }}
                />
              </div>

              {/* Input */}
              <div style={{ flexShrink: 0 }}>
                <MessageInput
                  user={user}
                  selectedUser={{ ...selectedUser, chatId }}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8E8E93",
              }}
            >
              Select a chat to start messaging
            </div>
          )}
        </div>
      </>
    )}
  </div>
);
}