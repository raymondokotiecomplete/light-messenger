import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function ChatList({ user, setSelectedUser }) {
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  // 🔥 Fetch all users (for names)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const map = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = data.name;
      });
      setUsersMap(map);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Fetch chats
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "chats"), (snapshot) => {
      const chatList = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((chat) => chat.participants?.includes(user.uid));

      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div
      style={{
        width: "100%",
        borderTop: "1px solid #E5E5EA",
        overflowY: "auto",
      }}
    >
      <h4 style={{ padding: "10px 15px", margin: 0, color: "#6E6E73" }}>
        Chats
      </h4>

      {chats.map((chat) => {
        const otherUserId = chat.participants.find(
          (id) => id !== user.uid
        );

        const otherUserName =
          usersMap[otherUserId] || "Unknown User";

        const unread = chat.unreadCount?.[user.uid] || 0;

        return (
          <div
            key={chat.id}
            onClick={() =>
              setSelectedUser({
                uid: otherUserId,
                chatId: chat.id,
                name: otherUserName,
              })
            }

            // ✅ HOVER EFFECT HERE
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#F0F7FF")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#FFFFFF")
            }

            style={{
              padding: "12px 15px",
              borderBottom: "1px solid #E5E5EA",
              cursor: "pointer",
              background: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* LEFT SIDE */}
            <div>
              {/* 👤 Name */}
              <div style={{ fontWeight: "600", color: "#1C1C1E" }}>
                {otherUserName}
              </div>

              {/* 💬 Last message */}
              <div style={{ fontSize: "12px", color: "#6E6E73" }}>
                {chat.lastMessage || "No messages"}
              </div>
            </div>

            {/* 🔴 UNREAD BADGE */}
            {unread > 0 && (
              <div
                style={{
                  background: "#0A84FF",
                  color: "white",
                  borderRadius: "50%",
                  minWidth: "20px",
                  height: "20px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 6px",
                }}
              >
                {unread}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}