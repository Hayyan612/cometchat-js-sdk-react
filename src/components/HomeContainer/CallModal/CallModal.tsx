import { CometChat } from "@cometchat/chat-sdk-javascript";
import { useState, useEffect } from "react";
import styles from "../CallModal/CallModal.module.css";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";

interface CallModalProps {
  activeCall: CometChat.Call | null;
  onCallEnd: () => void;
  callContainerRef: React.RefObject<HTMLDivElement | null>;
  onJoinCall: (call: CometChat.Call) => void;
  // isGroup: boolean;
}

const CallModal: React.FC<CallModalProps> = ({
  activeCall,
  onCallEnd,
  callContainerRef,
  onJoinCall,
  // isGroup,
}) => {
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<CometChat.User | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    if (!activeCall) {
      console.log("No active call detected yet.");
      return;
    }

    const fetchLoggedInUser = async () => {
      const user = await CometChat.getLoggedinUser();
      if (!user) {
        console.error("No logged-in user found");
        return;
      }

      setLoggedInUser(user);

      if (activeCall?.getCallInitiator().getUid() === user.getUid()) {
        setIsInitiator(true);
      }
    };

    fetchLoggedInUser();
  }, [activeCall, onCallEnd]);

  const acceptCall = async () => {
    if (!activeCall) {
      console.error("No active call found.");
      return;
    }

    if (!loggedInUser) {
      console.error("No logged-in user found.");
      return;
    }

    const sessionId = activeCall.getSessionId();
    if (!sessionId) {
      console.error("Missing session ID.");
      return;
    }

    try {
      await CometChat.acceptCall(sessionId);
      // Wait for the DOM update before accessing ref
      setTimeout(() => {
        onJoinCall(activeCall);
        console.log("Call session started successfully.");
        setIsCallAccepted(true);
      }, 100); // Small delay to allow rendering
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const rejectCall = async () => {
    if (!activeCall) return;

    try {
      await CometChat.rejectCall(
        activeCall.getSessionId(),
        CometChat.CALL_STATUS.REJECTED
      );
      console.log("Call rejected");
      onCallEnd();
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const toggleMute = () => {
    if (!activeCall) return;
    const newMuteState = !isMuted;
    CometChatCalls.muteAudio(newMuteState);
    setIsMuted(newMuteState);
  };

  const toggleCamera = () => {
    if (!activeCall) return;
    const newCameraState = !isCameraOff;
    if (newCameraState) {
      CometChatCalls.unPauseVideo();
    }
    CometChatCalls.pauseVideo(newCameraState);
    setIsCameraOff(newCameraState);
  };

  if (!activeCall) return null;

  return (
    <div className={styles.callModalOverlay}>
      <div className={styles.callModal}>
        {!isCallAccepted ? (
          isInitiator ? (
            <>
              <h2>
                Calling:{" "}
                {activeCall.getCallReceiver()
                  ? activeCall.getCallReceiver().getName()
                  : "Unknown"}
              </h2>
              <button className={styles.rejectCallBtn} onClick={rejectCall}>
                Cancel Call
              </button>
            </>
          ) : (
            <>
              <h2>Incoming Call</h2>
              {activeCall.getCallInitiator() && (
                <img
                  src={
                    activeCall.getCallInitiator().getAvatar() ||
                    "https://via.placeholder.com/50"
                  }
                  alt="Caller Avatar"
                  className={styles.callerAvatar}
                />
              )}
              <p>{activeCall.getCallInitiator()?.getName() || "Unknown"}</p>
              <div className={styles.callActions}>
                <button className={styles.acceptCallBtn} onClick={acceptCall}>
                  Accept
                </button>
                <button className={styles.rejectCallBtn} onClick={rejectCall}>
                  Reject
                </button>
              </div>
            </>
          )
        ) : (
          <div className={styles.callContainer} ref={callContainerRef}>
            <h2>Call in Progress</h2>
            <div className={styles.callControls}>
              <button className={styles.controlButton} onClick={toggleMute}>
                {isMuted ? "Unmute 🎤" : "Mute 🔇"}
              </button>
              <button className={styles.controlButton} onClick={toggleCamera}>
                {isCameraOff ? "Turn Camera On 📷" : "Turn Camera Off 🚫"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;
