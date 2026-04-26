// Logout.jsx — Déconnexion Findit
// Mobile-first · dark theme · zéro Bootstrap
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { logout } from '../../utils/auth';
import logo from '../../assets/findit_logoo.png';
import './auth.css';

export default function Logout() {
  useEffect(() => { logout(); }, []);

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo-wrap">
          <img src={logo} alt="Findit" className="auth-logo" />
        </div>

        <span className="auth-emoji" style={{ fontSize: 52 }}>👋</span>

        <h1 className="auth-headline" style={{ marginBottom: 10 }}>
          À bientôt !
        </h1>
        <p className="auth-subline" style={{ marginBottom: 28 }}>
          Votre session est fermée. Vos trouvailles préférées vous attendent pour la prochaine fois.
          <br /><br />
          <span style={{ fontSize: 18 }}>Prenez soin de vous 🌸</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/login" className="auth-btn" style={{ textDecoration: 'none' }}>
            <i className="fas fa-sign-in-alt" /> Se reconnecter
          </Link>
          <Link to="/register" className="auth-btn-ghost" style={{ textDecoration: 'none' }}>
            <i className="fas fa-user-plus" /> Créer un compte
          </Link>
          <Link to="/" className="auth-btn-ghost" style={{ textDecoration: 'none' }}>
            <i className="fas fa-home" /> Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
