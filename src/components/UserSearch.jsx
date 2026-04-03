import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

const UserSearch = ({ user, setSelectedUser }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);

  // 🔒 Prevent crash if user is not ready yet
  if (!user) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  // 🔥 Real-time users fetch
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
  uid: doc.id, // 🔥 THIS IS THE FIX
  ...doc.data(),
}));

      console.log("Fetched users:", userList); // optional debug

      setUsers(userList);
    });

    return () => unsubscribe();
  }, []);

  // 🔍 Safe filtering
  const filteredUsers = users.filter(
    (u) =>
      u?.uid &&
      u.uid !== user.uid &&
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        width: "250px",
        borderRight: "1px solid #ccc",
        padding: "10px",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* 🔍 Search Input */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "10px",
        }}
      />

      {/* 👥 User List */}
      <div>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              onClick={async () => {
                try {
                  // 🔥 Generate unique chat ID
                  const chatId =
                    user.uid > u.uid
                      ? user.uid + u.uid
                      : u.uid + user.uid;

                  const chatRef = doc(db, "chats", chatId);
                  const chatSnap = await getDoc(chatRef);

                  // 🧠 Create chat if it doesn't exist
                  if (!chatSnap.exists()) {
                    await setDoc(chatRef, {
                      participants: [user.uid, u.uid],
                      createdAt: new Date(),
                    });
                  }

                  // ✅ Set selected user WITH chatId
                  setSelectedUser({ ...u, chatId });
                } catch (error) {
                  console.error("Error creating chat:", error);
                }
              }}
              style={{
                padding: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {u.name || "Unnamed User"}
            </div>
          ))
        ) : (
          <div style={{ padding: "10px", color: "#888" }}>
            No users found
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;