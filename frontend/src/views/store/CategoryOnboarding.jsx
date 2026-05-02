/**
 * CategoryOnboarding.jsx — FindIT
 *
 * Écran plein écran présenté au premier lancement (utilisateur non connecté).
 * L'utilisateur sélectionne ses catégories préférées → le feed se personnalise
 * immédiatement. Si l'utilisateur se connecte ensuite, les catégories sont
 * liées à son compte via /save-category-preferences/<user_id>/
 */
import React, { useState, useEffect } from 'react';
import apiInstance from '../../utils/axios';
import './categoryonboarding.css';

// Map d'emojis pour les noms de catégories courants
const EMOJI_MAP = {
  mode:         '👗',
  fashion:      '👗',
  vêtements:    '👗',
  vetements:    '👗',
  électronique: '📱',
  electronique: '📱',
  tech:         '💻',
  technologie:  '💻',
  sport:        '⚽',
  sports:       '⚽',
  maison:       '🏠',
  'maison & jardin': '🏠',
  jardin:       '🌿',
  beauté:       '💄',
  beaute:       '💄',
  cosmétiques:  '💄',
  cosmetiques:  '💄',
  livres:       '📚',
  livre:        '📚',
  jeux:         '🎮',
  gaming:       '🎮',
  jouets:       '🧸',
  enfants:      '👶',
  bébé:         '👶',
  bebe:         '👶',
  alimentation: '🍎',
  nourriture:   '🍎',
  food:         '🍎',
  bijoux:       '💎',
  accessoires:  '👜',
  sacs:         '👜',
  chaussures:   '👟',
  montres:      '⌚',
  auto:         '🚗',
  automobile:   '🚗',
  voiture:      '🚗',
  moto:         '🏍️',
  voyage:       '✈️',
  tourisme:     '✈️',
  musique:      '🎵',
  art:          '🎨',
  bricolage:    '🔧',
  décoration:   '🖼️',
  decoration:   '🖼️',
  santé:        '❤️',
  sante:        '❤️',
  bien:         '🧘',
  fitness:      '🏋️',
  animaux:      '🐾',
  animal:       '🐾',
  high:         '💻',
  default:      '🛍️',
};

function getEmoji(title = '') {
  const lower = title.toLowerCase().trim();
  // Cherche une correspondance exacte ou partielle
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower === key || lower.includes(key)) return emoji;
  }
  return EMOJI_MAP.default;
}

export default function CategoryOnboarding({ onComplete }) {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);   // slugs sélectionnés
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiInstance.get('category/')
      .then((r) => {
        const cats = Array.isArray(r.data) ? r.data : (r.data.results || []);
        setCategories(cats);
      })
      .catch(() => {
        // Fallback : catégories génériques si l'API échoue
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (slug) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleContinue = () => {
    // Sauvegarder dans localStorage
    localStorage.setItem('findit_guest_cats',  JSON.stringify(selected));
    localStorage.setItem('findit_onboarded',   '1');
    onComplete(selected);
  };

  const handleSkip = () => {
    localStorage.setItem('findit_onboarded', '1');
    onComplete([]);
  };

  const MIN_SELECT = 2;
  const isReady    = selected.length >= MIN_SELECT;

  return (
    <div className="co-overlay">
      {/* ── Logo ── */}
      <div className="co-header">
        <p className="co-logo">find<span>IT</span></p>
        <span className="co-emoji-big" role="img" aria-label="Personnalisation">🎯</span>
        <h1 className="co-title">
          Qu'est-ce qui<br />
          t'<span>intéresse</span> ?
        </h1>
        <p className="co-subtitle">
          Sélectionne tes catégories et on crée<br />
          un feed 100% taillé pour toi.
        </p>
      </div>

      {/* ── Grille des catégories ── */}
      {loading ? (
        <div className="co-loading">
          <div className="co-spinner" />
          <span>Chargement…</span>
        </div>
      ) : (
        <div className="co-grid">
          {categories.map((cat) => {
            const isSelected = selected.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                className={`co-cat-chip${isSelected ? ' selected' : ''}`}
                onClick={() => toggle(cat.slug)}
                type="button"
              >
                {cat.image
                  ? (
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="co-cat-img"
                      onError={(e) => {
                        // Si l'image ne charge pas, afficher l'emoji
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  )
                  : null
                }
                <span
                  className="co-cat-emoji"
                  style={{ display: cat.image ? 'none' : 'block' }}
                  role="img"
                  aria-label={cat.title}
                >
                  {getEmoji(cat.title)}
                </span>
                <span className="co-cat-name">{cat.title}</span>
              </button>
            );
          })}

          {/* Fallback si 0 catégories chargées */}
          {!loading && categories.length === 0 && (
            <p style={{
              gridColumn: '1/-1', textAlign: 'center',
              color: '#888', fontSize: 13, padding: '20px 0',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Impossible de charger les catégories.<br />
              <button
                onClick={handleSkip}
                style={{ color: '#DF468F', background: 'none', border: 'none',
                  fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Continuer sans personnalisation
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="co-footer">
        <p className={`co-counter${isReady ? ' ready' : ''}`}>
          {selected.length === 0
            ? `Sélectionne au moins ${MIN_SELECT} catégories`
            : selected.length === 1
            ? 'Encore une au minimum…'
            : `${selected.length} catégorie${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''} ✓`
          }
        </p>
        <button
          className="co-btn-continue"
          onClick={handleContinue}
          disabled={!isReady}
          type="button"
        >
          {isReady
            ? `Voir mon feed personnalisé →`
            : `Sélectionne au moins ${MIN_SELECT} catégories`
          }
        </button>
        <button
          className="co-btn-skip"
          onClick={handleSkip}
          type="button"
        >
          Passer pour l'instant
        </button>
      </div>
    </div>
  );
}
