import React, { useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "../AddMemberModal/AddMemberModal.module.css";
import defaultAvatar from "../../../../../../assets/avatar.png";

type AddMemberModalProps = {
  groupId: string;
  onClose: () => void;
  onMembersAdded: () => void;
  members: CometChat.User[];
};

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  groupId,
  onClose,
  onMembersAdded,
  members = [], // Default to empty array
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Handle user selection
  const toggleUserSelection = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Add members to the group
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);

    try {
      const membersList = selectedUsers.map(
        (uid) =>
          new CometChat.GroupMember(
            uid,
            CometChat.GROUP_MEMBER_SCOPE.PARTICIPANT
          )
      );

      await CometChat.addMembersToGroup(groupId, membersList, []);
      onMembersAdded();
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalHeading}>Add Members</h3>
        <ul className={styles.userList}>
          {members.map((user) => (
            <li key={user.getUid()} className={styles.userItem}>
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.getUid())}
                onChange={() => toggleUserSelection(user.getUid())}
                className={styles.userCheckbox}
              />
              <img
                src={user.getAvatar() || defaultAvatar}
                alt={user.getName()}
                className={styles.userAvatar}
              />
              <span>{user.getName()}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleAddMembers}
          disabled={loading || selectedUsers.length === 0}
          className={styles.addButton}
        >
          {loading ? "Adding..." : "Add Selected Members"}
        </button>
        <button onClick={handleClose} className={styles.closeButton}>
          Close
        </button>
      </div>
    </div>
  );
};

export default AddMemberModal;
