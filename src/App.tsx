import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import HomeContainer from "./components/HomeContainer/HomeContainer";
import { initCometChat } from "./config/cometChat";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import "./App.css";

const App = () => {
  const [user, setUser] = useState<CometChat.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await initCometChat();
      setLoading(true);

      try {
        const loggedInUser = await CometChat.getLoggedinUser();
        if (loggedInUser) {
          setUser(loggedInUser);
        }
      } catch (error) {
        console.error("Error fetching logged-in user:", error);
      }

      setLoading(false);
    };

    initialize();
  }, []);

  const handleLogout = async () => {
    try {
      await CometChat.logout();
      CometChat.clearActiveCall();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <HomeContainer user={user} onLogout={handleLogout} />
            ) : (
              <Login setUser={setUser} />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
