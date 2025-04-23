import { useEffect, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import ConversationsList from "./ConversationsList/ConversationsList"; // Import ConversationsList
import ConversationsHeader from "./ConversationsHeader/ConversationsHeader";
import styles from "./ConversationsContainer.module.css";

type ConversationsContainerProps = {
  user: CometChat.User;
  onSelect: (id: string, isGroup: boolean) => void;
  onLogout: () => void;
  onStartNewChat: () => void;
  triggerUpdate: boolean;
};

const ConversationsContainer = ({
  user,
  onSelect,
  onLogout,
  onStartNewChat,
  triggerUpdate,
}: ConversationsContainerProps) => {
  const [conversations, setConversations] = useState<CometChat.Conversation[]>(
    []
  );
  const [typingIndicators, setTypingIndicators] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const fetchConversations = async () => {
      const conversationRequest = new CometChat.ConversationsRequestBuilder()
        .setLimit(30)
        .build();

      try {
        const list = await conversationRequest.fetchNext();
        setConversations(list);
      } catch (error) {
        console.error("❌ Error fetching conversations:", error);
      }
    };

    fetchConversations();
  }, [user, triggerUpdate]);

  useEffect(() => {
    const listenerID = "ConversationListener";

    CometChat.addMessageListener(
      listenerID,
      new CometChat.MessageListener({
        onTextMessageReceived: (message: CometChat.TextMessage) => {
          // console.log("📥 Message received:", message);
          updateConversation(message);
        },
        onMediaMessageReceived: (message: CometChat.MediaMessage) => {
          // console.log("📥 Media message received:", message);
          updateConversation(message);
        },
        onCustomMessageReceived: (message: CometChat.CustomMessage) => {
          // console.log("📥 Custom message received:", message);
          updateConversation(message);
        },
        onMessageSent: (message: CometChat.BaseMessage) => {
          // console.log("📤 Message sent:", message);
          updateConversation(message);
        },
        onTypingStarted: (typingIndicator: CometChat.TypingIndicator) => {
          const receiverId = typingIndicator.getReceiverId();
          const receiverType = typingIndicator.getReceiverType();
          const senderName = typingIndicator
            .getSender()
            .getName()
            .split(" ")[0];

          setTypingIndicators((prev) => {
            const newIndicators = { ...prev };

            if (receiverType === "group") {
              newIndicators[receiverId] = `${senderName} is typing...`;
            } else {
              const typingUserId = typingIndicator.getSender().getUid();
              newIndicators[typingUserId] = "Typing..."; // Show only "Typing..." for individual chats
            }

            return newIndicators;
          });
        },

        onTypingEnded: (typingIndicator: CometChat.TypingIndicator) => {
          const receiverId = typingIndicator.getReceiverId();
          const receiverType = typingIndicator.getReceiverType();

          setTypingIndicators((prev) => {
            const newIndicators = { ...prev };

            if (receiverType === "group") {
              delete newIndicators[receiverId];
            } else {
              const typingUserId = typingIndicator.getSender().getUid();
              delete newIndicators[typingUserId];
            }

            return newIndicators;
          });
        },
      })
    );

    return () => {
      CometChat.removeMessageListener(listenerID);
    };
  }, [conversations]);

  const updateConversation = (message: CometChat.BaseMessage) => {
    // console.log("🔄 Updating conversation for message:", message);

    const conversationID = message.getConversationId();
    if (!conversationID) return;

    setConversations((prevConversations) => {
      const existingConversationIndex = prevConversations.findIndex(
        (conv) => conv.getConversationId() === conversationID
      );

      if (existingConversationIndex > -1) {
        const updatedConversations = [...prevConversations];
        updatedConversations[existingConversationIndex].setLastMessage(message);

        const [updatedConversation] = updatedConversations.splice(
          existingConversationIndex,
          1
        );
        updatedConversations.unshift(updatedConversation);

        return updatedConversations;
      } else {
        return prevConversations;
      }
    });
  };

  return (
    <div className={styles.conversationsContainer}>
      <ConversationsHeader
        user={user}
        onLogout={onLogout}
        onStartNewChat={onStartNewChat}
      />

      <ConversationsList
        conversations={conversations}
        onSelect={onSelect}
        typingIndicators={typingIndicators} // Now contains sender's name
      />
    </div>
  );
};

export default ConversationsContainer;
