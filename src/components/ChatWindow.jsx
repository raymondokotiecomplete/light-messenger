import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";

export default function ChatWindow({ user, selectedUser, onReply, replyToMessage }) {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    if (!selectedUser?.chatId) return;

    const q = query(
      collection(db, "chats", selectedUser.chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(msgs);

      // 🔥 Mark messages as seen
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();

        if (data.senderId !== user.uid && !data.seen) {
          await updateDoc(
            doc(db, "chats", selectedUser.chatId, "messages", docSnap.id),
            { seen: true }
          );
        }
      });
    });

    return () => unsubscribe();
  }, [selectedUser?.chatId, user?.uid]);

  // 🔥 Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Scroll to replied message if needed
  useEffect(() => {
    if (replyToMessage && messageRefs.current[replyToMessage.id]) {
      messageRefs.current[replyToMessage.id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [replyToMessage]);

  // Helper to find replied message content
  const getRepliedMessageContent = (replyToId) => {
    const repliedMsg = messages.find((m) => m.id === replyToId);
    if (!repliedMsg) return null;
    
    if (repliedMsg.text) return repliedMsg.text;
    if (repliedMsg.file) return "📷 Image";
    if (repliedMsg.audio) return "🎤 Voice message";
    return "Message";
  };

  // 🔒 Safety check
  if (!selectedUser || !user) {
    return <div style={{ padding: "20px" }}>Select a chat</div>;
  }

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        padding: "15px",
        background: "#F5F7FA",
      }}
    >
      {/* 🔥 Empty state */}
      {messages.length === 0 && (
        <div style={{ textAlign: "center", color: "#6E6E73" }}>
          No messages yet
        </div>
      )}

      <div style={{ flex: 1 }}>
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const repliedContent = msg.replyTo ? getRepliedMessageContent(msg.replyTo.id || msg.replyTo) : null;

          return (
            <div
              key={msg.id}
              ref={(el) => (messageRefs.current[msg.id] = el)}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: "10px",
                position: "relative",
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  background: isMe ? "#0A84FF" : "#FFFFFF",
                  color: isMe ? "white" : "#1C1C1E",
                  border: isMe ? "none" : "1px solid #E5E5EA",
                  borderRadius: isMe
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  maxWidth: "70%",
                  marginLeft: isMe ? "auto" : "0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
              >
                {/* 🔁 REPLIED MESSAGE INDICATOR */}
                {msg.replyTo && repliedContent && (
                  <div
                    style={{
                      background: isMe ? "rgba(255,255,255,0.2)" : "#F2F2F7",
                      borderRadius: "12px",
                      padding: "6px 10px",
                      marginBottom: "8px",
                      fontSize: "12px",
                      borderLeft: `3px solid ${isMe ? "#FFFFFF" : "#0A84FF"}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: isMe ? "rgba(255,255,255,0.7)" : "#8E8E93",
                        marginBottom: "2px",
                      }}
                    >
                      ↪️ Replying to {msg.replyTo.senderId === user.uid ? "yourself" : selectedUser.name}
                    </div>
                    <div
                      style={{
                        color: isMe ? "rgba(255,255,255,0.9)" : "#1C1C1E",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {repliedContent}
                    </div>
                  </div>
                )}

                {/* 💬 TEXT */}
                {msg.text && (
                  <div>
                    {msg.text}

                    {/* ✔✔ STATUS */}
                    {isMe && (
                      <div
                        style={{
                          fontSize: "10px",
                          textAlign: "right",
                          marginTop: "4px",
                          opacity: 0.8,
                        }}
                      >
                        {msg.seen ? "✔✔ Seen" : "✔ Sent"}
                      </div>
                    )}
                  </div>
                )}

                {/* 🖼 IMAGE */}
                {msg.file && (
                  <img
                    src={msg.file}
                    alt="message"
                    style={{
                      maxWidth: "200px",
                      marginTop: "5px",
                      borderRadius: "10px",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(msg.file, "_blank")}
                  />
                )}

                {/* 🎤 AUDIO */}
                {msg.audio && (
                  <audio controls style={{ marginTop: "5px", width: "200px" }}>
                    <source src={msg.audio} type="audio/webm" />
                  </audio>
                )}

                {/* 📅 TIMESTAMP (optional) */}
                {msg.createdAt && (
                  <div
                    style={{
                      fontSize: "9px",
                      textAlign: "right",
                      marginTop: "4px",
                      opacity: 0.6,
                      color: isMe ? "rgba(255,255,255,0.7)" : "#8E8E93",
                    }}
                  >
                    {new Date(msg.createdAt?.toDate()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>

              {/* ↩️ REPLY BUTTON (visible on hover) */}
              <button
                onClick={() => onReply && onReply(msg)}
                style={{
                  position: "absolute",
                  [isMe ? "left" : "right"]: "-30px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#FFFFFF",
                  border: "1px solid #E5E5EA",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = 1;
                }}
                onMouseLeave={(e) => {
                  if (!document.querySelector(`.message-${msg.id}:hover`)) {
                    e.currentTarget.style.opacity = 0;
                  }
                }}
                className={`reply-btn-${msg.id}`}
              >
                ↩️
              </button>
            </div>
          );
        })}
      </div>

      {/* 🔥 Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}