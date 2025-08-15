import React, { useEffect, useState } from 'react';
import InstallButton from '../../InstallButton';

const PWAInstallPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    localStorage.getItem('pwa_installed') === 'true'
  );

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      setIsInstalled(true);
      localStorage.setItem('pwa_installed', 'true');
    }

    const beforeInstallHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setVisible(false);
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  useEffect(() => {
    if (isInstalled || isStandalone) return;

    const timeout = setTimeout(() => {
      setVisible(true);
      setTriggered(true);
    }, 45000);

    const onScroll = () => {
      if (!triggered) {
        setVisible(true);
        setTriggered(true);
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { once: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', onScroll);
    };
  }, [triggered, isInstalled, isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert("Sur iPhone, appuyez sur l’icône de partage, puis sélectionnez 'Sur l’écran d’accueil'.");
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible || isStandalone || isInstalled) return null;

  return (
    <div style={styles.container}>
      <p style={styles.text}>
        📲 Pour une meilleure expérience, ajoutez FindIt à votre écran d’accueil.
      </p>
      <div style={styles.buttons}>
        <button onClick={handleInstallClick} style={styles.install}>
          Ajouter
        </button>
        <InstallButton />
        <button onClick={handleClose} style={styles.close}>
          Fermer
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '10%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#000',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: '12px',
    zIndex: 9999,
    textAlign: 'center',
    maxWidth: '90%',
  },
  text: {
    fontSize: '15px',
    marginBottom: '10px',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
  },
  install: {
    background: '#ffffff',
    color: '#000',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  close: {
    background: '#333',
    color: '#fff',
    border: '1px solid #fff',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default PWAInstallPrompt;
