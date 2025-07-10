import { ArrowLeftOutlined } from "@ant-design/icons";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { backendUrl, socketUrl } from "../../http/api";
import { getCookie } from "../../utils/cookies";
import EditPopup from "./EditPopUp";
import MessageBubble, { type Message } from "./MessageBubble";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [firstUnreadId, setFirstUnreadId] = useState<number | null>(null);
  const [editMsg, setEditMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketSendRef = useRef<WebSocket | null>(null);
  const socketRecvRef = useRef<WebSocket | null>(null);

  const token = getCookie("token");
  const username = getCookie("username");
  const groupId = getCookie("group");
  const groupName = getCookie("group_name");
  const headers = { Authorization: `Bearer ${token}` };
  const [userLang, setUserLang] = useState("en"); // mặc định
  console.log("11" + userLang);

  const navigate = useNavigate();
  useEffect(() => {
    if (!token || !username || !groupId) {
      console.warn("Missing credentials:", { token, username, groupId });
      return;
    }

    fetch(`${backendUrl}/user/me`, { headers })
      .then((res) => res.json())
      .then((user) => {
        setUserLang(user.language || "en");
      })
      .catch(handleLogout);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${backendUrl}/group/${groupId}/messages`, {
          headers,
        });
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        setMessages([]);
      }
    };

    const fetchFirstUnreadId = async () => {
      try {
        const res = await fetch(
          `${backendUrl}/message/${groupId}/first-unread-message`,
          { headers }
        );
        if (!res.ok) throw new Error("No unread");
        const data = await res.json();
        setFirstUnreadId(data);
      } catch {
        setFirstUnreadId(null);
      }
    };

    fetchMessages();
    fetchFirstUnreadId();

    socketSendRef.current = new WebSocket(
      `${socketUrl}/send-message?token=${token}&group_id=${groupId}`
    );
    socketRecvRef.current = new WebSocket(
      `${socketUrl}/get-unread-messages?token=${token}&group_id=${groupId}`
    );

    socketRecvRef.current.onmessage = () => {
      fetchMessages();
      fetchFirstUnreadId();
    };

    return () => {
      socketSendRef.current?.close();
      socketRecvRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (firstUnreadId && chatRef.current) {
      const el = document.getElementById(`msg-${firstUnreadId}`);
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      message.trim() &&
      socketSendRef.current?.readyState === WebSocket.OPEN
    ) {
      socketSendRef.current.send(message);
      setMessage("");
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${backendUrl}/message/${id}`, {
      method: "DELETE",
      headers,
    });
  };

  const handleEdit = (msg: Message) => {
    setEditMsg(msg);
    setEditText(msg.text ?? msg.message_text ?? "");
  };

  const handleConfirmEdit = async () => {
    if (editMsg) {
      await fetch(
        `${backendUrl}/message/${editMsg.id}?changed_message=${editText}`,
        { method: "PUT", headers }
      );
      setEditMsg(null);
    }
  };

  const handleLogout = () => {
    ["username", "token", "group", "group_name"].forEach((k) => {
      document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    window.location.href = "/";
  };

  const handleBack = () => navigate("/groups");

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 sticky top-0 z-10 shadow-md p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full shadow text-xl"
          >
            <ArrowLeftOutlined />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{groupName}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 font-medium"
        >
          Logout
        </button>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" ref={chatRef}>
        {messages.map((msg) => (
          <MessageBubble
            userLang={userLang}
            key={msg.id}
            msg={msg}
            username={username}
            isUnread={msg.id === firstUnreadId}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-3 px-6 py-3 border-t bg-white/80 backdrop-blur-md"
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow"
        />
        <button
          type="submit"
          className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-md"
        >
          Send
        </button>
      </form>

      {editMsg && (
        <EditPopup
          text={editText}
          onTextChange={setEditText}
          onCancel={() => setEditMsg(null)}
          onSave={handleConfirmEdit}
        />
      )}
    </div>
  );
}
