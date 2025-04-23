import React, { useState } from "react";
import styles from "../GroupActions/GroupActions.module.css";
import PhoneCall from "../../../../../assets/PhoneCall.svg";
import VideoCall from "../../../../../assets/VideoCall.png";
import AddMember from "../../../../../assets/AddUser.png";
import AddMemberModal from "./AddMemberModal/AddMemberModal";

type GroupActionsProps = {
  isAdmin: boolean;
  members: CometChat.User[];
  groupId: string;
};

const GroupActions: React.FC<GroupActionsProps> = ({
  isAdmin,
  members,
  groupId,
}) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  return (
    <div className={styles.actions}>
      <button className={styles.callButton}>
        <img src={PhoneCall} alt="PhoneCall button" />
      </button>
      <button className={styles.callButton}>
        <img src={VideoCall} alt="VideoCall button" />
      </button>
      {isAdmin && (
        <button
          className={styles.addMemberButton}
          onClick={() => setShowAddMemberModal(true)}
        >
          <img src={AddMember} alt="Add Member button" />
        </button>
      )}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          groupId={groupId}
          onMembersAdded={() => setShowAddMemberModal(false)}
          members={members}
        />
      )}
    </div>
  );
};

export default GroupActions;
