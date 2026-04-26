// LoginModal.jsx — Bottom sheet d'authentification Findit
// Portal · drag-to-close · dark premium · zéro Bootstrap
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { LoginForm } from './Login';
import logo from '../../assets/findit_logoo.png';
import './loginmodal.css';

// onClose  = fermeture sans login (croix, backdrop, ESC, retour)
// onSuccess = connexion réussie (peut être différent de onClose)
export default function LoginModal({ show, onClose, onSuccess }) {
  const sheetRef    = useRef(null);
  const dragY       = useRef(0);
  const startY      = useRef(0);
  const isDragging  = useRef(false);
  const [translateY, setTranslateY] = useState(0);
  const [closing,    setClosing]    = useState(false);

  // ── Fermeture animée ─────────────────────────────────────────
  const closeModal = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setTranslateY(0);
      onClose?.();
    }, 280);
  }, [onClose]);

  // ── ESC ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, closeModal]);

  // ── Scroll lock ───────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  // ── Drag-to-close (touch) ─────────────────────────────────────
  const onTouchStart = (e) => {
    startY.current   = e.touches[0].clientY;
    isDragging.current = true;
  };
  const onTouchMove = (e) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setTranslateY(delta);
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    if (translateY > 120) {
      closeModal();
    } else {
      setTranslateY(0); // snap back
    }
  };

  if (!show) return null;

  return createPortal(
    <div
      className={`lm-overlay${closing ? ' lm-overlay--out' : ''}`}
      onMouseDown={(e) => {
        if (sheetRef.current && !sheetRef.current.contains(e.target)) closeModal();
      }}
    >
      <div
        ref={sheetRef}
        className={`lm-sheet${closing ? ' lm-sheet--out' : ''}`}
        style={{ transform: `translateY(${translateY}px)`, transition: isDragging.current ? 'none' : undefined }}
        role="dialog"
        aria-modal="true"
        aria-label="Connexion"
      >
        {/* ── Drag handle ── */}
        <div
          className="lm-drag-handle"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="lm-drag-bar" />
        </div>

        {/* ── Header ── */}
        <div className="lm-header">
          <div className="lm-header-brand">
            <img src={logo} alt="Findit" className="lm-logo" />
            <span className="lm-header-emoji">👋</span>
            <div>
              <p className="lm-header-title">Content de vous revoir !</p>
              <p className="lm-header-sub">Connectez-vous pour continuer</p>
            </div>
          </div>
          <button className="lm-close" onClick={closeModal} aria-label="Fermer">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* ── Corps — formulaire ── */}
        <div className="lm-body">
          <LoginForm onSuccess={onSuccess ?? closeModal} compact />
        </div>

        {/* ── Footer ── */}
        <div className="lm-footer">
          <p className="lm-footer-text">
            Pas encore de compte ?{' '}
            <Link to="/register" className="lm-footer-link" onClick={closeModal}>
              S'inscrire gratuitement
            </Link>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
