import { useState, useEffect, useRef } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "./MessageItem.module.css";
import inPhone from "../../../../assets/InPhone.png";
import inVid from "../../../../assets/InVid.png";
import outPhone from "../../../../assets/OutPhone.png";
import outVid from "../../../../assets/OutVid.png";

type MessageItemProps = {
  message: CometChat.BaseMessage;
  timeStamp: number;
  isOwnMessage: boolean;
  messageReceipts: CometChat.MessageReceipt[];
  onMessageEdited: (editedMessage: CometChat.BaseMessage) => void;
  onReactionAdded: (messageId: string, emoji: string) => void;
  onReactionRemoved: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string, deletedAt: number) => void;
  openThread: (parentMessageId: string) => void;
  isGroupMessage: boolean;
  onJoinCall: (sessionId: string, authToken: string, callType: string) => void;
};

const REACTIONS = ["😊", "😂", "👍", "❤️", "🔥", "👏", "😘", "😳", "👀", "😜"];

const MessageItem = ({
  message,
  timeStamp,
  isOwnMessage,
  messageReceipts,
  onMessageEdited,
  onReactionAdded,
  onReactionRemoved,
  onDelete,
  openThread,
  isGroupMessage,
  onJoinCall,
}: MessageItemProps) => {
  // State management
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReactionOpen, setIsReactionOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessageText, setEditedMessageText] = useState("");
  const [isDeleted, setIsDeleted] = useState(false);

  // Add reactions state to ensure re-render on changes
  const [reactions, setReactions] = useState(message.getReactions() || []);

  // Refs
  const menuRef = useRef<HTMLDivElement | null>(null);
  const reactionRef = useRef<HTMLDivElement | null>(null);

  const deletedAt = message.getDeletedAt();
  // Initialize message text for editing
  useEffect(() => {
    if (message instanceof CometChat.TextMessage) {
      setEditedMessageText(message.getText());
    }
  }, [message, deletedAt]);

  // Detect if the message has been deleted in real-time and update state accordingly
  const messageId = message.getId();
  useEffect(() => {
    if (deletedAt) {
      setIsDeleted(true); // Mark the message as deleted
      setIsMenuVisible(false); // Hide kebab menu immediately
      setIsMenuOpen(false); // Close the menu if it's open
    }
  }, [messageId, deletedAt]); // Dependencies are now statically checked

  // Update reactions state whenever message reactions change
  useEffect(() => {
    const listenerID = `reactionListener_${messageId}`;

    // Function to update reactions from message
    const updateReactionsFromMessage = () => {
      const currentReactions = message.getReactions() || [];
      setReactions([...currentReactions]);
    };

    // Initial update
    updateReactionsFromMessage();

    // Set up listener for real-time updates
    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onReactionReceived: (reaction: CometChat.Reaction) => {
          if (reaction.getMessageId().toString() === messageId.toString()) {
            updateReactionsFromMessage();
          }
        },
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerID);
    };
  }, [messageId, message]);

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (
        reactionRef.current &&
        !reactionRef.current.contains(event.target as Node)
      ) {
        setIsReactionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // UI Event Handlers
  const toggleMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleReactionMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    setIsReactionOpen(!isReactionOpen);
  };

  // Message Actions
  const handleReactionClick = async (emoji: string) => {
    const messageId = message.getId().toString();
    const currentReactions = [...reactions]; // Clone current reactions

    try {
      // Check if user already reacted with any emoji
      const userReaction = currentReactions.find(
        (reaction) => reaction.getReactedByMe && reaction.getReactedByMe()
      );

      // Case 1: User already reacted with this emoji - remove it
      if (userReaction && userReaction.getReaction() === emoji) {
        // Update local state immediately for responsive UI
        const updatedReactions = currentReactions
          .map((reaction) => {
            if (reaction.getReaction() === emoji) {
              const newCount = Math.max(0, reaction.getCount() - 1);
              reaction.setCount(newCount);
              reaction.setReactedByMe(false);
            }
            return reaction;
          })
          .filter((reaction) => reaction.getCount() > 0);

        // Update local state immediately
        setReactions(updatedReactions);

        // Then update server
        await onReactionRemoved(messageId, emoji);

        // Update message object to keep it in sync
        message.setReactions(updatedReactions);
        onMessageEdited(message);
      }
      // Case 2: User reacted with different emoji - replace it
      else if (userReaction) {
        // Remove old reaction locally
        const filteredReactions = currentReactions
          .map((reaction) => {
            if (reaction.getReaction() === userReaction.getReaction()) {
              const newCount = Math.max(0, reaction.getCount() - 1);
              reaction.setCount(newCount);
              reaction.setReactedByMe(false);
            }
            return reaction;
          })
          .filter((reaction) => reaction.getCount() > 0);

        // Add new reaction locally
        const existingReaction = filteredReactions.find(
          (r) => r.getReaction() === emoji
        );
        if (existingReaction) {
          existingReaction.setCount(existingReaction.getCount() + 1);
          existingReaction.setReactedByMe(true);
        } else {
          filteredReactions.push(new CometChat.ReactionCount(emoji, 1, true));
        }

        // Update local state immediately
        setReactions(filteredReactions);

        // Update server
        await onReactionRemoved(messageId, userReaction.getReaction());
        await onReactionAdded(messageId, emoji);

        // Update message object
        message.setReactions(filteredReactions);
        onMessageEdited(message);
      }
      // Case 3: User has not reacted - add new reaction
      else {
        // Add new reaction locally
        const existingReaction = currentReactions.find(
          (r) => r.getReaction() === emoji
        );
        if (existingReaction) {
          existingReaction.setCount(existingReaction.getCount() + 1);
          existingReaction.setReactedByMe(true);
        } else {
          currentReactions.push(new CometChat.ReactionCount(emoji, 1, true));
        }

        // Update local state immediately
        setReactions([...currentReactions]);

        // Update server
        await onReactionAdded(messageId, emoji);

        // Update message object
        message.setReactions(currentReactions);
        onMessageEdited(message);
      }

      // Close reaction menu after selection
      setIsReactionOpen(false);
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  const handleEditClick = () => {
    if (message instanceof CometChat.TextMessage) {
      setEditedMessageText(message.getText());
      setIsEditing(true);
      setIsMenuOpen(false);
    }
  };

  const handleDeleteClick = () => {
    CometChat.deleteMessage(message.getId().toString())
      .then((deletedMessage) => {
        console.log("Message deleted successfully");
        if (deletedMessage instanceof CometChat.BaseMessage) {
          const deletedAtTime = deletedMessage.getDeletedAt();
          message.setDeletedAt(deletedAtTime); // Set deletion time on sender side
          setIsDeleted(true);
          onMessageEdited(message);
          onDelete(message.getId().toString(), deletedAtTime); // Pass deletedAtTime to parent
        }
        setIsMenuOpen(false);
      })
      .catch((error) => {
        console.log("Message deletion failed with error:", error);
      });
  };

  const saveEditedMessage = () => {
    if (
      message instanceof CometChat.TextMessage &&
      editedMessageText.trim() !== ""
    ) {
      const updatedMessage = new CometChat.TextMessage(
        message.getReceiverId(),
        editedMessageText,
        message.getReceiverType()
      );
      updatedMessage.setId(message.getId());

      CometChat.editMessage(updatedMessage).then(
        (editedMessage) => {
          if (editedMessage instanceof CometChat.TextMessage) {
            message.setText(editedMessage.getText());
            onMessageEdited(editedMessage);
          }
          setIsEditing(false);
        },
        (error) => {
          console.log("Message editing failed with error:", error);
        }
      );
    }
  };

  // Utility functions
  const formatTimeStamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeFormat = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today ${timeFormat}`;
    if (isYesterday) return `Yesterday ${timeFormat}`;

    return (
      date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      timeFormat
    );
  };

  const getMessageStatusIcon = () => {
    if (isGroupMessage || !isOwnMessage || isDeleted || message.getDeletedAt())
      return null;

    if (message.getReadAt()) {
      return (
        <span
          className={`${styles.messageStatus} ${styles.doubleTickRead}`}
          title="Read"
        >
          ✔✔
        </span>
      );
    }

    if (message.getDeliveredAt()) {
      return (
        <span
          className={`${styles.messageStatus} ${styles.doubleTick}`}
          title="Delivered"
        >
          ✔✔
        </span>
      );
    }

    if (messageReceipts?.length > 0) {
      const readReceipt = messageReceipts.find(
        (receipt) => receipt.getReceiptType() === "read"
      );

      if (readReceipt) {
        return (
          <span
            className={`${styles.messageStatus} ${styles.doubleTickRead}`}
            title="Read"
          >
            ✔✔
          </span>
        );
      }

      const deliveredReceipt = messageReceipts.find(
        (receipt) => receipt.getReceiptType() === "delivered"
      );

      if (deliveredReceipt) {
        return (
          <span
            className={`${styles.messageStatus} ${styles.doubleTick}`}
            title="Delivered"
          >
            ✔✔
          </span>
        );
      }
    }

    return (
      <span
        className={`${styles.messageStatus} ${styles.singleTick}`}
        title="Sent"
      >
        ✔
      </span>
    );
  };

  // Get common UI elements
  const messageClass = `${styles.messageItem} ${
    isOwnMessage ? styles.ownMessage : styles.otherMessage
  }`;

  const formattedTime = formatTimeStamp(timeStamp);

  // Render functions
  const renderGroupMessageHeader = () => {
    if (isGroupMessage && !isOwnMessage) {
      const avatarUrl = message.getSender()?.getAvatar();
      const senderName = message.getSender()?.getName();
      return (
        <div className={styles.groupMessageHeader}>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Sender Avatar"
              className={styles.senderAvatar}
            />
          )}
          {senderName && (
            <span className={styles.senderName}>{senderName}</span>
          )}
        </div>
      );
    }
    return null;
  };

  const renderMenuOptions = () => (
    <>
      {isMenuVisible && (
        <div className={styles.kebabMenuButton} onClick={toggleMenu}>
          ⋮
        </div>
      )}
      {isMenuOpen && (
        <div className={styles.kebabMenu} ref={menuRef}>
          <div
            className={styles.menuItem}
            onClick={() => {
              openThread(message.getId().toString());
              setIsMenuOpen(false);
            }}
          >
            Reply
          </div>
          {isOwnMessage && (
            <div className={styles.menuItem} onClick={handleEditClick}>
              Edit
            </div>
          )}
          {isOwnMessage && (
            <div className={styles.menuItem} onClick={handleDeleteClick}>
              Delete
            </div>
          )}
          <div className={styles.menuItem} onClick={toggleReactionMenu}>
            React
          </div>
        </div>
      )}
    </>
  );

  const renderReactionMenu = () =>
    isReactionOpen && (
      <div className={styles.reactionMenu} ref={reactionRef}>
        {REACTIONS.map((emoji) => (
          <span
            key={emoji}
            className={styles.reaction}
            onClick={() => handleReactionClick(emoji)}
          >
            {emoji}
          </span>
        ))}
      </div>
    );

  const renderReactionContainer = () => {
    if (reactions.length === 0) return null;

    return (
      <div className={styles.reactionContainer}>
        {reactions.map((reaction) => (
          <span
            key={reaction.getReaction()}
            className={`${styles.reactionDisplay} ${
              reaction.getReactedByMe && reaction.getReactedByMe()
                ? styles.reactedByMe
                : ""
            }`}
            onClick={() => handleReactionClick(reaction.getReaction())}
          >
            {reaction.getReaction()} ({reaction.getCount()})
          </span>
        ))}
      </div>
    );
  };

  const renderFooter = () => (
    <div className={styles.footer}>
      <span className={styles.dateTime}>{formattedTime}</span>
      {!isDeleted && !message.getDeletedAt() && isOwnMessage && (
        <span className={styles.messageStatus}>{getMessageStatusIcon()}</span>
      )}
    </div>
  );

  // Check if the message is deleted
  if (isDeleted || message.getDeletedAt()) {
    return (
      <div className={messageClass}>
        {renderGroupMessageHeader()}
        <div className={styles.deletedMessage}>
          This message has been deleted
        </div>
        {renderFooter()}
      </div>
    );
  }
  // Render Direct Call Message for Group Calls

  const handleJoinCall = async (sessionId: string) => {
    const loggedInUser = await CometChat.getLoggedInUser();
    const authToken = await loggedInUser.getAuthToken();
    const callType = message.getData().customData.callType;
    if (!authToken) return;
    onJoinCall(sessionId, authToken, callType);
  };
  if (
    message instanceof CometChat.CustomMessage &&
    message.getType() === "group_call"
  ) {
    const customData = message.getData().customData;
    const isSentByMe = isOwnMessage;
    const callType = customData.callType;
    const sessionId = customData.sessionID;

    const icon =
      callType === "audio"
        ? isSentByMe
          ? outPhone
          : inPhone
        : isSentByMe
        ? outVid
        : inVid;

    const label = isSentByMe
      ? `${callType === "audio" ? "Audio" : "Video"} Call Started`
      : `Join ${callType === "audio" ? "Audio" : "Video"} Call`;

    const time = formatTimeStamp(timeStamp);

    return (
      <div className={`${messageClass} ${isSentByMe ? "sent" : "received"}`}>
        {renderGroupMessageHeader()}
        <button
          onClick={() => handleJoinCall(sessionId)}
          className={styles.callMessageBubble}
        >
          <div className={styles.callIcon}>
            <img src={icon} alt="call-icon" />
          </div>
          <span className={styles.callLabel}>{label}</span>
          <span className={styles.messageTime}>{time}</span>
        </button>
      </div>
    );
  }
  // Render Call Message
  if (message instanceof CometChat.Call) {
    const isAudioCall = message.getType() === CometChat.CALL_TYPE.AUDIO;
    const isSentByMe = isOwnMessage;
    const callIcon = isAudioCall
      ? isSentByMe
        ? outPhone
        : inPhone
      : isSentByMe
      ? outVid
      : inVid;

    const callTypeLabel = isAudioCall ? "Audio Call" : "Video Call";
    const callStatus = message.getStatus(); // e.g., "initiated", "ended", "rejected"
    const callTime = formatTimeStamp(timeStamp); // "Today 08:01 PM"

    const callMessageClass = `${styles.callMessage} ${
      isSentByMe ? styles.ownCallMessage : styles.otherCallMessage
    }`;

    return (
      <div
        className={callMessageClass}
        onMouseEnter={() => setIsMenuVisible(true)}
        onMouseLeave={() => setIsMenuVisible(false)}
      >
        <div className={styles.callMessageContent}>
          <img
            src={callIcon}
            alt={`${callTypeLabel} Icon`}
            className={styles.callIcon}
          />
          <div className={styles.callDetails}>
            <div className={styles.callType}>{callTypeLabel}</div>
            <div className={styles.callStatus}>
              {callStatus === CometChat.CALL_STATUS.INITIATED && "Call Started"}
              {callStatus === CometChat.CALL_STATUS.UNANSWERED && "Missed Call"}
              {callStatus === CometChat.CALL_STATUS.REJECTED && "Call Rejected"}
              {callStatus === CometChat.CALL_STATUS.ONGOING && "Ongoing Call"}
              {callStatus === CometChat.CALL_STATUS.ENDED && "Call Ended"}
              {!Object.values(CometChat.CALL_STATUS).includes(callStatus) &&
                "Unknown Status"}
            </div>
            <div className={styles.messageTime}>{callTime}</div>
          </div>
        </div>
      </div>
    );
  }
  // Render Action Message`
  if (
    message instanceof CometChat.Action &&
    message.getAction() !== "edited" &&
    message.getAction() !== "deleted"
  ) {
    return (
      <div
        className={`${styles.messageItem} ${styles.actionMessage}`}
        onMouseEnter={() => setIsMenuVisible(false)}
        onMouseLeave={() => setIsMenuVisible(false)}
      >
        <div className={styles.actionMessageBubble}>{message.getMessage()}</div>
        {renderFooter()}
      </div>
    );
  }

  // Render Text Message
  if (message instanceof CometChat.TextMessage) {
    return (
      <div
        className={messageClass}
        onMouseEnter={() => setIsMenuVisible(true)}
        onMouseLeave={() => setIsMenuVisible(false)}
      >
        {renderGroupMessageHeader()}
        {renderMenuOptions()}
        {renderReactionMenu()}

        {isEditing ? (
          <div className={styles.editMessageContainer}>
            <input
              type="text"
              value={editedMessageText}
              onChange={(e) => setEditedMessageText(e.target.value)}
              className={styles.editMessageInput}
            />
            <button onClick={saveEditedMessage} className={styles.saveButton}>
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.textMessage}>{message.getText()}</div>
        )}

        {renderFooter()}
        {renderReactionContainer()}
        {message.getReplyCount() > 0 && (
          <div
            className={styles.replyCount}
            onClick={() => openThread(message.getId().toString())}
          >
            {`${message.getReplyCount()} replies `}
          </div>
        )}
      </div>
    );
  }

  // Render Media Message
  if (message instanceof CometChat.MediaMessage) {
    const attachment = message.getAttachment();
    const mediaUrl = attachment?.getUrl();
    const mediaType = message.getType();

    if (!mediaUrl) return null;

    const renderMediaContent = () => {
      switch (mediaType) {
        case CometChat.MESSAGE_TYPE.IMAGE:
          return (
            <>
              <div className={styles.mediaContainer}>
                <img
                  src={mediaUrl}
                  alt="Sent media"
                  className={styles.mediaImage}
                  onClick={() => setPreviewImage(mediaUrl)}
                />
              </div>
              {previewImage && (
                <div
                  className={styles.imagePreviewOverlay}
                  onClick={() => setPreviewImage(null)}
                >
                  <div className={styles.imagePreview}>
                    <img src={previewImage} alt="Preview" />
                  </div>
                </div>
              )}
            </>
          );

        case CometChat.MESSAGE_TYPE.VIDEO:
          return (
            <div className={styles.mediaContainer}>
              <video controls className={styles.mediaVideo}>
                <source src={mediaUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          );

        case CometChat.MESSAGE_TYPE.AUDIO:
          return (
            <div className={styles.mediaContainer}>
              <audio controls className={styles.mediaAudio}>
                <source src={mediaUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </div>
          );

        case CometChat.MESSAGE_TYPE.FILE:
          return (
            <div className={styles.mediaContainer}>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.fileLink}
              >
                Download File
              </a>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div
        className={messageClass}
        onMouseEnter={() => setIsMenuVisible(true)}
        onMouseLeave={() => setIsMenuVisible(false)}
      >
        {renderMenuOptions()}
        {renderReactionMenu()}
        {renderMediaContent()}
        {renderFooter()}
        {renderReactionContainer()}
      </div>
    );
  }

  return null; // Fallback for unsupported message types
};

export default MessageItem;
