import React, { useEffect, useState, useRef, useCallback } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import MessageList from "./MessageList/MessageList";
import MessageInput from "./MessageInput/MessageInput";
import ChatHeader from "./ChatHeader/ChatHeader";
import styles from "./ChatContainer.module.css";

type ChatContainerProps = {
  receiverID: string;
  isGroup: boolean;
  onBack: () => void;
  openThread: (parentMessageId: string) => void;
  onGroupInfoToggle?: () => void;
  onMessageSent: () => void;
  onCallUpdate: (call: CometChat.Call | null) => void;
  onJoinCall: (sessionId: string, authToken: string, callType: string) => void;
};

const ChatContainer: React.FC<ChatContainerProps> = ({
  receiverID,
  isGroup,
  onBack,
  openThread,
  onGroupInfoToggle,
  onMessageSent,
  onCallUpdate,
  onJoinCall,
}) => {
  const [messages, setMessages] = useState<CometChat.BaseMessage[]>([]);
  const [currentUserUID, setCurrentUserUID] = useState<string>("");
  const [chatUserAvatar, setChatUserAvatar] = useState<string>("");
  const [chatUserName, setChatUserName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messageReceipts, setMessageReceipts] = useState<
    Record<string, CometChat.MessageReceipt[]>
  >({});

  const messagesRequestRef = useRef<CometChat.MessagesRequest | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const isFetchingOlder = useRef(false);

  const mergeMessages = (
    existingMessages: CometChat.BaseMessage[],
    newMessages: CometChat.BaseMessage[]
  ) => {
    const messageMap = new Map<string, CometChat.BaseMessage>();
    [...existingMessages, ...newMessages].forEach((message) => {
      messageMap.set(message.getId().toString(), message);
    });
    return Array.from(messageMap.values());
  };

  const fetchMessages = useCallback(
    async (isOlder: boolean = false) => {
      if (!messagesRequestRef.current) return;

      try {
        const messageList = await messagesRequestRef.current.fetchPrevious();
        if (!messageList || messageList.length === 0) {
          setHasMore(false);
          setLoading(false);
        }

        if (messageList.length > 0) {
          const currentTime = Date.now();

          // Apply filtering to keep only relevant messages
          const filteredMessages = messageList.filter(
            (msg) =>
              (!msg.getParentMessageId() && // Exclude thread messages
                ((isGroup &&
                  msg.getReceiverType() === "group" &&
                  msg.getReceiverId() === receiverID) ||
                  (!isGroup &&
                    ((msg.getSender().getUid() === receiverID &&
                      msg.getReceiverId() === currentUserUID) ||
                      (msg.getSender().getUid() === currentUserUID &&
                        msg.getReceiverId() === receiverID))))) ||
              // Include Action Messages
              msg.getCategory() === "action"
          );

          if (filteredMessages.length > 0) {
            const unreadMessages = filteredMessages.filter(
              (message) =>
                message.getSender().getUid() !== currentUserUID &&
                !message.getDeliveredAt()
            );

            if (unreadMessages.length > 0) {
              const lastMessage = unreadMessages[unreadMessages.length - 1];
              await CometChat.markAsDelivered(
                lastMessage.getId().toString(),
                receiverID,
                isGroup ? "group" : "user",
                lastMessage.getSender().getUid()
              );
              // .then(() =>
              //   console.log(
              //     `Message ID ${lastMessage.getId()} marked as delivered successfully.`
              //   )
              // )
              // .catch((error: CometChat.CometChatException) =>
              //   console.error("Error marking message as delivered:", error)
              // );
            }

            const lastMessage = filteredMessages[filteredMessages.length - 1];
            if (
              !isGroup &&
              lastMessage.getSender().getUid() !== currentUserUID
            ) {
              await CometChat.markAsRead(
                lastMessage.getId().toString(),
                receiverID,
                "user",
                lastMessage.getSender().getUid()
              );

              lastMessage.setReadAt(currentTime);
              // console.log("Last fetched message marked as read successfully.");
            }

            const receiptPromises = filteredMessages
              .filter(
                (message) =>
                  message.getSender().getUid() === currentUserUID &&
                  message.getCategory() !== "action" &&
                  message.getCategory() !== "call"
              )
              .map(async (message) => {
                try {
                  const receipts = await CometChat.getMessageReceipts(
                    message.getId()
                  );

                  if (
                    receipts &&
                    Array.isArray(receipts) &&
                    receipts.length > 0
                  ) {
                    setMessageReceipts((prevReceipts) => ({
                      ...prevReceipts,
                      [message.getId().toString()]: receipts,
                    }));

                    receipts.forEach((receipt: CometChat.MessageReceipt) => {
                      if (receipt.getReceiptType() === "read") {
                        message.setReadAt(Number(receipt.getTimestamp()));
                      } else if (receipt.getReceiptType() === "delivered") {
                        message.setDeliveredAt(Number(receipt.getTimestamp()));
                      }
                    });
                  }
                } catch (error) {
                  console.error(
                    "Error fetching receipts for message:",
                    message.getId(),
                    error
                  );
                }
              });

            await Promise.all(receiptPromises);
            // console.log("Message receipts fetched and applied successfully.");

            setMessages((prevMessages) =>
              isOlder
                ? mergeMessages(filteredMessages, prevMessages)
                : mergeMessages(prevMessages, filteredMessages)
            );
          }

          if (!isOlder) scrollToBottom();
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false); // Ensure loading is always turned off
      }
    },
    [currentUserUID, receiverID, isGroup]
  );

  const handleNewMessage = useCallback(
    async (message: CometChat.BaseMessage | CometChat.Call) => {
      try {
        if (message.getParentMessageId()) return;
      } catch (error) {
        console.log("------ error log for ----", error);
      }

      const isMessageForCurrentChat =
        (isGroup &&
          message.getReceiverType() === "group" &&
          message.getReceiverId() === receiverID) ||
        (!isGroup &&
          message.getReceiverType() === "user" &&
          ((message.getSender().getUid() === receiverID &&
            message.getReceiverId() === currentUserUID) ||
            (message.getSender().getUid() === currentUserUID &&
              message.getReceiverId() === receiverID)));

      // Ignore the message if it's not meant for the current chat
      if (!isMessageForCurrentChat) return;

      if (
        !isGroup &&
        message.getSender().getUid() !== currentUserUID &&
        document.hidden
      ) {
        await CometChat.markAsDelivered(
          message.getId().toString(),
          receiverID,
          "user",
          message.getSender().getUid()
        )
          .then(() =>
            console.log(
              `Message ID ${message.getId()} marked as delivered successfully.`
            )
          )
          .catch((error: CometChat.CometChatException) =>
            console.error("Error marking message as delivered:", error)
          );
      }

      if (
        message instanceof CometChat.TextMessage &&
        message.getCategory() === CometChat.CATEGORY_MESSAGE &&
        message.getType() === CometChat.MESSAGE_TYPE.TEXT &&
        "deletedAt" in message
      ) {
        message.setText("This message has been deleted");
      }

      // Add the new message to the list of messages
      setMessages((prevMessages) => mergeMessages(prevMessages, [message]));
      scrollToBottom();
    },
    [receiverID, isGroup, currentUserUID]
  );

  const handleReceiptUpdate = useCallback(
    async (receipt: CometChat.MessageReceipt, status: "delivered" | "read") => {
      console.log("Process ----- READ_MARKED");

      const messageId = receipt.getMessageId().toString();
      const timeStamp = Number(receipt.getTimestamp());

      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (
            message.getId().toString() === messageId &&
            !message.getDeletedAt()
          ) {
            if (status === "read") {
              if (isGroup) {
                // Append reader UID for group messages
                message.setReadAt(timeStamp);
              } else {
                message.setReadAt(timeStamp);
              }
            }
            return message;
          }
          return message;
        })
      );

      // Store message receipts for multiple users in group
      setMessageReceipts((prevReceipts) => {
        const newReceipts = { ...prevReceipts };
        if (!newReceipts[messageId]) {
          newReceipts[messageId] = [];
        }
        newReceipts[messageId].push(receipt);
        return newReceipts;
      });
    },
    [isGroup]
  );

  useEffect(() => {
    const receiptListenerID = `GLOBAL_RECEIPT_`;

    const receiptListener = new CometChat.MessageListener({
      onMessagesRead: (receipt: CometChat.MessageReceipt) => {
        if (receipt.getReceiverType() === "user") {
          handleReceiptUpdate(receipt, "read");
        }
      },
      onMessageDelivered: (receipt: CometChat.MessageReceipt) => {
        if (receipt.getReceiverType() === "user") {
          handleReceiptUpdate(receipt, "delivered");
        }
      },
    });

    // Add the global receipt listener
    CometChat.addMessageListener(receiptListenerID, receiptListener);

    return () => {
      // Remove the global receipt listener
      CometChat.removeMessageListener(receiptListenerID);
    };
  }, [handleReceiptUpdate]);

  // useEffect(() => {
  //   if (!onNewActionMessage) return;

  //   // Trigger handleNewMessage when an action message event occurs
  //   onNewActionMessage();
  // }, [onNewActionMessage]);

  useEffect(() => {
    if (!receiverID) return;

    const listenerID = `CHAT_LISTENER_${receiverID}`;

    setHasMore(true);
    setLoading(true);
    setMessages([]); // Clear messages when switching chats

    messagesRequestRef.current = isGroup
      ? new CometChat.MessagesRequestBuilder()
          .setGUID(receiverID)
          .setLimit(30)
          .hideReplies(true)
          // .setUnread(true)
          .build()
      : new CometChat.MessagesRequestBuilder()
          .setUID(receiverID)
          .setLimit(30)
          .hideReplies(true)
          // .setUnread(true)
          .build();

    fetchMessages();

    const getUserDetails = async () => {
      try {
        if (isGroup) {
          const group = await CometChat.getGroup(receiverID);
          setChatUserAvatar(group.getIcon());
          setChatUserName(group.getName());
        } else {
          const user = await CometChat.getUser(receiverID);
          setChatUserAvatar(user.getAvatar());
          setChatUserName(user.getName());
        }
      } catch (error) {
        console.error("Error fetching user/group details:", error);
      }
    };

    getUserDetails();

    const getUserUID = async () => {
      const user = await CometChat.getLoggedinUser();
      if (user) setCurrentUserUID(user.getUid());
    };

    getUserUID();
    // Call Listener
    const callListenerID = `CALL_LISTENER_${receiverID}`;
    const callListener = new CometChat.CallListener({
      onOutgoingCallStarted: handleNewMessage,
      onOutgoingCallCancelled: handleNewMessage,
      onIncomingCallReceived: handleNewMessage,
      onOutgoingCallAccepted: handleNewMessage,
      onOutgoingCallRejected: handleNewMessage,
      onIncomingCallCancelled: handleNewMessage,
      onIncomingCallEnded: handleNewMessage,
    });
    CometChat.addCallListener(callListenerID, callListener);

    // Message Listener
    const messageListener = new CometChat.MessageListener({
      onTextMessageReceived: handleNewMessage,
      onMediaMessageReceived: handleNewMessage,
      onCustomMessageReceived: handleNewMessage,
      onMessageEdited: (editedMessage: CometChat.TextMessage) => {
        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.map((msg) =>
            msg.getId().toString() === editedMessage.getId().toString()
              ? editedMessage
              : msg
          );

          return updatedMessages;
        });

        scrollToBottom();
      },
      onMessageReactionAdded: async (
        reactionEvent: CometChat.ReactionEvent
      ) => {
        await updateReactions(
          reactionEvent,
          CometChat.REACTION_ACTION.REACTION_ADDED
        );
      },
      onMessageReactionRemoved: async (
        reactionEvent: CometChat.ReactionEvent
      ) => {
        await updateReactions(
          reactionEvent,
          CometChat.REACTION_ACTION.REACTION_REMOVED
        );
      },
      onTextMessageDeleted: (deletedMessage: CometChat.BaseMessage) => {
        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.map((msg) =>
            msg.getId().toString() === deletedMessage.getId().toString()
              ? deletedMessage
              : msg
          );
          return [...updatedMessages]; // Trigger re-render by returning a new array
        });

        scrollToBottom();
      },
      onMediaMessageDeleted: (deletedMessage: CometChat.BaseMessage) => {
        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.map((msg) =>
            msg.getId().toString() === deletedMessage.getId().toString()
              ? deletedMessage
              : msg
          );
          return [...updatedMessages]; // Trigger re-render by returning a new array
        });

        scrollToBottom();
      },
      onMessageDeleted: (message: CometChat.BaseMessage) => {
        console.log("Deleted Message", message);
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.getId() == message.getId()) {
              console.log("entered here");
              return message;
            } else {
              return msg;
            }
          })
        );
      },
    });

    CometChat.addMessageListener(listenerID, messageListener);

    //Remove of Chat MessageListener
    return () => {
      CometChat.removeMessageListener(listenerID);
      CometChat.removeCallListener(callListenerID);
    };
  }, [
    receiverID,
    isGroup,
    fetchMessages,
    handleNewMessage,
    handleReceiptUpdate,
  ]);

  useEffect(() => {
    if (!receiverID || messages.length === 0 || isGroup) return;

    const markMessagesAsRead = async () => {
      try {
        const currentTime = Date.now();
        const unreadMessages = messages.filter(
          (message) =>
            message.getSender().getUid() !== currentUserUID &&
            !message.getReadAt()
        );

        if (unreadMessages.length === 0) return;

        const lastMessage = unreadMessages[unreadMessages.length - 1];

        await CometChat.markAsRead(
          lastMessage.getId().toString(),
          receiverID,
          isGroup ? "group" : "user",
          lastMessage.getSender().getUid()
        );

        unreadMessages.forEach((message) => message.setReadAt(currentTime));
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    };

    const markMessagesAsReadThrottled = setTimeout(() => {
      markMessagesAsRead();
    }, 1000);

    return () => clearTimeout(markMessagesAsReadThrottled);
  }, [messages, receiverID, isGroup, currentUserUID]);

  const loadOlderMessages = async () => {
    if (!messagesRequestRef.current || !hasMore || isFetchingOlder.current)
      return;

    isFetchingOlder.current = true;
    setLoading(true);
    await fetchMessages(true);
    isFetchingOlder.current = false;
  };

  const updateReactions = async (
    reactionEvent: CometChat.ReactionEvent,
    action: CometChat.REACTION_ACTION
  ) => {
    try {
      const reaction = reactionEvent.getReaction();
      const messageId = reaction?.getMessageId();
      if (reaction && messageId) {
        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.map((msg) => {
            if (msg.getId().toString() === messageId.toString()) {
              try {
                const updatedMessage =
                  CometChat.CometChatHelper.updateMessageWithReactionInfo(
                    msg,
                    reaction,
                    action
                  );
                if (updatedMessage instanceof CometChat.BaseMessage) {
                  return Object.assign(
                    Object.create(Object.getPrototypeOf(msg)),
                    updatedMessage
                  );
                } else {
                  console.error("Invalid updated message", updatedMessage);
                  return msg;
                }
              } catch (error) {
                console.error("Error updating message reactions:", error);
                return msg;
              }
            }
            return msg;
          });
          return [...updatedMessages];
        });
      }
    } catch (error) {
      console.error("Error processing reaction event:", error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      // console.log("emoji", emoji);

      await CometChat.addReaction(messageId, emoji);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      await CometChat.removeReaction(messageId, emoji);
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messageListRef.current?.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const handleMessageSent = (
    message: CometChat.BaseMessage | CometChat.Call
  ) => {
    handleNewMessage(message);
    onMessageSent();
  };

  return (
    <div className={styles.chatContainer}>
      <ChatHeader
        onBack={onBack}
        chatUserAvatar={chatUserAvatar}
        chatUserName={chatUserName}
        receiverID={receiverID}
        isGroup={isGroup}
        onGroupInfoToggle={onGroupInfoToggle} // Toggle GroupInfo
        onCallUpdate={onCallUpdate}
        onSendMessage={handleMessageSent}
        onJoinCall={onJoinCall}
      />

      <div
        className={styles.messageList}
        ref={messageListRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0 && hasMore && !loading) {
            loadOlderMessages();
          }
        }}
      >
        {!hasMore && (
          <div className={styles.noMoreMessages}>No previous messages</div>
        )}
        <MessageList
          messages={messages}
          currentUserUid={currentUserUID}
          messageReceipts={messageReceipts}
          onMessageEdited={(editedMessage) => {
            setMessages((prevMessages) => {
              const updatedMessages = prevMessages.map((msg) =>
                msg.getId().toString() === editedMessage.getId().toString()
                  ? editedMessage
                  : msg
              );
              return [...updatedMessages];
            });
          }}
          onReactionAdded={addReaction}
          onReactionRemoved={removeReaction}
          onMessageDeleted={(messageId: string) => {
            setMessages((prevMessages) => {
              const updatedMessages = prevMessages.map((msg) => {
                if (msg.getId().toString() === messageId) {
                  if (msg instanceof CometChat.TextMessage) {
                    msg.setText("This message has been deleted");
                  } else if (msg instanceof CometChat.MediaMessage) {
                    msg.setData({ ...msg.getData(), url: "" });
                  }
                  return msg;
                }
                return msg;
              });
              return [...updatedMessages];
            });
          }}
          openThread={openThread} // Pass the openThread function
          isGroupMessage={isGroup}
          onJoinCall={onJoinCall}
        />
        {loading && <div>Loading...</div>}
      </div>

      <div className={styles.messageInput}>
        <MessageInput
          receiverID={receiverID}
          isGroup={isGroup}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
