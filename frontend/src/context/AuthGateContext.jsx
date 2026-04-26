// AuthGateContext.jsx
// Fournit requireAuth(callback) partout dans l'app.
// Si l'user est connecté → callback immédiat
// Sinon → modal de login, puis callback après connexion réussie
import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import LoginModal from '../views/auth/LoginModal';

const AuthGateContext = createContext(null);

export function AuthGateProvider({ children }) {
  const isLoggedIn     = useAuthStore((s) => s.isLoggedIn);
  const [show, setShow] = useState(false);
  const pending         = useRef(null); // action à exécuter après login

  const requireAuth = useCallback((action) => {
    if (isLoggedIn()) {
      action?.();
    } else {
      pending.current = action ?? null;
      setShow(true);
    }
  }, [isLoggedIn]);

  // Appelé quand login réussit dans le modal
  const handleSuccess = useCallback(() => {
    setShow(false);
    const action = pending.current;
    pending.current = null;
    // Léger délai pour laisser le store se mettre à jour
    setTimeout(() => action?.(), 80);
  }, []);

  // Appelé quand l'user ferme le modal sans se connecter
  const handleClose = useCallback(() => {
    pending.current = null;
    setShow(false);
  }, []);

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <LoginModal show={show} onClose={handleClose} onSuccess={handleSuccess} />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate doit être utilisé dans <AuthGateProvider>');
  return ctx;
}
