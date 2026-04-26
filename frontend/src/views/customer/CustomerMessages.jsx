// CustomerMessages.jsx — Conversation list (customer side)
// Smart polling 15s + last message preview + unread badge + search
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import './messages.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)       return 'maintenant';
  if (diff < 3600)     return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)   return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Skeleton row ───────────────────────────────────────────────────────────
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
export default function CustomerMessages() {
  const userData        = UserData();
  const navigate        = useNavigate();

  const [profile,       setProfile]       = useState(null);
  const [conversations, setConversations] = useState([]);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const pollingRef = useRef(null);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.user_id) return;
    apiInstance.get(`user/profile/${userData.user_id}/`)
      .then(r => setProfile(r.data))
      .catch(() => {});
  }, [userData?.user_id]);

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await apiInstance.get('conversations/user/', {
        params: { user_id: userId },
      });
      setConversations(res.data || []);
    } catch {
      setError('Impossible de charger les conversations.');
    }
  }, []);

  useEffect(() => {
    if (!userData?.user_id) { setError('Non connecté.'); setLoading(false); return; }
    fetchConversations(userData.user_id).finally(() => setLoading(false));
  }, [userData?.user_id, fetchConversations]);

  // ── Smart polling: 15s (list doesn't need 1s) ─────────────────────────────
  useEffect(() => {
    if (!userData?.user_id) return;

    const start = () => {
      pollingRef.current = setInterval(() => {
        if (!document.hidden) fetchConversations(userData.user_id);
      }, 15000);
    };
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(pollingRef.current);
      } else {
        fetchConversations(userData.user_id);
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userData?.user_id, fetchConversations]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = conversations.filter(c =>
    (c.vendor_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="msg-page">

      {/* Top bar */}
      <div className="msg-topbar">
        <button className="msg-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <span className="msg-topbar-title">Messages</span>
        <div className="msg-topbar-right" />
      </div>

      {/* Search */}
      <div className="msg-search-wrap">
        <i className="fas fa-search msg-search-icon" />
        <input
          className="msg-search"
          type="text"
          placeholder="Rechercher une boutique…"
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
            <p>{search ? 'Aucun résultat' : 'Aucune conversation'}</p>
            {!search && (
              <span className="msg-empty-hint">
                Visitez une boutique et appuyez sur "Message" pour démarrer.
              </span>
            )}
          </div>
        ) : (
          filtered.map(conv => (
            <Link
              to={`/customer/chat/${conv.id}`}
              key={conv.id}
              className={`msg-conv-row${conv.unread_count > 0 ? ' msg-conv-row--unread' : ''}`}
            >
              {/* Avatar */}
              <div className="msg-avatar-wrap">
                {conv.vendor_image
                  ? <img src={conv.vendor_image} className="msg-avatar" alt={conv.vendor_name} />
                  : <div className="msg-avatar msg-avatar--placeholder">
                      {(conv.vendor_name || '?')[0].toUpperCase()}
                    </div>
                }
              </div>

              {/* Body */}
              <div className="msg-conv-body">
                <div className="msg-conv-head">
                  <span className="msg-conv-name">{conv.vendor_name || 'Boutique'}</span>
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
