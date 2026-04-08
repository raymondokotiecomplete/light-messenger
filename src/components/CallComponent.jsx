// components/CallComponent.jsx
import { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";

export default function CallComponent({ user, selectedUser, chatId }) {
  const [inCall, setInCall] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, ringing, connected
  const [incomingCall, setIncomingCall] = useState(null);
  
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

  useEffect(() => {
    if (!chatId) return;
    
    // Listen for incoming calls
    const callRef = doc(db, "calls", chatId);
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();
      if (data && data.to === user.uid && data.status === "calling") {
        setIncomingCall(data);
      }
    });
    
    return () => unsubscribe();
  }, [chatId, user.uid]);

  const startCall = async (isVideo = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      peerConnection.current = new RTCPeerConnection(configuration);
      
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });
      
      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          // Send candidate to other peer via Firestore
          const candidateRef = doc(db, "calls", chatId, "candidates", Date.now().toString());
          setDoc(candidateRef, { candidate: event.candidate, sender: user.uid });
        }
      };
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      // Send offer to other peer
      const callRef = doc(db, "calls", chatId);
      await setDoc(callRef, {
        from: user.uid,
        to: selectedUser.uid,
        offer: offer,
        status: "calling",
        isVideo: isVideo,
        createdAt: serverTimestamp(),
      });
      
      setCallStatus("calling");
      setInCall(true);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };
  
  const acceptCall = async () => {
    // Implementation for accepting call
    setCallStatus("connected");
    setIncomingCall(null);
  };
  
  const rejectCall = async () => {
    const callRef = doc(db, "calls", chatId);
    await deleteDoc(callRef);
    setIncomingCall(null);
  };
  
  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    setInCall(false);
    setCallStatus("idle");
    
    // Delete call document
    const callRef = doc(db, "calls", chatId);
    deleteDoc(callRef);
  };
  
  return (
    <>
      {/* Call buttons in header */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => startCall(false)} style={callButtonStyle}>📞 Audio</button>
        <button onClick={() => startCall(true)} style={callButtonStyle}>📹 Video</button>
      </div>
      
      {/* Incoming call modal */}
      {incomingCall && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>Incoming {incomingCall.isVideo ? "Video" : "Audio"} Call</h3>
            <p>From {selectedUser?.name}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={acceptCall} style={{ ...buttonStyle, background: "#34C759", color: "white" }}>Accept</button>
              <button onClick={rejectCall} style={{ ...buttonStyle, background: "#FF3B30", color: "white" }}>Reject</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Call UI */}
      {inCall && (
        <div style={callUIStyle}>
          <video ref={localVideoRef} autoPlay muted style={localVideoStyle} />
          <video ref={remoteVideoRef} autoPlay style={remoteVideoStyle} />
          <button onClick={endCall} style={endCallButtonStyle}>End Call</button>
          <div style={callStatusStyle}>{callStatus}</div>
        </div>
      )}
    </>
  );
}

const callButtonStyle = {
  background: "#34C759",
  border: "none",
  padding: "8px 16px",
  borderRadius: "20px",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
};

const callUIStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "#000",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const localVideoStyle = {
  position: "absolute",
  bottom: 20,
  right: 20,
  width: "120px",
  borderRadius: "10px",
  border: "2px solid white",
};

const remoteVideoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const endCallButtonStyle = {
  position: "absolute",
  bottom: 30,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#FF3B30",
  border: "none",
  padding: "12px 24px",
  borderRadius: "30px",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
  zIndex: 10,
};

const callStatusStyle = {
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  color: "white",
  background: "rgba(0,0,0,0.5)",
  padding: "5px 15px",
  borderRadius: "20px",
  fontSize: "14px",
};