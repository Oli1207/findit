// Chat.jsx — WhatsApp/iMessage-style DM chat
// Polling intelligent: delta fetch (since_id) + Visibility API + 3s interval
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import './chat.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Chat() {
  const userData        = UserData();
  const { conversationId } = useParams();
  const navigate        = useNavigate();
  const location        = useLocation();

  const [conv,       setConv]       = useState(null);  // conversation metadata
  const [messages,   setMessages]   = useState([]);
  const [draft,      setDraft]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [loading,    setLoading]    = useState(true);

  const lastIdRef       = useRef(0);
  const chatEndRef      = useRef(null);
  const inputRef        = useRef(null);
  const pollingRef      = useRef(null);
  const atBottomRef     = useRef(true);

  // ── Determine if customer or vendor ────────────────────────────────────────
  const isVendorView = location.pathname.includes('/vendor/');

  // ── Other party info ────────────────────────────────────────────────────────
  const otherName   = conv ? (isVendorView ? conv.user_name  : conv.vendor_name)  : '…';
  const otherAvatar = conv ? (isVendorView ? conv.profile_image : conv.vendor_image) : null;

  // ── Scroll management ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((force = false) => {
    if (force || atBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  // ── Fetch conversation metadata ────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    apiInstance.get(`conversations/${conversationId}/detail/`, {
      params: { user_id: userData?.user_id },
    }).then(r => setConv(r.data)).catch(() => {});
  }, [conversationId, userData?.user_id]);

  // ── Initial full load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !userData?.user_id) return;
    setLoading(true);
    apiInstance.get(`conversations/${conversationId}/messages/`, {
      params: { user_id: userData.user_id },
    }).then(r => {
      const msgs = r.data;
      setMessages(msgs);
      if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id;
      setLoading(false);
      setTimeout(() => scrollToBottom(true), 80);
    }).catch(() => setLoading(false));
  }, [conversationId, userData?.user_id]);

  // ── Delta polling (since_id) ───────────────────────────────────────────────
  const pollDelta = useCallback(async () => {
    if (!conversationId || !userData?.user_id || document.hidden) return;
    try {
      const res = await apiInstance.get(`conversations/${conversationId}/messages/`, {
        params: { user_id: userData.user_id, since_id: lastIdRef.current },
      });
      const newMsgs = res.data;
      if (!newMsgs.length) return;
      setMessages(prev => {
        // Avoid duplicates (optimistic messages already in state)
        const ids = new Set(prev.map(m => m.id));
        const fresh = newMsgs.filter(m => !ids.has(m.id));
        if (!fresh.length) return prev;
        lastIdRef.current = fresh[fresh.length - 1].id;
        return [...prev, ...fresh];
      });
      setTimeout(() => scrollToBottom(), 50);
    } catch { /* silent */ }
  }, [conversationId, userData?.user_id, scrollToBottom]);

  useEffect(() => {
    if (loading) return;
    // Start polling at 3s (not 1s — much better for server)
    pollingRef.current = setInterval(pollDelta, 3000);

    // Pause when tab hidden, resume on visibility
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(pollingRef.current);
      } else {
        pollDelta(); // immediate fetch when tab regains focus
        pollingRef.current = setInterval(pollDelta, 3000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loading, pollDelta]);

  // ── Send message (optimistic) ──────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);

    // Optimistic bubble
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender: userData.user_id,
      content,
      timestamp: new Date().toISOString(),
      is_read: false,
      _pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await apiInstance.post('messages/send/', {
        user_id: userData.user_id,
        conversation_id: conversationId,
        content,
      });
      const confirmed = res.data;
      setMessages(prev => {
        // Remove temp + any polling-duplicate, then append the confirmed version
        const filtered = prev.filter(m => m.id !== tempId && m.id !== confirmed.id);
        return [...filtered, confirmed];
      });
      lastIdRef.current = Math.max(lastIdRef.current, confirmed.id);
    } catch {
      // Rollback optimistic bubble
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setDraft(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [draft, sending, userData?.user_id, conversationId, scrollToBottom]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ch-page">

      {/* ── Top bar ── */}
      <div className="ch-topbar">
        <button className="ch-back-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <div className="ch-topbar-identity">
          {otherAvatar
            ? <img src={otherAvatar} className="ch-topbar-avatar" alt={otherName} />
            : <div className="ch-topbar-avatar ch-topbar-avatar--placeholder">
                <i className="fas fa-user" />
              </div>
          }
          <div className="ch-topbar-meta">
            <span className="ch-topbar-name">{otherName}</span>
          </div>
        </div>
        <div className="ch-topbar-actions" />
      </div>

      {/* ── Messages area ── */}
      <div className="ch-body" onScroll={handleScroll}>
        {loading ? (
          <div className="ch-loading">
            <i className="fas fa-spinner fa-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="ch-empty">
            <i className="fas fa-comments" />
            <p>Aucun message. Dites bonjour !</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine  = msg.sender === userData?.user_id;
              const showDate = i === 0 || !isSameDay(messages[i - 1].timestamp, msg.timestamp);
              const prevMsg  = i > 0 ? messages[i - 1] : null;
              const nextMsg  = i < messages.length - 1 ? messages[i + 1] : null;
              const isFirst  = !prevMsg || prevMsg.sender !== msg.sender;
              const isLast   = !nextMsg || nextMsg.sender !== msg.sender;

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="ch-date-separator">
                      <span>{fmtDateLabel(msg.timestamp)}</span>
                    </div>
                  )}
                  <div className={`ch-row ${isMine ? 'ch-row--mine' : 'ch-row--theirs'}`}>
                    {/* Avatar côté récepteur */}
                    {!isMine && (
                      <div className="ch-bubble-avatar-wrap">
                        {isLast ? (
                          otherAvatar
                            ? <img src={otherAvatar} className="ch-bubble-avatar" alt="" />
                            : <div className="ch-bubble-avatar ch-bubble-avatar--ph"><i className="fas fa-user" /></div>
                        ) : <div className="ch-bubble-avatar-spacer" />}
                      </div>
                    )}

                    <div className={`ch-bubble-wrap ${isMine ? 'ch-bubble-wrap--mine' : ''}`}>
                      <div className={[
                        'ch-bubble',
                        isMine ? 'ch-bubble--mine' : 'ch-bubble--theirs',
                        isFirst ? (isMine ? 'ch-bubble--tl-mine' : 'ch-bubble--tl-theirs') : '',
                        isLast  ? (isMine ? 'ch-bubble--bl-mine' : 'ch-bubble--bl-theirs') : '',
                        msg._pending ? 'ch-bubble--pending' : '',
                      ].join(' ').trim()}>
                        <p>{msg.content}</p>
                      </div>
                      {isLast && (
                        <div className="ch-bubble-meta">
                          <span className="ch-time">{fmtTime(msg.timestamp)}</span>
                          {isMine && (
                            <span className="ch-read-tick">
                              {msg._pending
                                ? <i className="fas fa-clock" />
                                : msg.is_read
                                  ? <i className="fas fa-check-double ch-tick--read" />
                                  : <i className="fas fa-check" />
                              }
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="ch-inputbar">
        <textarea
          ref={inputRef}
          className="ch-textarea"
          rows={1}
          placeholder="Message…"
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            // Auto-resize
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKey}
        />
        <button
          className={`ch-send-btn${draft.trim() ? ' ch-send-btn--active' : ''}`}
          onClick={sendMessage}
          disabled={!draft.trim() || sending}
          aria-label="Envoyer"
        >
          {sending
            ? <i className="fas fa-spinner fa-spin" />
            : <i className="fas fa-paper-plane" />
          }
        </button>
      </div>
    </div>
  );
}
