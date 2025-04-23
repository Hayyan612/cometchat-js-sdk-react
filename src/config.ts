import { CometChat } from "@cometchat/chat-sdk-javascript";

export const APP_ID = "";
export const REGION = ""; // Your App Region
export const AUTH_KEY = ""; //Used for user creation & authentication
export const API_KEY = ""; // Optional: If needed for API calls

// Default App Settings
export const APP_SETTINGS = new CometChat.AppSettingsBuilder()
  .subscribePresenceForAllUsers()
  .setRegion(REGION)
  .autoEstablishSocketConnection(true)
  .build();
