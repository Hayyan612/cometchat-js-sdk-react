import React, { useState, useEffect } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "./ConversationItem.module.css";
import defaultAvatar from "../../../../assets/avatar.png";

type ConversationItemProps = {
  conversation: CometChat.Conversation;
  onSelect: (id: string, isGroup: boolean) => void;
  isTyping: boolean | string;
};

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onSelect,
  isTyping,
}) => {
  const conversationWith = conversation.getConversationWith();
  const lastMessage = conversation.getLastMessage();

  const isGroup = conversation.getConversationType() === "group";

  const conversationName = isGroup
    ? (conversationWith as CometChat.Group).getName()
    : (conversationWith as CometChat.User).getName();

  const conversationAvatar = isGroup
    ? (conversationWith as CometChat.Group).getIcon()
    : (conversationWith as CometChat.User).getAvatar();

  const [isOnline, setIsOnline] = useState(
    !isGroup && (conversationWith as CometChat.User).getStatus() === "online"
  );

  const [lastMessageText, setLastMessageText] = useState("");

  useEffect(() => {
    if (!isGroup) {
      const listenerID = `USER_PRESENCE_${(
        conversationWith as CometChat.User
      ).getUid()}`;

      CometChat.addUserListener(
        listenerID,
        new CometChat.UserListener({
          onUserOnline: (user: CometChat.User) => {
            if (
              user.getUid() === (conversationWith as CometChat.User).getUid()
            ) {
              setIsOnline(true);
            }
          },
          onUserOffline: (user: CometChat.User) => {
            if (
              user.getUid() === (conversationWith as CometChat.User).getUid()
            ) {
              setIsOnline(false);
            }
          },
        })
      );

      return () => {
        CometChat.removeUserListener(listenerID);
      };
    }
  }, [conversationWith, isGroup]);

  useEffect(() => {
    if (lastMessage) {
      const isReply = lastMessage.getParentMessageId();
      if (isReply) {
        // If it's a reply, do not update lastMessageText
        setLastMessageText((prev) => prev || "This is a reply message");
      } else {
        // If it's not a reply, update lastMessageText
        if (lastMessage instanceof CometChat.TextMessage) {
          setLastMessageText(lastMessage.getText());
        } else if (lastMessage instanceof CometChat.MediaMessage) {
          setLastMessageText("Unread Media");
        } else {
          setLastMessageText(`Unread ${lastMessage.getType()}`);
        }
      }
    }
  }, [lastMessage]);

  let lastMessageTimestamp = "";
  if (lastMessage) {
    const messageDate = new Date(lastMessage.getSentAt() * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();

    if (isToday) {
      lastMessageTimestamp = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (isYesterday) {
      lastMessageTimestamp = "Yesterday";
    } else {
      lastMessageTimestamp = messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return (
    <div
      className={styles.conversationItem}
      onClick={() =>
        onSelect(
          isGroup
            ? (conversationWith as CometChat.Group).getGuid()
            : (conversationWith as CometChat.User).getUid(),
          isGroup
        )
      }
    >
      <div className={styles.avatar}>
        <img src={conversationAvatar || defaultAvatar} alt="Avatar" />
        {!isGroup && (
          <div
            className={
              isOnline ? styles.onlineIndicator : styles.offlineIndicator
            }
          />
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.name}>{conversationName}</div>
        <div className={styles.lastMessage}>
          {isTyping && typeof isTyping === "string" ? (
            <span style={{ color: "green", fontStyle: "italic" }}>
              {isTyping}
            </span>
          ) : (
            <>
              {lastMessageText && <span>{lastMessageText}</span>}
              {lastMessageTimestamp && (
                <span className={styles.timestamp}>
                  {" "}
                  {lastMessageTimestamp}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
