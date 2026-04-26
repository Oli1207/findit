// PrivateRoute.jsx
// Affiche le contenu si connecté.
// Sinon : écran "accès requis" + modal login en overlay.
// L'utilisateur peut revenir en arrière (navigate(-1)) sans jamais être redirigé brutalement.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import LoginModal from '../views/auth/LoginModal';

export default function PrivateRoute({ children }) {
  const isLoggedIn         = useAuthStore((s) => s.isLoggedIn);
  const navigate           = useNavigate();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [showModal, setShowModal] = useState(!isLoggedIn());

  // Surveille les changements d'état d'auth (connexion depuis le modal)
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state) => {
      const now = state.isLoggedIn();
      setLoggedIn(now);
      if (now) setShowModal(false);
    });
    return unsub;
  }, []);

  if (loggedIn) return <>{children}</>;

  return (
    <>
      {/* Fond verrouillé — écran sobre derrière le modal */}
      <div style={{
        minHeight: '100dvh',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '0 24px',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <p style={{ color: '#555', fontSize: 14, textAlign: 'center', maxWidth: 260, margin: 0 }}>
          Connectez-vous pour accéder à cette page
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 8,
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99,
            color: '#888',
            padding: '8px 20px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ← Retour
        </button>
      </div>

      <LoginModal
        show={showModal}
        onClose={() => { setShowModal(false); navigate(-1); }}
        onSuccess={() => { setShowModal(false); setLoggedIn(true); }}
      />
    </>
  );
}
