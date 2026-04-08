import { useState, useEffect } from "react";
import UserSearch from "../components/UserSearch";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import CallComponent from "../components/CallComponent";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

export default function Chat({ user }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [replyToMessage, setReplyToMessage] = useState(null);

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

  // 📱 PUSH NOTIFICATIONS SETUP
  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    // Firebase Cloud Messaging setup
    try {
      const messaging = getMessaging();
      
      getToken(messaging, { vapidKey: "BN7o9BDFrCw1kybbAOdTPxs0NpkIxRFO_QQRRq8aUtiuby0dWWvhlIQ-cOsExwOmVprq9R7XASC1gZlqkhrH3Ck" })
        .then((currentToken) => {
          if (currentToken) {
            // Save token to user's document in Firestore
            const userRef = doc(db, "users", user.uid);
            updateDoc(userRef, { fcmToken: currentToken });
            console.log("FCM Token saved:", currentToken);
          }
        })
        .catch((err) => console.log("Error getting token:", err));

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        if (payload.notification && selectedUser?.uid !== payload.data?.senderId) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/logo.png",
          });
        }
      });
    } catch (error) {
      console.error("Messaging initialization error:", error);
    }
  }, [user.uid, selectedUser]);

  // ✅ Handle reply to message
  const handleReply = (message) => {
    setReplyToMessage(message);
  };

  // ✅ Clear reply
  const clearReply = () => {
    setReplyToMessage(null);
  };

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
              height: "100%",
              overflow: "hidden",
            }}
          >
            {/* HEADER - Fixed tap target size with CallComponent */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "#FFFFFF",
                borderBottom: "1px solid #E5E5EA",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    clearReply();
                  }}
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

              {/* 📞 Call Component */}
              <CallComponent 
                user={user} 
                selectedUser={selectedUser} 
                chatId={chatId} 
              />
            </div>

            {/* 💬 MESSAGES - Fixed scrolling */}
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
                onReply={handleReply}
                replyToMessage={replyToMessage}
              />
            </div>

            {/* ✍️ INPUT - Fixed positioning */}
            <div style={{ flexShrink: 0 }}>
              <MessageInput
                user={user}
                selectedUser={{ ...selectedUser, chatId }}
                replyTo={replyToMessage}
                onReplyCleared={clearReply}
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
                {/* Desktop Header with CallComponent */}
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

                  {/* 📞 Call Component */}
                  <CallComponent 
                    user={user} 
                    selectedUser={selectedUser} 
                    chatId={chatId} 
                  />
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
                    onReply={handleReply}
                    replyToMessage={replyToMessage}
                  />
                </div>

                {/* Input */}
                <div style={{ flexShrink: 0 }}>
                  <MessageInput
                    user={user}
                    selectedUser={{ ...selectedUser, chatId }}
                    replyTo={replyToMessage}
                    onReplyCleared={clearReply}
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