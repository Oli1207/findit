import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import UserData from "../plugin/UserData";
import LoginModal from "../auth/LoginModal";

function BottomBar() {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const userData = UserData();

  /* Clic sur lien protégé : modal si non connecté, navigation sinon */
  const handleAuthClick = (path) => (e) => {
    e.preventDefault();
    if (!userData) { setShowLogin(true); return; }
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  /* ── Styles réactifs ── */
  const barStyle = {
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 64,
    background: isDark ? "rgba(8,8,8,0.96)" : "rgba(255,255,255,0.96)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.09)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: "env(safe-area-inset-bottom)",
    zIndex: 200,
  };

  const itemStyle = () => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    flex: 1,
    cursor: "pointer",
    textDecoration: "none",
    paddingTop: 4,
  });

  const iconStyle = (active) => ({
    fontSize: 20,
    color: active ? "#DF468F" : isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
    transition: "color 0.2s",
  });

  const labelStyle = (active) => ({
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    color: active ? "#DF468F" : isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)",
    transition: "color 0.2s",
    fontFamily: "'Poppins', sans-serif",
  });

  /* Bouton + central */
  const addWrapStyle = {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  };

  const addBtnStyle = {
    width: 50,
    height: 50,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #DF468F, #b83575)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    boxShadow: "0 4px 16px rgba(223,70,143,0.45)",
    cursor: "pointer",
    transform: "translateY(-10px)",
    transition: "transform 0.15s, box-shadow 0.15s",
    outline: "none",
  };

  /* Menu contextuel "+" */
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 198,
  };

  const menuStyle = {
    position: "fixed",
    bottom: 82,
    left: "50%",
    transform: "translateX(-50%)",
    background: isDark ? "#1a1a1a" : "#ffffff",
    borderRadius: 16,
    boxShadow: isDark
      ? "0 12px 36px rgba(0,0,0,0.5)"
      : "0 12px 36px rgba(0,0,0,0.15)",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 210,
    zIndex: 199,
    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
  };

  const menuItemStyle = {
    border: "none",
    outline: "none",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: isDark ? "#fff" : "#111",
    fontFamily: "'Poppins', sans-serif",
  };

  const menuIconStyle = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#DF468F",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 13,
    flexShrink: 0,
  };

  return (
    <>
      {/* Modal auth (profil non connecté) */}
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => { setShowLogin(false); navigate("/profile/"); }}
      />

      {/* Overlay fermeture menu */}
      {showAddMenu && (
        <div style={overlayStyle} onClick={() => setShowAddMenu(false)} />
      )}

      {/* Menu contextuel */}
      {showAddMenu && (
        <div style={menuStyle}>
          <button
            style={menuItemStyle}
            onClick={() => { setShowAddMenu(false); navigate("/add-product/", { state: { autoOpen: true } }); }}
          >
            <div style={menuIconStyle}><i className="fas fa-box-open" /></div>
            Ajouter un produit
          </button>
          <button
            style={menuItemStyle}
            onClick={() => { setShowAddMenu(false); navigate("/vendor/add-presentation", { state: { autoOpen: true } }); }}
          >
            <div style={menuIconStyle}><i className="fas fa-video" /></div>
            Ajouter une vidéo
          </button>
        </div>
      )}

      {/* Barre de navigation */}
      <div style={barStyle}>

        {/* Accueil */}
        <Link to="/" style={itemStyle(isActive("/"))}>
          <i className="fas fa-home" style={iconStyle(isActive("/"))} />
          <span style={labelStyle(isActive("/"))}>Accueil</span>
        </Link>

        {/* Ventes (commandes reçues vendeur) */}
        <a href="/vendor/orders/" onClick={handleAuthClick("/vendor/orders/")} style={itemStyle(isActive("/vendor/orders"))}>
          <i className="fas fa-store" style={iconStyle(isActive("/vendor/orders"))} />
          <span style={labelStyle(isActive("/vendor/orders"))}>Ventes</span>
        </a>

        {/* Bouton + */}
        <div style={addWrapStyle}>
          <button
            type="button"
            style={addBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              if (!userData) { setShowLogin(true); return; }
              setShowAddMenu((p) => !p);
            }}
          >
            <i className="fas fa-plus" />
          </button>
        </div>

        {/* Achats (commandes passées client) */}
        <a href="/customer/orders/" onClick={handleAuthClick("/customer/orders/")} style={itemStyle(isActive("/customer/orders"))}>
          <i className="fas fa-shopping-bag" style={iconStyle(isActive("/customer/orders"))} />
          <span style={labelStyle(isActive("/customer/orders"))}>Achats</span>
        </a>

        {/* Profil */}
        <a href="/profile/" onClick={handleAuthClick("/profile/")} style={itemStyle(isActive("/profile"))}>
          <i className="fas fa-user" style={iconStyle(isActive("/profile"))} />
          <span style={labelStyle(isActive("/profile"))}>Profil</span>
        </a>


      </div>
    </>
  );
}

export default BottomBar;
