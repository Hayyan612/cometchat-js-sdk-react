import { useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { AUTH_KEY } from "../../config";
import styles from "./Login.module.css";

type LoginProps = {
  setUser: (user: CometChat.User) => void;
};

const Login = ({ setUser }: LoginProps) => {
  const [uid, setUid] = useState("");

  const handleLogin = async () => {
    try {
      const user = await CometChat.login(uid, AUTH_KEY);
      console.log("Login successful:", user);
      setUser(user);
      localStorage.setItem("cometUser", JSON.stringify(user));
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2>Login</h2>
        <input
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Enter your UID"
        />
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
};

export default Login;
