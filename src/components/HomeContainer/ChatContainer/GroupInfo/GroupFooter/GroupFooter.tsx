import React from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import leavIcon from "../../../../../assets/LeaveIcon.png";
import deleteIcon from "../../../../../assets/DeleteIcon.png";
import styles from "./GroupFooter.module.css";

interface GroupFooterProps {
  isAdmin: boolean;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  groupId: string;
}

const GroupFooter: React.FC<GroupFooterProps> = ({
  isAdmin,
  onLeaveGroup,
  onDeleteGroup,
  groupId,
}) => {
  const handleLeaveGroup = async () => {
    try {
      await CometChat.leaveGroup(groupId);
      console.log("Successfully left the group");
      onLeaveGroup(); // Notify parent component
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  return (
    <div className={styles.groupFooter}>
      <button className={styles.leaveButton} onClick={handleLeaveGroup}>
        <img src={leavIcon} alt="Leave-Icon" className={styles.buttonIcon} />
        Leave Group
      </button>
      {isAdmin && (
        <button className={styles.deleteButton} onClick={onDeleteGroup}>
          <img src={deleteIcon} alt="" className={styles.buttonIcon} />
          Delete Group
        </button>
      )}
    </div>
  );
};

export default GroupFooter;
