import React from "react";
import MessageItem from "../MessageItem/MessageItem";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: CometChat.BaseMessage[];
  currentUserUid: string;
  messageReceipts: Record<string, CometChat.MessageReceipt[]>;
  onMessageEdited: (editedMessage: CometChat.BaseMessage) => void;
  onReactionAdded: (messageId: string, emoji: string) => void;
  onReactionRemoved: (messageId: string, emoji: string) => void;
  onMessageDeleted: (messageId: string, deletedAt: number) => void; // Updated prop for message deletion
  openThread: (parentMessageId: string) => void; // New prop for opening threads
  isGroupMessage: boolean;
  onJoinCall: (sessionId: string, authToken: string, callType: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserUid,
  messageReceipts,
  onMessageEdited,
  onReactionAdded,
  onReactionRemoved,
  onMessageDeleted,
  openThread,
  isGroupMessage,
  onJoinCall,
}) => {
  const handleMessageEdited = (editedMessage: CometChat.BaseMessage) => {
    onMessageEdited(editedMessage);
  };

  return (
    <>
      <div className={styles.messageList}>
        {messages.map((message) => (
          <MessageItem
            key={message.getId()}
            message={message}
            timeStamp={message.getSentAt()}
            isOwnMessage={message.getSender()?.getUid() === currentUserUid}
            messageReceipts={messageReceipts[message.getId().toString()] || []}
            onMessageEdited={handleMessageEdited}
            onReactionAdded={(messageId, emoji) =>
              onReactionAdded(messageId, emoji)
            }
            onReactionRemoved={(messageId, emoji) =>
              onReactionRemoved(messageId, emoji)
            }
            onDelete={(messageId: string, deletedAt: number) =>
              onMessageDeleted(messageId, deletedAt)
            } // Updated to pass deletedAt timestamp
            isGroupMessage={isGroupMessage}
            openThread={openThread}
            onJoinCall={onJoinCall}
          />
        ))}
      </div>
    </>
  );
};

export default MessageList;
