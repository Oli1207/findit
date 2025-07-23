import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import { SERVER_URL } from "../../utils/constants";
import "../vendor/vendormessages.css";

const CustomerMessages = () => {
  const userData = UserData();
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const axios = apiInstance;
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await axios.get(`user/profile/${userData?.user_id}/`);
      setProfile(res.data);
      return res.data;
    } catch (err) {
      setError("Erreur chargement profil");
      setLoading(false);
    }
  }, [userData?.user_id]);

  const fetchConversations = useCallback(async (userId, currentPage) => {
    setIsFetching(true);
    try {
      const res = await axios.get("conversations/user/", {
        params: { user_id: userId, page: currentPage },
      });
      if (currentPage === 1) {
        // Remplace toute la liste si c'est un refresh auto
        setConversations(res.data);
        console.log(res.data)
      } else {
        // Sinon pour le scroll infini, ajoute uniquement les nouvelles
        setConversations((prev) => {
          const existingIds = new Set(prev.map(c => c.id));
          const newConvs = res.data.filter(c => !existingIds.has(c.id));
          return [...prev, ...newConvs];
        });
      }
      setHasMore(res.data.length > 0);
      setIsFetching(false);
    } catch (err) {
      setError("Erreur chargement conversations");
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    const loadEverything = async () => {
      const userProfile = await fetchUserProfile();
      if (userProfile?.id) await fetchConversations(userProfile.id, page);
      setLoading(false);
    };
    if (userData?.user_id) loadEverything();
    else {
      setError("Aucun user_id détecté.");
      setLoading(false);
    }
  }, [userData?.user_id, fetchUserProfile, fetchConversations, page]);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 100 &&
      !isFetching &&
      hasMore
    ) {
      setPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Rafraîchissement automatique toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (userData?.user_id && profile?.id) {
        fetchConversations(profile.id, 1); // reload page 1
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userData?.user_id, profile?.id, fetchConversations]);

  const goBack = () => navigate(-1);

  if (loading) return <div className="loading-text">Chargement…</div>;
  if (error) return <div className="error-text">{error}</div>;

  return (
    <div className="chat-page">

      {/* Top bar */}
      <div className="chat-top-bar">
        <span onClick={goBack} style={{ cursor: "pointer" }}>←</span>
        <h4>Mes Messages</h4>
        <div />
      </div>

      {/* Conversations */}
      <div className="chat-content">
        {conversations.length > 0 ? (
          conversations.map((conv) => (
            <Link
              to={`/customer/chat/${conv.id}`}
              key={conv.id}
              className="conversation-card"
            >
              <img
                src={
                  conv.vendor_image
                    ? `${SERVER_URL}${conv.vendor_image}`
                    : "/default-avatar.png"
                }
                alt=""
                className="conversation-avatar"
              />
              <div className="conversation-info">
                <h5>{conv.vendor_name || "Boutique inconnue"}</h5>
              </div>
            </Link>
          ))
        ) : (
          <p className="no-msg">Aucune conversation</p>
        )}

        {/* {isFetching && <div className="loading-text">Chargement…</div>} */}
        {!hasMore && <div className="no-msg">Plus de messages</div>}
      </div>
    </div>
  );
};

export default CustomerMessages;
