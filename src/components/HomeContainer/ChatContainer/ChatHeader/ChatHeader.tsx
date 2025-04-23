import React, { useState, useEffect } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import styles from "./ChatHeader.module.css";
import avatar from "../../../../assets/avatar.png";
import back from "../../../../assets/back.png";
import PhoneCall from "../../../../assets/PhoneCall.svg";
import VideoCall from "../../../../assets/VideoCall.png";

type ChatHeaderProps = {
  onBack: () => void;
  chatUserAvatar: string;
  chatUserName: string;
  receiverID: string;
  isGroup: boolean;
  onGroupInfoToggle?: () => void;
  onCallUpdate: (call: CometChat.Call | null) => void;
  onSendMessage: (message: CometChat.BaseMessage) => void;
  onJoinCall: (sessionId: string, authToken: string, callType: string) => void;
};

const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBack,
  chatUserAvatar,
  chatUserName,
  receiverID,
  isGroup,
  onGroupInfoToggle,
  onCallUpdate,
  onSendMessage,
  onJoinCall,
}) => {
  const [isTyping, setIsTyping] = useState<string | boolean>(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);

  const formatLastActiveAt = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert to milliseconds
    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();
    const isYesterday =
      new Date(now.setDate(now.getDate() - 1)).toDateString() ===
      date.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleString([], {
        dateStyle: "short",
        timeStyle: "short",
      });
    }
  };
  // Handle Group Call
  const handleGroupCall = async (callTypeStr: string) => {
    try {
      const loggedInUser = await CometChat.getLoggedinUser();
      const callType =
        callTypeStr === "audio"
          ? CometChat.CALL_TYPE.AUDIO
          : CometChat.CALL_TYPE.VIDEO;
      if (!loggedInUser) {
        console.error("User not logged in");
        return;
      }

      const sessionID = `call_${Date.now()}`;
      const authToken = loggedInUser.getAuthToken();

      // Generate call token for the session
      const response = await CometChatCalls.generateToken(sessionID, authToken);
      const callToken = response.token;

      // Send a custom message to the group with session ID
      const customData = {
        sessionID,
        callToken,
        message: "Click to join the call",
        callType,
      };

      onJoinCall(sessionID, authToken, callType);

      const customMessage = new CometChat.CustomMessage(
        receiverID, // Group ID where the message will be sent
        CometChat.RECEIVER_TYPE.GROUP,
        "group_call",
        customData
      );

      customMessage.setSender(loggedInUser);

      const sentMessage = await CometChat.sendMessage(customMessage);
      onSendMessage(sentMessage);
    } catch (error) {
      console.error("Error initiating call:", error);
    }
  };
  //Intiated the Call onClick
  const initiateCall = async (callTypeStr: "audio" | "video") => {
    if (!receiverID) {
      console.error("Receiver ID is missing.");
      return;
    }

    CometChat.clearActiveCall();
    const receiverType = isGroup
      ? CometChat.RECEIVER_TYPE.GROUP
      : CometChat.RECEIVER_TYPE.USER;

    try {
      const callType =
        callTypeStr === "audio"
          ? CometChat.CALL_TYPE.AUDIO
          : CometChat.CALL_TYPE.VIDEO;

      const call = new CometChat.Call(receiverID, callType, receiverType);
      const initiatedCall = await CometChat.initiateCall(call);
      onCallUpdate(initiatedCall);
      onSendMessage(initiatedCall);
      // console.log("Call initiated successfully:", initiatedCall);
    } catch (error) {
      console.error("Call initiation failed:", error);
      alert("Failed to initiate the call. Please try again.");
    }
  };

  useEffect(() => {
    const getStatus = async () => {
      try {
        const user = await CometChat.getUser(receiverID);
        if (user.getStatus() === "online") {
          setIsOnline(true);
          setLastActiveAt(null);
        } else {
          setIsOnline(false);
          const lastActive = user.getLastActiveAt();
          if (lastActive) {
            setLastActiveAt(formatLastActiveAt(lastActive));
          }
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };

    if (!isGroup) {
      getStatus();
    }

    const presenceListenerID = `PRESENCE_LISTENER_${receiverID}`;

    CometChat.addUserListener(
      presenceListenerID,
      new CometChat.UserListener({
        onUserOnline: (onlineUser: CometChat.User) => {
          if (onlineUser.getUid() === receiverID) {
            setIsOnline(true);
            setLastActiveAt(null);
          }
        },
        onUserOffline: (offlineUser: CometChat.User) => {
          if (offlineUser.getUid() === receiverID) {
            setIsOnline(false);
            const lastActive = offlineUser.getLastActiveAt();
            if (lastActive) {
              setLastActiveAt(formatLastActiveAt(lastActive));
            }
          }
        },
      })
    );

    const listenerID = `TYPING_LISTENER${receiverID}`;
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTypingStarted: (typingIndicator: CometChat.TypingIndicator) => {
          if (
            !isGroup &&
            typingIndicator.getReceiverType() === CometChat.RECEIVER_TYPE.USER
          ) {
            setIsTyping("Typing...");
          }
          if (
            isGroup &&
            typingIndicator.getReceiverType() === CometChat.RECEIVER_TYPE.GROUP
          ) {
            const firstName = typingIndicator
              .getSender()
              .getName()
              .split(" ")[0];
            setIsTyping(`${firstName} is typing...`);
          }
        },
        onTypingEnded: (typingIndicator: CometChat.TypingIndicator) => {
          if (
            typingIndicator.getReceiverType() ===
              CometChat.RECEIVER_TYPE.USER ||
            typingIndicator.getReceiverType() === CometChat.RECEIVER_TYPE.GROUP
          ) {
            setIsTyping(false);
          }
        },
      })
    );

    return () => {
      CometChat.removeUserListener(presenceListenerID);
      CometChat.removeMessageListener(listenerID);
    };
  }, [receiverID, isGroup]);

  return (
    <div className={styles.chatHeader}>
      <button className={styles.backButton} onClick={onBack}>
        <img className={styles.backButtonImg} src={back} alt="back-button" />
      </button>
      <img
        src={chatUserAvatar || avatar}
        alt="Avatar"
        className={styles.avatar}
      />
      <div className={styles.chatInfo}>
        <div
          className={styles.name}
          onClick={isGroup ? onGroupInfoToggle : undefined} // Attach click event if it's a group
          style={{ cursor: isGroup ? "pointer" : "default" }} // Change cursor for groups
        >
          {chatUserName}
        </div>
        <div className={styles.status}>
          {isTyping ||
            (!isGroup &&
              (isOnline
                ? "Online"
                : lastActiveAt
                ? `Last seen ${lastActiveAt}`
                : "Offline"))}
        </div>
      </div>
      <div className={styles.callButtons}>
        <button
          className={styles.callButton}
          onClick={() =>
            isGroup ? handleGroupCall("audio") :    initiateCall("audio")
          }
        >
          <img src={PhoneCall} alt="PhoneCall" className={styles.callIcon} />
        </button>
        <button
          className={styles.videoCallButton}
          onClick={() =>
            isGroup ? handleGroupCall("video") : initiateCall("video")
          }
        >
          <img src={VideoCall} alt="VideoCall" className={styles.callIcon} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
