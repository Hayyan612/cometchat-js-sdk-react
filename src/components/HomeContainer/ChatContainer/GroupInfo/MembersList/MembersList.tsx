import React from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "../MembersList/MembersList.module.css";

type MemberListProps = {
  members: CometChat.GroupMember[];
  isAdmin: boolean;
  currentUserUID: string | undefined;
  onKickMember: (uid: string) => void;
  groupId: string;
};

const MemberList: React.FC<MemberListProps> = ({
  members,
  isAdmin,
  currentUserUID,
  onKickMember,
  groupId,
}) => {
  const handleKickMember = async (uid: string) => {
    try {
      await CometChat.kickGroupMember(groupId, uid);
      console.log(`User ${uid} kicked successfully`);
      onKickMember(uid);
    } catch (error) {
      console.error("Error kicking user:", error);
    }
  };

  return (
    <div className={styles.membersList}>
      <h3>Members</h3>
      {members.map((member) => (
        <div key={member.getUid()} className={styles.memberItem}>
          <img
            src={member.getAvatar() || "https://via.placeholder.com/40"}
            alt={member.getName()}
            className={styles.memberAvatar}
          />
          <span>{member.getName()}</span>
          {member.getScope() === "admin" && (
            <span className={styles.adminBadge}>Admin</span>
          )}
          {isAdmin && member.getUid() !== currentUserUID && (
            <button
              onClick={() => handleKickMember(member.getUid())}
              className={styles.kickButton}
            >
              ❌ Kick
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default MemberList;
