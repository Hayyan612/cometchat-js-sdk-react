import React from "react";
import styles from "./GroupEvent.module.css";

type GroupEventProps = {
  events: string[];
};

const GroupEvent: React.FC<GroupEventProps> = ({ events }) => {
  return (
    <div className={styles.groupEventContainer}>
      {events.map((event, index) => (
        <div key={index} className={styles.eventBubble}>
          {event}
        </div>
      ))}
    </div>
  );
};

export default GroupEvent;
