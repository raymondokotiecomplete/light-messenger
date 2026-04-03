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
  map[doc.id] = data.name; // 🔥 USE doc.id
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
        .filter((chat) =>
          chat.participants?.includes(user.uid)
        );

      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div
      style={{
        width: "100%",
        borderTop: "1px solid #ccc",
      }}
    >
      <h4 style={{ padding: "10px" }}>Chats</h4>

      {chats.map((chat) => {
        const otherUserId = chat.participants.find(
          (id) => id !== user.uid
        );

        const otherUserName =
          usersMap[otherUserId] || "Unknown User";

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
            style={{
              padding: "10px",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
            }}
          >
            {/* ✅ REAL NAME */}
            <div style={{ fontWeight: "bold" }}>
              {otherUserName}
            </div>

            {/* 💬 Last message */}
            <div style={{ fontSize: "12px", color: "#555" }}>
              {chat.lastMessage || "No messages"}
            </div>

            {/* 🔴 Unread */}
            {chat.unreadCount?.[user.uid] > 0 && (
              <span
                style={{
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  padding: "5px",
                  fontSize: "10px",
                }}
              >
                {chat.unreadCount[user.uid]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}