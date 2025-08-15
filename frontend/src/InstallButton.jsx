import React, { useEffect, useState } from "react";

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa_installed')) {
        setIsVisible(true);
      }
    };

    const appInstalledHandler = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log("User response to the install prompt:", outcome);

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstall}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#2F80ED",
        color: "white",
        border: "none",
        padding: "12px 20px",
        borderRadius: "10px",
        fontWeight: "bold",
        zIndex: 9999,
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
    >
      Installer l'app
    </button>
  );
};

export default InstallButton;
