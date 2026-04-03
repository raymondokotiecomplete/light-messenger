import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  query,
  collection,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

export default function UserList({ user, setSelectedUser }) {
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setChats(chatList);

      // 🔥 Fetch users
      const newUsersMap = {};

      
    for (let chat of chatList) {
  const otherUserId = chat.participants.find(
    id => id !== user.uid
  );

  if (otherUserId && !newUsersMap[otherUserId] && !usersMap[otherUserId]) {
    const userRef = doc(db, "users", otherUserId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      newUsersMap[otherUserId] = userSnap.data();
    }
  }
}

      setUsersMap(prev => ({ ...prev, ...newUsersMap }));
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div style={{ width: "250px", borderRight: "1px solid gray" }}>
      <h3>Chats</h3>

      {chats.map(chat => {
      
  const otherUserId = chat.participants.find(
    id => id !== user.uid
  );

  const otherUser = usersMap[otherUserId];

  const unread = chat.unreadCount?.[user.uid] || 0;

  return (
    <div
      key={chat.id}
      onClick={async () => {
        setSelectedUser(chat);

        const chatRef = doc(db, "chats", chat.id);

        await updateDoc(chatRef, {
          [`unreadCount.${user.uid}`]: 0
        });
      }}
      style={{
        padding: "10px",
        cursor: "pointer",
        borderBottom: "1px solid #ccc",
        display: "flex",
        alignItems: "center"
      }}
    >
      {/* Profile */}
      <img
        src={otherUser?.photoURL || "https://via.placeholder.com/40"}
        width="40"
        style={{ borderRadius: "50%", marginRight: "10px" }}
      />

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div><strong>{otherUser?.name || "Loading..."}</strong></div>
        <small>{chat.lastMessage}</small>
      </div>

      {/* 🔥 UNREAD BADGE */}
      {unread > 0 && (
        <div style={{
          background: "green",
          color: "white",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {unread}
        </div>
      )}
    </div>
  );
})}
</div>   // ✅ THIS WAS MISSING
  );
}