import { CometChat } from "@cometchat/chat-sdk-javascript";
import { CometChatCalls } from "@cometchat/calls-sdk-javascript";
import { APP_ID, APP_SETTINGS, REGION } from "../config";

export const initCometChat = async () => {
  try {
    await CometChat.init(APP_ID, APP_SETTINGS);
    console.log("✅ CometChat initialized successfully");

    const callAppSetting = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(APP_ID)
      .setRegion(REGION)
      .build();

    await CometChatCalls.init(callAppSetting);
    console.log("✅ CometChatCalls initialized successfully");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
  }
};
