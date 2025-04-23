import React, { useState, useEffect, useCallback } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "./ThreadContainer.module.css";

type ThreadContainerProps = {
  parentMessageId: string;
  receiverID: string;
  isGroup: boolean;
  closeThread: () => void;
};

const ThreadContainer: React.FC<ThreadContainerProps> = ({
  parentMessageId,
  receiverID,
  isGroup,
  closeThread,
}) => {
  const [threadMessages, setThreadMessages] = useState<CometChat.BaseMessage[]>(
    []
  );
  const [messageText, setMessageText] = useState("");

  const fetchThreadMessages = useCallback(async () => {
    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setParentMessageId(Number(parentMessageId))
      .setLimit(30)
      .build();

    try {
      const messages = await messagesRequest.fetchPrevious();
      setThreadMessages(messages);
    } catch (error) {
      console.error("Failed to fetch thread messages:", error);
    }
  }, [parentMessageId]);

  useEffect(() => {
    fetchThreadMessages();

    const listenerID = "ThreadMessageListener_" + parentMessageId;

    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message: CometChat.TextMessage) => {
          if (message.getParentMessageId().toString() === parentMessageId) {
            setThreadMessages((prevMessages) => [...prevMessages, message]);
          }
        },
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerID);
    };
  }, [parentMessageId, fetchThreadMessages]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    const textMessage = new CometChat.TextMessage(
      receiverID,
      messageText,
      isGroup ? CometChat.RECEIVER_TYPE.GROUP : CometChat.RECEIVER_TYPE.USER
    );
    textMessage.setParentMessageId(Number(parentMessageId));

    try {
      const message = await CometChat.sendMessage(textMessage);
      setThreadMessages((prevMessages) => [...prevMessages, message]);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className={styles.threadContainer}>
      <div className={styles.threadHeader}>
        <h2>Thread</h2>
        <button onClick={closeThread}>x</button>
      </div>
      <div className={styles.threadMessages}>
        {threadMessages.map((message) => {
          const sender = message.getSender();
          const name = sender ? sender.getName() : "Unknown User";
          const isReceived = sender?.getUid() === receiverID;

          return (
            <div
              key={message.getId()}
              className={`${styles.messageBubble} ${
                isReceived ? styles.received : styles.sent
              }`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.senderName}>{name}</span>
              </div>
              <div>
                {message instanceof CometChat.TextMessage
                  ? message.getText()
                  : "[Non-text message]"}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.messageInputContainer}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Reply to this thread..."
          className={styles.messageInput}
        />
        <button onClick={sendMessage} className={styles.sendButton}>
          ➤
        </button>
      </div>
    </div>
  );
};

export default ThreadContainer;
