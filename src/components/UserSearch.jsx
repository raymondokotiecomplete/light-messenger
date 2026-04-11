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

  // 🔥 Real-time users fetch with authentication check
  useEffect(() => {
    // ✅ Ensure user is authenticated
    if (!user) {
      console.log('User not authenticated');
      return;
    }
    
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      console.log("Fetched users:", userList);
      setUsers(userList);
    }, (error) => {
      // ✅ Handle permission errors gracefully
      console.error('Firestore error:', error);
      if (error.code === 'permission-denied') {
        console.log('⚠️ Permission denied - check if user is logged in');
      }
    });

    return () => unsubscribe();
  }, [user]); // ✅ Added 'user' as dependency

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
          borderRadius: "8px",
          border: "1px solid #E5E5EA",
          outline: "none",
        }}
      />

      {/* 👥 User List */}
      <div>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div
              key={u.uid}
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
                borderRadius: "8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F2F2F7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ fontWeight: "500" }}>{u.name || "Unnamed User"}</div>
              {u.email && (
                <div style={{ fontSize: "12px", color: "#8E8E93" }}>
                  {u.email}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: "10px", color: "#888", textAlign: "center" }}>
            No users found
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;