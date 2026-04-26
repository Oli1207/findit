// Register.jsx — Inscription Findit
// Mobile-first · dark theme · zéro Bootstrap
import React, { useState, useEffect } from 'react';
import { register, setAuthUser } from '../../utils/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { GoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';
import apiInstance from '../../utils/axios';
import logo from '../../assets/findit_logoo.png';
import './auth.css';

const Toast = Swal.mixin({
  toast: true, position: 'top',
  showConfirmButton: false, timer: 4000, timerProgressBar: true,
  background: '#1a1a1a', color: '#fff',
});

// ── Password strength ────────────────────────────────────────────
function getStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8)                    score++;
  if (/[A-Z]/.test(pwd))                  score++;
  if (/[0-9]/.test(pwd))                  score++;
  if (/[^A-Za-z0-9]/.test(pwd))           score++;
  return score; // 0–4
}
const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort 🔒'];
const strengthClass = ['', 'weak', 'medium', 'strong', 'strong'];

export default function Register() {
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn()) navigate('/');
  }, [isLoggedIn, navigate]);

  // ── Google OAuth ──────────────────────────────────────────────
  const handleGoogleLogin = async (tokenId) => {
    try {
      const { data } = await apiInstance.post('user/google-login/', { access_token: tokenId });
      if (data.access && data.refresh) {
        setAuthUser(data.access, data.refresh);
        navigate('/');
      }
    } catch {
      Toast.fire({ icon: 'error', title: 'La connexion Google a échoué.' });
    }
  };

  // ── Classic register ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) {
      Toast.fire({ icon: 'warning', title: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (getStrength(password) < 2) {
      Toast.fire({ icon: 'warning', title: 'Votre mot de passe est trop faible.' });
      return;
    }
    setIsLoading(true);
    const { error } = await register(fullName, email, phone, password, password2);
    setIsLoading(false);
    if (error) {
      const msg = typeof error === 'string'
        ? error
        : Object.values(error).flat()[0] || 'Une erreur est survenue.';
      Toast.fire({ icon: 'error', title: msg });
    } else {
      navigate('/');
    }
  };

  const strength = getStrength(password);

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        {/* Logo + headline */}
        <div className="auth-logo-wrap">
          <img src={logo} alt="Findit" className="auth-logo" />
          <span className="auth-emoji">✨</span>
          <h1 className="auth-headline">Bienvenue dans la famille !</h1>
          <p className="auth-subline">
            Créez votre compte en 30 secondes et commencez à vendre ou à dénicher des pépites.
          </p>
        </div>

        {/* Google */}
        <div className="auth-google-wrap">
          <GoogleLogin
            onSuccess={(r) => handleGoogleLogin(r.credential)}
            onError={() => Toast.fire({ icon: 'error', title: 'La connexion Google a échoué.' })}
            theme="filled_black"
            shape="pill"
            text="signup_with"
            locale="fr"
          />
        </div>

        <div className="auth-divider"><span>ou avec vos infos</span></div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Nom complet</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Marie Koné"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Numéro de téléphone</label>
            <input
              className="auth-input"
              type="tel"
              placeholder="+225 07 00 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Mot de passe</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input auth-input--has-icon"
                type={showPwd ? 'text' : 'password'}
                placeholder="Min. 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="auth-eye" onClick={() => setShowPwd((p) => !p)} tabIndex={-1}>
                <i className={`fas fa-${showPwd ? 'eye-slash' : 'eye'}`} />
              </button>
            </div>
            {/* Strength bars */}
            {password && (
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
              className={`auth-input${password2 && password2 !== password ? ' auth-input--error' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={isLoading}>
            {isLoading
              ? <><div className="auth-spinner" /> Création en cours…</>
              : <><i className="fas fa-user-plus" /> Créer mon compte</>
            }
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ?{' '}
          <Link to="/login" className="auth-link">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
