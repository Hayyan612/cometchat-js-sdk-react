import React, { useState, useEffect } from "react";
import styles from "./NewConversation.module.css";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import defaultAvatar from "../../../assets/avatar.png";

type NewConversationProps = {
  onClose: () => void;
  onSelectUser: (user: CometChat.User) => void;
};

const NewConversation: React.FC<NewConversationProps> = ({
  onClose,
  onSelectUser,
}) => {
  const [users, setUsers] = useState<CometChat.User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRequest = new CometChat.UsersRequestBuilder()
          .setLimit(30)
          .build();
        const userList = await usersRequest.fetchNext();
        setUsers(userList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to fetch users. Please try again.");
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  //   console.log(users[1].getAvatar());

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Start a New Chat</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✖
          </button>
        </div>
        <div className={styles.userList}>
          {users.map((user) => {
            const avatar = user.getAvatar();
            // const fallbackAvatar = user.getName()
            //   ? user.getName().charAt(0).toUpperCase()
            //   : "?";
            return (
              <div
                key={user.getUid()}
                className={styles.userItem}
                onClick={() => onSelectUser(user)}
              >
                {
                  <img
                    src={avatar || defaultAvatar}
                    alt={user.getName()}
                    className={styles.avatar}
                  />
                }
                <span>{user.getName()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewConversation;
