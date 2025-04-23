import React, { useEffect, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import styles from "./GroupInfo.module.css";
import GroupHeader from "../GroupInfo/GroupHeader/GroupHeader";
import GroupActions from "../GroupInfo/GroupActions/GroupActions";
import MembersList from "../GroupInfo/MembersList/MembersList";
import GroupFooter from "../GroupInfo/GroupFooter/GroupFooter";

type GroupInfoProps = {
  groupID: string;
  onClose: () => void;
};

const GroupInfo: React.FC<GroupInfoProps> = ({ groupID, onClose }) => {
  const [group, setGroup] = useState<CometChat.Group | null>(null);
  const [members, setMembers] = useState<CometChat.GroupMember[]>([]);
  const [nonGroupUsers, setNonGroupUsers] = useState<CometChat.User[]>([]);
  const [currentUserUID, setCurrentUserUID] = useState<string | undefined>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const groupData = await CometChat.getGroup(groupID);
        setGroup(groupData);
      } catch (error) {
        console.error("Error fetching group details:", error);
      }
    };

    const fetchMembers = async () => {
      try {
        const membersRequest = new CometChat.GroupMembersRequestBuilder(groupID)
          .setLimit(50)
          .build();

        const memberList = await membersRequest.fetchNext();
        setMembers(memberList);

        const user = await CometChat.getLoggedinUser();
        setCurrentUserUID(user?.getUid());

        const adminCheck = memberList.some(
          (member) =>
            member.getUid() === user?.getUid() && member.getScope() === "admin"
        );
        setIsAdmin(adminCheck);

        // Fetch all users and filter out group members
        const usersRequest = new CometChat.UsersRequestBuilder()
          .setLimit(100)
          .build();

        const allUsers = await usersRequest.fetchNext();
        const filteredUsers = allUsers.filter(
          (user) =>
            !memberList.some((member) => member.getUid() === user.getUid())
        );

        setNonGroupUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching group members:", error);
      }
    };

    fetchGroupDetails();
    fetchMembers();
  }, [groupID]);

  const handleKickMember = async (memberUID: string) => {
    try {
      await CometChat.kickGroupMember(groupID, memberUID);
      setMembers((prevMembers) =>
        prevMembers.filter((member) => member.getUid() !== memberUID)
      );
      console.log(`User ${memberUID} was kicked successfully`);
    } catch (error) {
      console.error("Error kicking member:", error);
    }
  };

  return (
    <div className={styles.groupInfoContainer}>
      <div className={styles.infoContainer}>
        <div className={styles.Heading}>Group info</div>
        <button className={styles.closeButton} onClick={onClose}>
          X
        </button>
      </div>

      {group && (
        <>
          <GroupHeader
            groupIcon={group.getIcon()}
            groupName={group.getName()}
          />
          <GroupActions
            isAdmin={isAdmin}
            members={nonGroupUsers}
            groupId={groupID}
          />
          <MembersList
            members={members}
            isAdmin={isAdmin}
            currentUserUID={currentUserUID}
            onKickMember={handleKickMember}
            groupId={groupID}
          />
          <GroupFooter
            isAdmin={isAdmin}
            onLeaveGroup={() => console.log("Leave group clicked")}
            onDeleteGroup={() => console.log("Delete group clicked")}
            groupId={groupID}
          />
        </>
      )}
    </div>
  );
};

export default GroupInfo;
