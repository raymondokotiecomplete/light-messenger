import { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,  // ✅ Add this line
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

export default function ChatWindow({ user, selectedUser, onReply, replyToMessage }) {
  const [messages, setMessages] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [showReactions, setShowReactions] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showMessageInfo, setShowMessageInfo] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const bottomRef = useRef(null);
  const messageRefs = useRef({});

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Theme colors
  const theme = {
    background: darkMode ? "#1C1C1E" : "#F5F7FA",
    bubbleMe: darkMode ? "#0A84FF" : "#0A84FF",
    bubbleOther: darkMode ? "#2C2C2E" : "#FFFFFF",
    text: darkMode ? "#FFFFFF" : "#1C1C1E",
    textSecondary: darkMode ? "#8E8E93" : "#6E6E73",
    border: darkMode ? "#38383A" : "#E5E5EA",
  };

  useEffect(() => {
    if (!selectedUser?.chatId) return;

    const q = query(
      collection(db, "chats", selectedUser.chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const msg = { id: docSnap.id, ...docSnap.data() };
        
        // Fetch reactions for this message
        const reactionsRef = collection(db, "reactions", msg.id, "userReactions");
        const reactionsSnapshot = await getDocs(reactionsRef);
        const reactions = {};
        reactionsSnapshot.forEach((reactionDoc) => {
          const data = reactionDoc.data();
          reactions[reactionDoc.id] = data.reaction;
        });
        msg.reactions = reactions;
        
        return msg;
      }));

      setMessages(msgs);

      // Mark messages as seen
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== user.uid && !data.seen) {
          await updateDoc(
            doc(db, "chats", selectedUser.chatId, "messages", docSnap.id),
            { seen: true, seenAt: serverTimestamp() }
          );
        }
      });
    });

    return () => unsubscribe();
  }, [selectedUser?.chatId, user?.uid]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to replied message
  useEffect(() => {
    if (replyToMessage && messageRefs.current[replyToMessage.id]) {
      messageRefs.current[replyToMessage.id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [replyToMessage]);

  const getRepliedMessageContent = (replyToId) => {
    const repliedMsg = messages.find((m) => m.id === replyToId);
    if (!repliedMsg) return null;
    if (repliedMsg.text) return repliedMsg.text;
    if (repliedMsg.file) return "📷 Image";
    if (repliedMsg.audio) return "🎤 Voice message";
    return "Message";
  };

  // ✅ Reply handler
  const handleReplyClick = (msg) => {
    const replyData = {
      id: msg.id,
      text: msg.text || null,
      file: msg.file || null,
      audio: msg.audio || null,
      senderId: msg.senderId,
    };
    if (onReply) onReply(replyData);
  };

  // ✅ Edit message
  const handleEditMessage = async () => {
    if (!editText.trim() || !editingMessage) return;
    
    const messageRef = doc(db, "chats", selectedUser.chatId, "messages", editingMessage.id);
    const editHistoryRef = collection(db, "messageEdits");
    
    await updateDoc(messageRef, {
      text: editText,
      edited: true,
      editedAt: serverTimestamp(),
    });
    
    await addDoc(editHistoryRef, {
      messageId: editingMessage.id,
      oldText: editingMessage.text,
      newText: editText,
      editedBy: user.uid,
      editedAt: serverTimestamp(),
    });
    
    setEditingMessage(null);
    setEditText("");
  };

  // ✅ Delete message
  const handleDeleteMessage = async (msg, forEveryone = true) => {
    if (!forEveryone) {
      // Delete for me only - add a "deleted" flag
      const messageRef = doc(db, "chats", selectedUser.chatId, "messages", msg.id);
      await updateDoc(messageRef, {
        deletedFor: [...(msg.deletedFor || []), user.uid],
      });
    } else {
      // Delete for everyone
      const messageRef = doc(db, "chats", selectedUser.chatId, "messages", msg.id);
      await deleteDoc(messageRef);
    }
  };

  // ✅ Add reaction
  const handleAddReaction = async (msg, reaction) => {
    const reactionRef = doc(db, "reactions", msg.id, "userReactions", user.uid);
    await setDoc(reactionRef, {
      reaction: reaction,
      timestamp: serverTimestamp(),
    });
    setShowReactions(null);
  };

  // ✅ Remove reaction
  const handleRemoveReaction = async (msg) => {
    const reactionRef = doc(db, "reactions", msg.id, "userReactions", user.uid);
    await deleteDoc(reactionRef);
  };

  // ✅ Forward message
  const handleForwardMessage = async (msg, targetUserId) => {
    // This would open a contact selector and send the message
    console.log("Forwarding to:", targetUserId, msg);
    setForwardingMessage(null);
  };

  // ✅ Get message info
  const getMessageInfo = async (msg) => {
    const messageRef = doc(db, "chats", selectedUser.chatId, "messages", msg.id);
    const messageSnap = await getDoc(messageRef);
    const data = messageSnap.data();
    
    let editHistory = [];
    const editsQuery = query(collection(db, "messageEdits"), where("messageId", "==", msg.id));
    const editsSnapshot = await getDocs(editsQuery);
    editsSnapshot.forEach((doc) => editHistory.push(doc.data()));
    
    alert(`
      Sent: ${data.createdAt?.toDate().toLocaleString()}
      Delivered: ${data.deliveredAt?.toDate().toLocaleString() || "Not delivered"}
      Seen: ${data.seenAt?.toDate().toLocaleString() || "Not seen"}
      Edited: ${data.edited ? "Yes" : "No"}
      Edit History: ${editHistory.length} edits
    `);
  };

  if (!selectedUser || !user) {
    return <div style={{ padding: "20px", color: theme.text }}>Select a chat</div>;
  }

  const reactionsList = ["❤️", "👍", "😂", "😮", "😢", "😡"];

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        overflowX: "visible",
        display: "flex",
        flexDirection: "column",
        padding: "15px",
        background: theme.background,
        transition: "background 0.3s",
      }}
    >
      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: theme.bubbleMe,
          border: "none",
          borderRadius: "50%",
          width: 50,
          height: 50,
          fontSize: 24,
          cursor: "pointer",
          zIndex: 100,
          color: "white",
        }}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      {messages.length === 0 && (
        <div style={{ textAlign: "center", color: theme.textSecondary }}>
          No messages yet
        </div>
      )}

      <div style={{ flex: 1, overflowX: "visible" }}>
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const isDeletedForMe = msg.deletedFor?.includes(user.uid);
          const repliedContent = msg.replyTo ? getRepliedMessageContent(msg.replyTo.id || msg.replyTo) : null;
          
          // Count reactions
          const reactionCounts = {};
          if (msg.reactions) {
            Object.values(msg.reactions).forEach(r => {
              reactionCounts[r] = (reactionCounts[r] || 0) + 1;
            });
          }

          if (isDeletedForMe) return null;

          return (
            <div
              key={msg.id}
              ref={(el) => (messageRefs.current[msg.id] = el)}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                marginBottom: "15px",
                position: "relative",
                overflowX: "visible",
              }}
              onMouseEnter={(e) => {
                const actions = e.currentTarget.querySelector(".message-actions");
                if (actions) actions.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const actions = e.currentTarget.querySelector(".message-actions");
                if (actions) actions.style.opacity = "0";
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  background: isMe ? theme.bubbleMe : theme.bubbleOther,
                  color: theme.text,
                  border: isMe ? "none" : `1px solid ${theme.border}`,
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  maxWidth: "70%",
                  marginLeft: isMe ? "auto" : "0",
                  marginRight: isMe ? "0" : "auto",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
              >
                {/* Edit indicator */}
                {msg.edited && (
                  <div style={{ fontSize: "9px", opacity: 0.6, marginBottom: "4px" }}>
                    (edited)
                  </div>
                )}

                {/* Reply indicator */}
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
                    <div style={{ fontSize: "10px", color: theme.textSecondary, marginBottom: "2px" }}>
                      ↪️ Replying to {msg.replyTo.senderId === user.uid ? "yourself" : selectedUser.name}
                    </div>
                    <div style={{ color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {repliedContent}
                    </div>
                  </div>
                )}

                {/* Edit input */}
                {editingMessage?.id === msg.id ? (
                  <div>
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleEditMessage()}
                      style={{ width: "100%", padding: "5px", borderRadius: "8px", border: "1px solid #ccc" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                      <button onClick={handleEditMessage} style={{ fontSize: "12px", padding: "2px 8px" }}>Save</button>
                      <button onClick={() => setEditingMessage(null)} style={{ fontSize: "12px", padding: "2px 8px" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Message text */}
                    {msg.text && <div>{msg.text}</div>}

                    {/* Image */}
                    {msg.file && (
                      <img
                        src={msg.file}
                        alt="message"
                        style={{ maxWidth: "200px", marginTop: "5px", borderRadius: "10px", cursor: "pointer" }}
                        onClick={() => window.open(msg.file, "_blank")}
                      />
                    )}

                    {/* Audio */}
                    {msg.audio && (
                      <audio controls style={{ marginTop: "5px", width: "200px" }}>
                        <source src={msg.audio} type="audio/webm" />
                      </audio>
                    )}
                  </>
                )}

                {/* Reactions display */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                    {Object.entries(reactionCounts).map(([reaction, count]) => (
                      <button
                        key={reaction}
                        onClick={() => msg.reactions?.[user.uid] === reaction ? handleRemoveReaction(msg) : handleAddReaction(msg, reaction)}
                        style={{
                          background: msg.reactions?.[user.uid] === reaction ? "rgba(10,132,255,0.2)" : "rgba(0,0,0,0.05)",
                          border: "none",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        {reaction} {count}
                      </button>
                    ))}
                  </div>
                )}

                {/* Status */}
                {isMe && msg.text && !editingMessage && (
                  <div style={{ fontSize: "10px", textAlign: "right", marginTop: "4px", opacity: 0.6 }}>
                    {msg.seen ? "✓✓ Seen" : msg.deliveredAt ? "✓✓ Delivered" : "✓ Sent"}
                  </div>
                )}
              </div>

              {/* Message actions (visible on hover) */}
              <div
                className="message-actions"
                style={{
                  position: "absolute",
                  ...(isMe ? { left: "-120px" } : { right: "-120px" }),
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  gap: "8px",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  background: theme.bubbleOther,
                  padding: "5px 10px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  zIndex: 20,
                }}
              >
                {/* Reply button */}
                <button onClick={() => handleReplyClick(msg)} style={actionButtonStyle} title="Reply">↩️</button>
                
                {/* React button */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)} style={actionButtonStyle} title="React">😊</button>
                  {showReactions === msg.id && (
                    <div style={reactionPickerStyle}>
                      {reactionsList.map(r => (
                        <button key={r} onClick={() => handleAddReaction(msg, r)} style={{ fontSize: "24px", padding: "8px", cursor: "pointer", background: "none", border: "none" }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Forward button */}
                <button onClick={() => setForwardingMessage(msg)} style={actionButtonStyle} title="Forward">➡️</button>

                {/* Edit button (only for own messages) */}
                {isMe && (
                  <button onClick={() => { setEditingMessage(msg); setEditText(msg.text || ""); }} style={actionButtonStyle} title="Edit">✏️</button>
                )}

                {/* Delete button */}
                <button onClick={() => {
                  if (window.confirm("Delete for everyone?")) {
                    handleDeleteMessage(msg, true);
                  } else if (window.confirm("Delete only for you?")) {
                    handleDeleteMessage(msg, false);
                  }
                }} style={{ ...actionButtonStyle, color: "#FF3B30" }} title="Delete">🗑️</button>

                {/* Info button */}
                <button onClick={() => getMessageInfo(msg)} style={actionButtonStyle} title="Info">ℹ️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forward modal */}
      {forwardingMessage && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalStyle, background: theme.bubbleOther, color: theme.text }}>
            <h3>Forward to...</h3>
            <p>{forwardingMessage.text || "Message"}</p>
            <input
              type="text"
              placeholder="Enter user ID or select from contacts"
              style={{ width: "100%", padding: "8px", margin: "10px 0", borderRadius: "8px", border: `1px solid ${theme.border}` }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setForwardingMessage(null)} style={buttonStyle}>Cancel</button>
              <button onClick={() => handleForwardMessage(forwardingMessage, "targetUserId")} style={{ ...buttonStyle, background: "#0A84FF", color: "white" }}>Forward</button>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

const actionButtonStyle = {
  background: "none",
  border: "none",
  fontSize: "16px",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "50%",
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const reactionPickerStyle = {
  position: "absolute",
  bottom: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#FFFFFF",
  borderRadius: "30px",
  padding: "8px",
  display: "flex",
  gap: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  zIndex: 30,
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  padding: "20px",
  borderRadius: "16px",
  width: "300px",
  maxWidth: "90%",
};

const buttonStyle = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
};