import React from "react";
import styles from "./ConversationsList.module.css";
import ConversationItem from "../ConversationItem/ConversationItem";

type ConversationsListProps = {
  conversations: CometChat.Conversation[];
  onSelect: (id: string, isGroup: boolean) => void;
  typingIndicators: { [key: string]: string }; // Store typing user's name
};

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  onSelect,
  typingIndicators,
}) => {
  return (
    <div className={styles.list}>
      {conversations.map((conversation) => {
        const conversationWith = conversation.getConversationWith();
        const isGroup = conversation.getConversationType() === "group";
        const typingUserId = isGroup
          ? (conversationWith as CometChat.Group).getGuid()
          : (conversationWith as CometChat.User).getUid();

        const typingUserName = typingIndicators[typingUserId] || "";

        return (
          <ConversationItem
            key={conversation.getConversationId()}
            conversation={conversation}
            onSelect={() => onSelect(typingUserId, isGroup)}
            isTyping={typingUserName} // Pass name instead of boolean
          />
        );
      })}
    </div>
  );
};

export default ConversationsList;
