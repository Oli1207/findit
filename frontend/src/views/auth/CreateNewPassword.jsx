// CreateNewPassword.jsx — Nouveau mot de passe
// Mobile-first · dark theme · zéro Bootstrap
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import apiInstance from '../../utils/axios';
import logo from '../../assets/findit_logoo.png';
import './auth.css';

function getStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^A-Za-z0-9]/.test(pwd))  score++;
  return score;
}
const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort 🔒'];
const strengthClass = ['', 'weak', 'medium', 'strong', 'strong'];

export default function CreateNewPassword() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [otp,         setOtp]         = useState('');
  const [uidb64,      setUidb64]      = useState('');
  const [resetToken,  setResetToken]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [done,        setDone]        = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setOtp(q.get('otp') || '');
    setUidb64(q.get('uidb64') || '');
    setResetToken(q.get('reset_token') || '');
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (getStrength(newPassword) < 2) {
      setError('Votre mot de passe est trop faible.');
      return;
    }
    setLoading(true);
    try {
      await apiInstance.post('user/password-reset-confirm/', {
        otp, uidb64, reset_token: resetToken, new_password: newPassword,
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré. Recommencez depuis le début.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(newPassword);

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        {!done ? (
          <>
            <div className="auth-logo-wrap">
              <img src={logo} alt="Findit" className="auth-logo" />
              <span className="auth-emoji">🔐</span>
              <h1 className="auth-headline">Nouveau départ !</h1>
              <p className="auth-subline">
                Choisissez un mot de passe solide — votre compte mérite la meilleure protection.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">Nouveau mot de passe</label>
                <div className="auth-input-wrap">
                  <input
                    className="auth-input auth-input--has-icon"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 8 caractères"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    autoFocus
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPwd((p) => !p)} tabIndex={-1}>
                    <i className={`fas fa-${showPwd ? 'eye-slash' : 'eye'}`} />
                  </button>
                </div>
                {newPassword && (
                  <>
                    <div className="auth-strength">
                      {[1,2,3,4].map((n) => (
                        <div
                          key={n}
                          className={`auth-strength-bar${strength >= n ? ` auth-strength-bar--${strengthClass[strength]}` : ''}`}
                        />
                      ))}
                    </div>
                    <span className="auth-strength-label">{strengthLabel[strength]}</span>
                  </>
                )}
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirmer le mot de passe</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                  required
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#ef4444', margin: '0', textAlign: 'center' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{error}
                </p>
              )}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading
                  ? <><div className="auth-spinner" /> Enregistrement…</>
                  : <><i className="fas fa-check" /> Enregistrer le mot de passe</>
                }
              </button>
            </form>
          </>
        ) : (
          /* ── Succès ── */
          <div className="auth-success-box">
            <div className="auth-success-icon">
              <i className="fas fa-check" />
            </div>
            <span className="auth-emoji" style={{ fontSize: 36 }}>🎉</span>
            <h2 className="auth-success-title">C'est fait !</h2>
            <p className="auth-success-sub">
              Votre mot de passe a été mis à jour avec succès.<br />
              Vous allez être redirigé vers la connexion dans quelques secondes…
            </p>
            <Link to="/login" className="auth-link" style={{ marginTop: 8 }}>
              → Se connecter maintenant
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
