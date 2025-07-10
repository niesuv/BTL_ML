import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import CreateUserPage from "./pages/CreateUserPage";
import GroupPage from "./pages/GroupListPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-user" element={<CreateUserPage />} />
        <Route path="/groups" element={<GroupPage />} />
        <Route path="/chats" element={<ChatPage />} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
