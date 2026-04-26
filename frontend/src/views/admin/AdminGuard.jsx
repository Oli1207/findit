// AdminGuard.jsx
// - Appelle setUser() pour peupler le store (bypasse MainWrapper)
// - Vérifie que l'user a un AdminProfile actif via /api/v1/admin/me/
// - Affiche AdminLayout si ok, écran refusé sinon
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../../utils/auth';
import { useAuthStore } from '../../store/auth';
import apiInstance from '../../utils/axios';
import AdminLayout from './AdminLayout';
import './admin.css';

export default function AdminGuard() {
  const isLoggedIn  = useAuthStore((s) => s.isLoggedIn);
  const navigate    = useNavigate();
  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'denied' | 'unauth'
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => {
    (async () => {
      // 1. Initialiser le store auth (cookies → store Zustand)
      await setUser();

      // 2. Vérifier la connexion
      if (!isLoggedIn()) {
        setState('unauth');
        return;
      }

      // 3. Vérifier les droits admin
      try {
        const { data } = await apiInstance.get('admin/me/');
        setAdminProfile(data);
        setState('ok');
      } catch {
        setState('denied');
      }
    })();
  }, []); // eslint-disable-line

  // ── Loading ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        fontFamily: 'Poppins, sans-serif',
      }}>
        <div className="adm-spinner" />
        <p style={{ color: '#444', fontSize: 13 }}>Vérification des droits…</p>
      </div>
    );
  }

  // ── Non connecté → redirect login ────────────────────────────────
  if (state === 'unauth') {
    navigate('/login');
    return null;
  }

  // ── Accès refusé ─────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0a0a0a',
        fontFamily: 'Poppins, sans-serif',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '0 24px', textAlign: 'center',
      }}>
        <i className="fas fa-shield-alt" style={{ fontSize: 52, color: '#ef4444', opacity: 0.5 }} />
        <h2 style={{ color: '#f0f0f0', fontSize: 22, fontWeight: 800 }}>Accès refusé</h2>
        <p style={{ color: '#555', fontSize: 14, maxWidth: 300 }}>
          Vous n'avez pas les droits pour accéder au panel administrateur.
          Contactez un superadmin pour obtenir les permissions nécessaires.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 8, background: '#DF468F', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px 24px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <i className="fas fa-home" style={{ marginRight: 8 }} />
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // ── Accès accordé ────────────────────────────────────────────────
  return <AdminLayout adminProfile={adminProfile} />;
}
