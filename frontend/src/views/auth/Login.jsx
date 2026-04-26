// Login.jsx — Connexion Findit
// Deux modes : page standalone OU contenu injecté dans LoginModal
import React, { useState, useEffect } from 'react';
import { login, setAuthUser } from '../../utils/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { GoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';
import apiInstance from '../../utils/axios';
import logo from '../../assets/findit_logoo.png';
import './auth.css';

const Toast = Swal.mixin({
  toast: true, position: 'top',
  showConfirmButton: false, timer: 3500, timerProgressBar: true,
  background: '#1a1a1a', color: '#fff',
});

// ── Formulaire réutilisable (page + modal) ────────────────────────
export function LoginForm({ onSuccess, compact = false }) {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async (tokenId) => {
    try {
      const { data } = await apiInstance.post('user/google-login/', { access_token: tokenId });
      if (data.access && data.refresh) {
        setAuthUser(data.access, data.refresh);
        onSuccess ? onSuccess() : navigate('/');
      }
    } catch {
      Toast.fire({ icon: 'error', title: 'La connexion Google a échoué.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await login(email, password);
    if (error) {
      Toast.fire({ icon: 'error', title: 'Email ou mot de passe incorrect.' });
      setIsLoading(false);
    } else {
      setEmail(''); setPassword('');
      onSuccess ? onSuccess() : navigate('/');
    }
  };

  return (
    <div className={compact ? 'auth-form-compact' : ''}>
      {/* En-tête du formulaire */}
      {!compact && (
        <div className="auth-logo-wrap">
          <img src={logo} alt="Findit" className="auth-logo" />
          <span className="auth-emoji">👋</span>
          <h1 className="auth-headline">Content de vous revoir !</h1>
          <p className="auth-subline">
            Connectez-vous pour retrouver vos trouvailles et continuer à vendre.
          </p>
        </div>
      )}

      {compact && (
        <p className="auth-modal-tagline">
          Connectez-vous pour continuer sur Findit
        </p>
      )}

      {/* Google */}
      <div className="auth-google-wrap" style={{ marginBottom: compact ? 16 : undefined }}>
        <GoogleLogin
          onSuccess={(r) => handleGoogleLogin(r.credential)}
          onError={() => Toast.fire({ icon: 'error', title: 'La connexion Google a échoué.' })}
          theme="filled_black"
          shape="pill"
          text="continue_with"
          locale="fr"
          width={compact ? 280 : undefined}
        />
      </div>

      <div className="auth-divider"><span>ou avec votre email</span></div>

      <form className="auth-form" onSubmit={handleSubmit}>
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
          <label className="auth-label">Mot de passe</label>
          <div className="auth-input-wrap">
            <input
              className="auth-input auth-input--has-icon"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="button" className="auth-eye" onClick={() => setShowPwd((p) => !p)} tabIndex={-1}>
              <i className={`fas fa-${showPwd ? 'eye-slash' : 'eye'}`} />
            </button>
          </div>
        </div>

        <div className="auth-forgot">
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </div>

        <button className="auth-btn" type="submit" disabled={isLoading}>
          {isLoading
            ? <><div className="auth-spinner" /> Connexion…</>
            : <><i className="fas fa-sign-in-alt" /> Se connecter</>
          }
        </button>
      </form>

      <p className="auth-footer">
        Pas encore de compte ?{' '}
        <Link to="/register" className="auth-link">Créer un compte gratuit</Link>
      </p>
    </div>
  );
}

// ── Page standalone ───────────────────────────────────────────────
export default function Login({ onSuccess }) {
  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn()) onSuccess ? onSuccess() : navigate('/');
  }, [isLoggedIn]); // eslint-disable-line

  // Si utilisé dans un modal (onSuccess fourni), on rend juste le formulaire
  if (onSuccess) {
    return <LoginForm onSuccess={onSuccess} compact />;
  }

  // Sinon : page complète
  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />
      <div className="auth-card">
        <LoginForm />
      </div>
    </div>
  );
}
