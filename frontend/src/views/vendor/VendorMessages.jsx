// VendorMessages.jsx — Conversation list (vendor side)
// Smart polling 15s + last message preview + unread badge + search
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import '../customer/messages.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)     return 'maintenant';
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function SkeletonRow() {
  return (
    <div className="msg-conv-row msg-conv-row--skel">
      <div className="msg-skel msg-skel--avatar" />
      <div className="msg-conv-body">
        <div className="msg-skel msg-skel--name" />
        <div className="msg-skel msg-skel--preview" />
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function VendorMessages() {
  const userData  = UserData();
  const navigate  = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const pollingRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    if (!userData?.vendor_id) return;
    try {
      const res = await apiInstance.get('conversations/vendor/', {
        params: { vendor_id: userData.vendor_id },
      });
      setConversations(res.data || []);
    } catch {
      setError('Impossible de charger les conversations.');
    }
  }, [userData?.vendor_id]);

  useEffect(() => {
    if (!userData?.vendor_id) { setError('Compte vendeur introuvable.'); setLoading(false); return; }
    fetchConversations().finally(() => setLoading(false));
  }, [userData?.vendor_id, fetchConversations]);

  // ── Smart polling: 15s ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.vendor_id) return;

    const start = () => {
      pollingRef.current = setInterval(() => {
        if (!document.hidden) fetchConversations();
      }, 15000);
    };
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(pollingRef.current);
      } else {
        fetchConversations();
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userData?.vendor_id, fetchConversations]);

  const filtered = conversations.filter(c =>
    (c.user_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="msg-page">

      {/* Top bar */}
      <div className="msg-topbar">
        <button className="msg-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <span className="msg-topbar-title">Messages clients</span>
        <div className="msg-topbar-right" />
      </div>

      {/* Search */}
      <div className="msg-search-wrap">
        <i className="fas fa-search msg-search-icon" />
        <input
          className="msg-search"
          type="text"
          placeholder="Rechercher un client…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="msg-search-clear" onClick={() => setSearch('')}>
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div className="msg-list">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <div className="msg-error">
            <i className="fas fa-exclamation-circle" />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="msg-empty">
            <i className="fas fa-comment-slash" />
            <p>{search ? 'Aucun résultat' : 'Aucun message client'}</p>
          </div>
        ) : (
          filtered.map(conv => (
            <Link
              to={`/vendor/chat/${conv.id}`}
              key={conv.id}
              className={`msg-conv-row${conv.unread_count > 0 ? ' msg-conv-row--unread' : ''}`}
            >
              {/* Avatar client */}
              <div className="msg-avatar-wrap">
                {conv.profile_image
                  ? <img src={conv.profile_image} className="msg-avatar" alt={conv.user_name} />
                  : <div className="msg-avatar msg-avatar--placeholder">
                      {(conv.user_name || '?')[0].toUpperCase()}
                    </div>
                }
              </div>

              {/* Body */}
              <div className="msg-conv-body">
                <div className="msg-conv-head">
                  <span className="msg-conv-name">{conv.user_name || 'Client'}</span>
                  <span className="msg-conv-time">{relativeTime(conv.last_message_time)}</span>
                </div>
                <div className="msg-conv-foot">
                  <span className="msg-conv-preview">
                    {conv.last_message || 'Nouvelle conversation'}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="msg-unread-badge">{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
