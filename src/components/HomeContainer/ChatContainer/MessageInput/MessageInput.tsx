import React, { useState, useRef } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "./MessageInput.module.css";
import AttachmentIcon from "../../../../assets/Attachment.png";

type MessageInputProps = {
  receiverID: string;
  isGroup: boolean;
  onMessageSent: (message: CometChat.BaseMessage) => void;
};

const MessageInput: React.FC<MessageInputProps> = ({
  receiverID,
  isGroup,
  onMessageSent,
}) => {
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMediaType = (file: File): string => {
    if (file.type.startsWith("image/")) return CometChat.MESSAGE_TYPE.IMAGE;
    if (file.type.startsWith("video/")) return CometChat.MESSAGE_TYPE.VIDEO;
    if (file.type.startsWith("audio/")) return CometChat.MESSAGE_TYPE.AUDIO;
    return CometChat.MESSAGE_TYPE.FILE;
  };

  const sendTypingIndicator = () => {
    const typingIndicator = new CometChat.TypingIndicator(
      receiverID,
      isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );
    CometChat.startTyping(typingIndicator);
  };

  const stopTypingIndicator = () => {
    const typingIndicator = new CometChat.TypingIndicator(
      receiverID,
      isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );
    CometChat.endTyping(typingIndicator);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    sendTypingIndicator();

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set new timeout to stop typing after 1 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator();
    }, 1000);
  };

  const sendMessage = async () => {
    if (!message.trim() && !mediaFile) return;

    try {
      let sentMessage;

      if (mediaFile) {
        const mediaType = getMediaType(mediaFile);
        const mediaMessage = new CometChat.MediaMessage(
          receiverID,
          mediaFile,
          mediaType,
          isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
        );

        sentMessage = await CometChat.sendMediaMessage(mediaMessage);
        setMediaFile(null);
      } else {
        const textMessage = new CometChat.TextMessage(
          receiverID,
          message,
          isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
        );

        sentMessage = await CometChat.sendMessage(textMessage);
        setMessage("");
        stopTypingIndicator(); // Stop typing when message is sent
      }
      onMessageSent(sentMessage);
    } catch (error) {
      console.error("Message sending failed:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.messageInput}>
      <div className={styles.textInput}>
        <textarea
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={styles.textInput}
          rows={2}
        />
      </div>

      <label className={styles.fileInput}>
        <img src={AttachmentIcon} alt="attachment-icon" />
        <input
          type="file"
          onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
        />
      </label>

      <button className={styles.sendButton} onClick={sendMessage}>
        ➤
      </button>
    </div>
  );
};

export default MessageInput;
