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

export default function ChatWindow({ user, selectedUser }) {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

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

  // 🔒 Safety check
  if (!selectedUser || !user) {
    return <div style={{ padding: "20px" }}>Select a chat</div>;
  }

  return (
    <div
      style={{
        height: "100%",           // ← ADD THIS
        overflowY: "auto",        // ← ADD THIS
        display: "flex",          // ← ADD THIS
        flexDirection: "column",  // ← ADD THIS
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

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: "10px",
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
                  maxWidth: "60%",
                  marginLeft: isMe ? "auto" : "0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
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
                      width: "150px",
                      marginTop: "5px",
                      borderRadius: "10px",
                    }}
                  />
                )}

                {/* 🎤 AUDIO */}
                {msg.audio && (
                  <audio controls style={{ marginTop: "5px", width: "100%" }}>
                    <source src={msg.audio} type="audio/webm" />
                  </audio>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}