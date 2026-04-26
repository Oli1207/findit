// NotFound.jsx — Page 404 Findit
// Friendly · smile-inducing · dark theme
import { Link, useNavigate } from 'react-router-dom';
import './auth/auth.css';

const SUGGESTIONS = [
  { label: 'Accueil', to: '/' },
  { label: 'Recherche', to: '/search' },
  { label: 'Mon profil', to: '/profile/' },
  { label: 'Mes achats', to: '/customer/orders/' },
];

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-blob-1" />
      <div className="notfound-blob-2" />

      {/* Animated 404 */}
      <div className="notfound-number">404</div>

      {/* Wiggling emoji */}
      <span className="notfound-emoji">🛋️</span>

      <h1 className="notfound-title">
        On a cherché partout…
      </h1>
      <p className="notfound-sub">
        Même sous le tapis, derrière le canapé et dans les poches des vieilles vestes —
        cette page est <em>introuvable</em>.<br /><br />
        Mais on a plein d'autres pépites pour vous ! 👇
      </p>

      {/* CTA buttons */}
      <div className="notfound-actions">
        <Link to="/" className="notfound-btn-primary">
          <i className="fas fa-home" /> Retour à l'accueil
        </Link>
        <button className="notfound-btn-ghost" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" /> Page précédente
        </button>
      </div>

      {/* Quick links */}
      <div className="notfound-tags">
        {SUGGESTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="notfound-tag">
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
