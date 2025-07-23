import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import "./vendormessages.css";
import { SERVER_URL } from "../../utils/constants";

const VendorMessages = () => {
  const userData = UserData();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const axios = apiInstance;
  const navigate = useNavigate();

  const fetchConversations = useCallback(async (currentPage, refresh = false) => {
    setIsFetching(true);
    try {
      const res = await axios.get("conversations/vendor/", {
        params: { vendor_id: userData?.vendor_id, page: currentPage },
      });

      if (refresh) {
        setConversations(res.data);
      } else {
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newConvs = res.data.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newConvs];
        });
      }

      setHasMore(res.data.length > 0);
      setIsFetching(false);
    } catch (err) {
      setError("Erreur chargement conversations");
      setIsFetching(false);
    }
  }, [userData?.vendor_id]);

  useEffect(() => {
    if (userData?.vendor_id) {
      fetchConversations(page);
      setLoading(false);
    } else {
      setError("Aucun vendor_id détecté.");
      setLoading(false);
    }
  }, [userData?.vendor_id, fetchConversations, page]);

  
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 100 &&
      !isFetching && hasMore
    ) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Rafraîchissement toutes les 1s
  useEffect(() => {
    const interval = setInterval(() => {
      if (userData?.vendor_id) {
        fetchConversations(1, true); // recharge page 1
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userData?.vendor_id, fetchConversations]);

  const goBack = () => navigate(-1);

  if (loading) return <div className="loading-text">Chargement…</div>;
  if (error) return <div className="error-text">{error}</div>;

  return (
    <div className="chat-page">
      {/* Top bar */}
      <div className="chat-top-bar">
        <span onClick={goBack} style={{ cursor: "pointer" }}>←</span>
        <h4>Messages clients</h4>
        <div />
      </div>

      {/* Conversations */}
      <div className="chat-content">
        {conversations.length > 0 ? (
          conversations.map((conv) => (
            <Link
              to={`/vendor/chat/${conv.id}`}
              key={conv.id}
              className="conversation-card"
            >
              <img
                src={
                  conv.profile_image
                    ? `${SERVER_URL}${conv.profile_image}`
                    : "/default-avatar.png"
                }
                alt=""
                className="conversation-avatar"
              />
              <div className="conversation-info">
                <h5>{conv.user_name || "Utilisateur inconnu"}</h5>
              </div>
            </Link>
          ))
        ) : (
          <p className="no-msg">Aucune conversation</p>
        )}

        {isFetching && <div className="loading-text">Chargement…</div>}
        {!hasMore && <div className="no-msg">Plus de messages</div>}
      </div>
    </div>
  );
};

export default VendorMessages;
