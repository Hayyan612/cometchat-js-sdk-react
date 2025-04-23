import { useRef, useState, useEffect } from "react";
import ConversationsContainer from "./ConversationsContainer/ConversationsContainer";
import ChatContainer from "./ChatContainer/ChatContainer";
import NewConversation from "./NewConversation/NewConversation";
import ThreadContainer from "./ThreadContainer/ThreadContainer";
import GroupInfo from "../../components/HomeContainer/ChatContainer/GroupInfo/GroupInfo";
import CallModal from "../HomeContainer/CallModal/CallModal"; // Import CallModal
import styles from "./HomeContainer.module.css";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";

interface HomeContainerProps {
  user: CometChat.User;
  onLogout: () => void;
}

const HomeContainer = ({ user, onLogout }: HomeContainerProps) => {
  const callContainerRef = useRef<HTMLDivElement>(null);
  const [isCallScreen, setIsCallScreen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string>(""); // State to manage selected chat
  const [isGroup, setIsGroup] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false); // State to control NewConversation visibility
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null); // New state to manage active thread
  const [showGroupInfo, setShowGroupInfo] = useState(false); // New state for GroupInfo visibility
  const [triggerUpdate, setTriggerUpdate] = useState(false);
  const [activeCall, setActiveCall] = useState<CometChat.Call | null>(null);
  const [directCall, setDirectCall] = useState<boolean>(false);

  const handleMessageSent = () => {
    setTriggerUpdate((prev) => !prev); // Toggle state to trigger re-render
  };

  const handleCallEnded = async () => {
    if (activeCall) {
      console.log("Ending call Receiver Side");
      const sessionId = activeCall.getSessionId();

      try {
        await CometChat.endCall(sessionId);
        await CometChat.clearActiveCall();
        CometChatCalls.endSession();
      } catch (error) {
        console.error("Error ending call:", error);
      }
    } else {
      console.log("Ending call Initiator Side");
      CometChat.clearActiveCall();
      CometChatCalls.endSession();
    }

    setActiveCall(null);
    setIsCallScreen(false);
  };

  const handleCallUpdate = async (call: CometChat.Call | null) => {
    setActiveCall(call);
  };

  useEffect(() => {
    const listenerID = "GLOBAL_GROUP_LISTENER";

    CometChat.addGroupListener(
      listenerID,
      new CometChat.GroupListener({
        onGroupMemberJoined: (message: CometChat.BaseMessage) => {
          console.log("User joined", message);
        },
        onMemberAddedToGroup: (message: CometChat.BaseMessage) => {
          console.log("User added", message);
        },
        onMemberRemovedFromGroup: (message: CometChat.BaseMessage) => {
          console.log("User removed", message);
        },
        onGroupMemberKicked: (message: CometChat.BaseMessage) => {
          console.log("User kicked", message);
        },
        onGroupMemberBanned: (message: CometChat.BaseMessage) => {
          console.log("User banned", message);
        },
        onGroupMemberUnbanned: (message: CometChat.BaseMessage) => {
          console.log("User unbanned", message);
        },
        onGroupMemberLeft: (message: CometChat.BaseMessage) => {
          console.log("User left", message);
        },
      })
    );

    //  ----- LISTENER FOR CALLS ------
    const callListenerID = "GLOBAL_CALL_LISTENER";

    CometChat.addCallListener(
      callListenerID,
      new CometChat.CallListener({
        onIncomingCallReceived: (call: CometChat.Call) => {
          setActiveCall(call);
        },
        onOutgoingCallAccepted: async (call: CometChat.Call) => {
          setIsCallScreen(true);
          setTimeout(() => {
            handleJoinDefaultCall(call);
          }, 100);
          setActiveCall(call);
        },
        onOutgoingCallRejected: () => {
          CometChat.clearActiveCall();
          setActiveCall(null);
        },
        onIncomingCallCancelled: () => {
          console.log("Incoming call cancelled");
          CometChat.clearActiveCall();
          setActiveCall(null);
        },
        onCallEnded: async (call: CometChat.Call) => {
          console.log("Call ended", call);

          try {
            await CometChat.endCall(call.getSessionId());
            await CometChat.clearActiveCall();
            CometChatCalls.endSession();
          } catch (error) {
            console.error("Error clearing call session:", error);
          }

          setIsCallScreen(false);
          setActiveCall(null);
        },
      })
    );

    return () => {
      CometChat.removeGroupListener(listenerID);
      CometChat.removeCallListener(callListenerID);
    };
  });

  const handleStartNewChat = (user: CometChat.User) => {
    setSelectedChat(user.getUid());
    setIsGroup(false);
    setShowNewConversation(false);
  };

  const openThread = (parentMessageId: string) => {
    // Function to open thread
    setActiveThreadId(parentMessageId);
  };

  const closeThread = () => {
    // Function to close thread
    setActiveThreadId(null);
  };
  // Function to Join Default Call
  const handleJoinDefaultCall = async (call: CometChat.Call) => {
    const loggedInUser = await CometChat.getLoggedinUser();
    const sessionId = call.getSessionId();

    const authToken = loggedInUser?.getAuthToken();
    if (!authToken) return;

    const res = await CometChatCalls.generateToken(sessionId, authToken);
    if (!res?.token) return;
    if (!callContainerRef.current) {
      console.error("Call container reference is still null.");
      return;
    }

    const callSettings = new CometChatCalls.CallSettingsBuilder()
      .enableDefaultLayout(true)
      .setIsAudioOnlyCall(call.getType() === CometChat.CALL_TYPE.AUDIO)
      .setCallListener(
        new CometChatCalls.OngoingCallListener({
          onCallEnded: () => {
            handleCallEnded();
          },
          onError: (error) => console.error("Call error:", error),
          onUserJoined: (user) => console.log("User joined:", user),
          onUserLeft: (user) => console.log("User left:", user),
        })
      )
      .build();

    CometChatCalls.startSession(
      res.token,
      callSettings,
      callContainerRef.current
    );
    console.log("Call session started successfully.");
  };
  // Function to handle the end of direct call
  const onEndDirectCall = async () => {
    await CometChatCalls.endSession();
    setDirectCall(false);
  };

  // Function to handle the join call action for direct calls
  const handleJoinDirectCall = async (
    sessionID: string,
    authToken: string,
    callType: string
  ) => {
    const res = await CometChatCalls.generateToken(sessionID, authToken);
    if (!res?.token) return;

    setTimeout(() => {
      if (!callContainerRef.current) {
        console.error("Call container reference is still null.");
        return;
      }

      const callSettings = new CometChatCalls.CallSettingsBuilder()
        .enableDefaultLayout(true)
        .setIsAudioOnlyCall(callType === CometChat.CALL_TYPE.AUDIO)
        .setCallListener(
          new CometChatCalls.OngoingCallListener({
            onCallEndButtonPressed: () => {
              onEndDirectCall();

              // console.log("Call ended by someone");
            },
            onError: (error) => console.error("Call error:", error),
            onUserJoined: (user) => console.log("User joined:", user),
            onUserLeft: (user) => console.log("User left:", user),
          })
        )
        .build();
      CometChatCalls.startSession(
        res.token,
        callSettings,
        callContainerRef.current
      );
    }, 100);
    setIsCallScreen(true);
    setDirectCall(true);
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.conversationsContainer}>
        <ConversationsContainer
          user={user}
          onSelect={(id, group) => {
            setSelectedChat(id);
            setIsGroup(group);
            setShowGroupInfo(false);
          }}
          onLogout={onLogout}
          onStartNewChat={() => setShowNewConversation(true)} // Trigger the NewConversation component
          triggerUpdate={triggerUpdate} // Pass triggerUpdate to ConversationsContainer
        />
      </div>
      <div className={styles.chatContainer}>
        {selectedChat ? (
          <ChatContainer
            receiverID={selectedChat}
            isGroup={isGroup}
            onBack={() => {
              setSelectedChat("");
              setShowGroupInfo(false);
            }}
            openThread={openThread} // Pass the function to open a thread
            onGroupInfoToggle={() => setShowGroupInfo((prev) => !prev)}
            onMessageSent={handleMessageSent}
            onCallUpdate={handleCallUpdate}
            onJoinCall={handleJoinDirectCall}
          />
        ) : (
          <div className={styles.noChatSelected}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
      {showNewConversation && (
        <NewConversation
          onClose={() => setShowNewConversation(false)}
          onSelectUser={handleStartNewChat} // Handle user selection
        />
      )}
      {activeThreadId && (
        <div className={styles.threadContainer}>
          <ThreadContainer
            parentMessageId={activeThreadId}
            receiverID={selectedChat!}
            isGroup={isGroup}
            closeThread={closeThread}
          />
        </div>
      )}
      {isGroup && showGroupInfo && (
        <div className={styles.groupInfoContainer}>
          <GroupInfo
            groupID={selectedChat}
            onClose={() => setShowGroupInfo(false)}
          />
        </div>
      )}
      {(activeCall || directCall) && isCallScreen ? (
        <div className={styles.callContainer} ref={callContainerRef}>
          <div className={styles.callControls}>
            <button className={styles.endCallBtn} onClick={handleCallEnded}>
              End Call ❌
            </button>
          </div>
        </div>
      ) : activeCall ? (
        <>
          <CallModal
            activeCall={activeCall}
            onCallEnd={handleCallEnded}
            callContainerRef={callContainerRef}
            onJoinCall={handleJoinDefaultCall}
          />
        </>
      ) : null}
    </div>
  );
};

export default HomeContainer;
