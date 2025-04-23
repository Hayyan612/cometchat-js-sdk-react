import React from "react";
import styles from "../GroupHeader/GroupHeader.module.css";

type GroupHeaderProps = {
  groupIcon: string;
  groupName: string;
};

const GroupHeader: React.FC<GroupHeaderProps> = ({ groupIcon, groupName }) => {
  return (
    <div className={styles.groupHeader}>
      <img
        src={groupIcon || "/default-group-icon.png"}
        alt="Group Icon"
        className={styles.groupIcon}
      />
      <h3>{groupName}</h3>
    </div>
  );
};

export default GroupHeader;
