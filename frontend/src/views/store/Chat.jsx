import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import "./chat.css";

const Chat = () => {
  const userData = UserData();
  const { conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const axios = apiInstance;

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`conversations/${conversationId}/messages/`, {
        params: { user_id: userData?.user_id },
      });
      setMessages(res.data.reverse());
      scrollToBottom();
    } catch (err) {
      console.error("Erreur messages", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await axios.post("messages/send/", {
        user_id: userData?.user_id,
        conversation_id: conversationId,
        content: newMessage,
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Erreur envoi", err);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  // Rafraîchissement automatique toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 1000);
    return () => clearInterval(interval);
  }, [conversationId]);

  return (
    <div className="chat-page">
      {/* Top bar */}
      <div className="chat-top-bar">
        <span onClick={() => navigate(-1)} style={{ cursor: "pointer", color: 'black' }}>←</span>
        <h4>Chat</h4>
        <div />
      </div>

      {/* Messages */}
      <div className="chat-content">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`bubble ${msg.sender === userData.user_id ? "self" : "other"}`}
            >
              <p>{msg.content}</p>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
          ))
        ) : (
          <p className="no-msg">Aucune conversation</p>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="Message..."
          value={newMessage}
          style={{color:'black'}}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
};

export default Chat;
