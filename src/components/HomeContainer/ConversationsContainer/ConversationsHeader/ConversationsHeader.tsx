import React, { useState, useRef, useEffect } from "react";
import styles from "./ConversationsHeader.module.css";
import avatar from "../../../../assets/avatar.png";
import newChatIcon from "../../../../assets/NewChat.png";
import threeDotIcon from "../../../../assets/ThreeDot.png";

type ConversationsHeaderProps = {
  user: CometChat.User;
  onLogout: () => void;
  onStartNewChat: () => void;
};

const ConversationsHeader: React.FC<ConversationsHeaderProps> = ({
  user,
  onLogout,
  onStartNewChat,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current !== event.target
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => setShowMenu((prev) => !prev);

  return (
    <div className={styles.header}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <img
            src={user.getAvatar() || avatar}
            alt="User Avatar"
            className={styles.avatarImage}
          />
        </div>
        <span>{user.getName() || "User Name"}</span>
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.newChatButton}
          onClick={onStartNewChat}
          aria-label="Start New Chat"
        >
          <img src={newChatIcon} alt="new-chat-icon" />
        </button>
        <div className={styles.menuWrapper}>
          <button
            ref={buttonRef}
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="More Options"
          >
            <img src={threeDotIcon} alt="three-dot-icon" />
          </button>
          {showMenu && (
            <div className={styles.popupMenu} ref={menuRef}>
              <button className={styles.menuItem} onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsHeader;
