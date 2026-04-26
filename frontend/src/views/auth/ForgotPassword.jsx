// ForgotPassword.jsx — Réinitialisation mot de passe
// Mobile-first · dark theme · zéro Bootstrap
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import logo from '../../assets/findit_logoo.png';
import './auth.css';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return; }
    setLoading(true);
    try {
      await apiInstance.get(`user/password-reset/${email.trim()}`);
      setSent(true);
    } catch {
      setError('Aucun compte associé à cet email. Vérifiez et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <Link to="/login" className="auth-back" aria-label="Retour">
        <i className="fas fa-arrow-left" />
      </Link>

      <div className="auth-card">
        {!sent ? (
          <>
            {/* Header */}
            <div className="auth-logo-wrap">
              <img src={logo} alt="Findit" className="auth-logo" />
              <span className="auth-emoji">😅</span>
              <h1 className="auth-headline">Pas de panique !</h1>
              <p className="auth-subline">
                Ça arrive aux meilleurs d'entre nous. Entrez votre email et on s'occupe du reste.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">Votre email</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoFocus
                  required
                />
                {error && (
                  <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }} />{error}
                  </span>
                )}
              </div>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading
                  ? <><div className="auth-spinner" /> Envoi en cours…</>
                  : <><i className="fas fa-paper-plane" /> Envoyer le lien</>
                }
              </button>
            </form>

            <p className="auth-footer">
              Vous vous souvenez ?{' '}
              <Link to="/login" className="auth-link">Retour à la connexion</Link>
            </p>
          </>
        ) : (
          /* ── Succès ── */
          <>
            <div className="auth-success-box">
              <div className="auth-success-icon">
                <i className="fas fa-envelope-open-text" />
              </div>
              <span className="auth-emoji" style={{ fontSize: 34 }}>📬</span>
              <h2 className="auth-success-title">Email envoyé !</h2>
              <p className="auth-success-sub">
                Vérifiez votre boîte mail — et les spams aussi, on ne sait jamais 😄
                <br /><br />
                Suivez le lien reçu pour créer un nouveau mot de passe.
              </p>
            </div>

            <button
              className="auth-btn"
              style={{ marginTop: 8 }}
              onClick={() => { setSent(false); setEmail(''); }}
            >
              <i className="fas fa-redo" /> Renvoyer un lien
            </button>

            <p className="auth-footer">
              <Link to="/login" className="auth-link">Retour à la connexion</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
