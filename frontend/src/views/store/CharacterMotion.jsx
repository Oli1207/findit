/**
 * CharacterMotion.jsx — FindIT Character Motion System
 *
 * Deux personnages SVG custom inspirés du style Duolingo :
 *   • BagCharacter  "Shopper" — sac shopping animé, bouton Acheter
 *   • HeartCharacter "Heartie" — cœur animé, bouton Wishlist
 *
 * Chaque personnage a une anatomie complète :
 *   corps · yeux (iris + pupille + reflet + paupière) · sourcils
 *   bouche progressive (5 états) · joues · bras (Shopper) · sparkles
 *
 * L'enthousiasme monte via la prop emotionLevel (0 → 4).
 */
import './charactermotion.css';

/* ─────────────────────────────────────────────────────────────────────────────
   🛍  SHOPPER — Le sac shopping enthousiaste
   ───────────────────────────────────────────────────────────────────────────── */
export function BagCharacter({ emotionLevel = 0, onClick }) {
  const lvl = Math.min(4, Math.max(0, Math.round(emotionLevel)));

  return (
    <button
      className={`cm-char cm-bag cm-char-enter emotion-${lvl}`}
      onClick={onClick}
      aria-label="Acheter ce produit"
      type="button"
    >
      <svg
        viewBox="0 0 80 100"
        xmlns="http://www.w3.org/2000/svg"
        className="cm-bag-svg"
        style={{ overflow: 'visible' }}
      >
        {/* ── Bras (apparaissent au niveau 3+) ── */}
        <g className="cm-bag-arms" style={{ transformOrigin: '40px 55px' }}>
          {/* Bras gauche */}
          <path
            d="M12,52 Q2,44 5,36 Q6,33 9,35"
            stroke="#DF468F" strokeWidth="5.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transformOrigin: '12px 52px' }}
          />
          {/* Main gauche */}
          <circle cx="9" cy="35" r="4.5" fill="#DF468F" />

          {/* Bras droit */}
          <path
            d="M68,52 Q78,44 75,36 Q74,33 71,35"
            stroke="#DF468F" strokeWidth="5.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transformOrigin: '68px 52px' }}
          />
          {/* Main droite */}
          <circle cx="71" cy="35" r="4.5" fill="#DF468F" />
        </g>

        {/* ── Anse du sac ── */}
        <path
          className="cm-bag-handle"
          d="M25,29 Q25,9 40,9 Q55,9 55,29"
          stroke="#9c2558" strokeWidth="6" fill="none"
          strokeLinecap="round"
        />

        {/* ── Corps principal ── */}
        <rect className="cm-bag-body" x="7" y="27" width="66" height="67" rx="11" />

        {/* Ombre bas du corps */}
        <rect className="cm-bag-body-shade" x="7" y="68" width="66" height="26" rx="11" />

        {/* Reflet haut-gauche sur le corps */}
        <ellipse
          cx="22" cy="42" rx="8" ry="13"
          fill="rgba(255,255,255,0.13)"
          transform="rotate(-22 22 42)"
        />

        {/* ── Zone visage (fond blanc) ── */}
        <ellipse cx="40" cy="64" rx="25" ry="20" fill="rgba(255,255,255,0.93)" />

        {/* ── Sourcils ── */}
        <g className="cm-eyebrow cm-eyebrow-left" style={{ transformOrigin: '31px 51px' }}>
          <path d="M25,52 Q31,48 37,52"
            stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </g>
        <g className="cm-eyebrow cm-eyebrow-right" style={{ transformOrigin: '49px 51px' }}>
          <path d="M43,52 Q49,48 55,52"
            stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </g>

        {/* ── Œil gauche ── */}
        <g className="cm-eye cm-eye-left">
          {/* Blanc de l'œil */}
          <ellipse cx="31" cy="60" rx="8" ry="8.5" fill="white" />
          {/* Iris */}
          <circle
            className="cm-iris"
            cx="32.5" cy="61"
            r="5.5" fill="#2b2b2b"
            style={{ transformOrigin: '32.5px 61px' }}
          />
          {/* Reflet */}
          <circle cx="35.5" cy="58" r="2.2" fill="white" />
          {/* Pupille intérieure */}
          <circle cx="32.5" cy="61" r="2.2" fill="#111" />
          {/* Paupière (pour le clignement) */}
          <ellipse
            className="cm-eyelid"
            cx="31" cy="52" rx="8" ry="8.5"
            fill="rgba(255,255,255,0.93)"
            style={{ transformOrigin: '31px 52px' }}
          />
        </g>

        {/* ── Œil droit ── */}
        <g className="cm-eye cm-eye-right">
          <ellipse cx="49" cy="60" rx="8" ry="8.5" fill="white" />
          <circle
            className="cm-iris"
            cx="50.5" cy="61"
            r="5.5" fill="#2b2b2b"
            style={{ transformOrigin: '50.5px 61px' }}
          />
          <circle cx="53.5" cy="58" r="2.2" fill="white" />
          <circle cx="50.5" cy="61" r="2.2" fill="#111" />
          <ellipse
            className="cm-eyelid"
            cx="49" cy="52" rx="8" ry="8.5"
            fill="rgba(255,255,255,0.93)"
            style={{ transformOrigin: '49px 52px' }}
          />
        </g>

        {/* ── Joues roses ── */}
        <ellipse className="cm-cheek cm-cheek-left"
          cx="18" cy="68" rx="8" ry="6" fill="rgba(255,110,160,0.32)" />
        <ellipse className="cm-cheek cm-cheek-right"
          cx="62" cy="68" rx="8" ry="6" fill="rgba(255,110,160,0.32)" />

        {/* ── Bouches (une seule visible selon le niveau) ── */}
        {/* Niveau 1 : sourire timide */}
        <path className="cm-mouth cm-mouth-1"
          d="M34,72 Q40,76 46,72"
          stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        {/* Niveau 2 : beau sourire */}
        <path className="cm-mouth cm-mouth-2"
          d="M31,71 Q40,78 49,71"
          stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        {/* Niveau 3 : grand sourire */}
        <path className="cm-mouth cm-mouth-3"
          d="M29,70 Q40,80 51,70"
          stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        {/* Niveau 4 : bouche ouverte + langue */}
        <g className="cm-mouth cm-mouth-4">
          <path
            d="M28,69 Q40,82 52,69"
            stroke="#3a3a3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          {/* Intérieur bouche */}
          <path
            d="M28,69 Q40,82 52,69 Q46,76 34,76 Z"
            fill="#d63060" opacity="0.7" />
          {/* Langue */}
          <ellipse cx="40" cy="78" rx="7" ry="4.5" fill="#ff6b9d" opacity="0.85" />
          {/* Dents */}
          <rect x="31" y="69" width="18" height="5" rx="2.5" fill="white" opacity="0.9" />
        </g>

        {/* ── Sparkles dorés (niveau 3+) ── */}
        <g className="cm-sparkles">
          {/* Étoile haut-gauche */}
          <path
            className="cm-sparkle"
            d="M7,22 L9,15 L11,22 L9,29 Z"
            fill="#FFD700"
            style={{ transformOrigin: '9px 22px' }}
          />
          {/* Étoile haut-droite */}
          <path
            className="cm-sparkle"
            d="M67,14 L69,7 L71,14 L69,21 Z"
            fill="#FFD700"
            style={{ transformOrigin: '69px 14px', animationDelay: '0.2s' }}
          />
          {/* Point brillant droite */}
          <circle
            className="cm-sparkle"
            cx="74" cy="34" r="3.5"
            fill="#FFD700"
            style={{ animationDelay: '0.4s' }}
          />
          {/* Point brillant gauche */}
          <circle
            className="cm-sparkle"
            cx="6" cy="38" r="3"
            fill="#FFD700"
            style={{ animationDelay: '0.15s' }}
          />
        </g>

        {/* ── Label "Acheter" sous le sac ── */}
        <text
          x="40" y="100"
          textAnchor="middle"
          fontSize="10.5"
          fill="#DF468F"
          fontWeight="700"
          fontFamily="'Poppins', sans-serif"
          letterSpacing="0.3"
        >
          Acheter
        </text>
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ❤  HEARTIE — Le cœur romantique
   ───────────────────────────────────────────────────────────────────────────── */
export function HeartCharacter({ emotionLevel = 0, onClick }) {
  const lvl = Math.min(4, Math.max(0, Math.round(emotionLevel)));

  return (
    <button
      className={`cm-char cm-heart cm-char-enter-delay emotion-${lvl}`}
      onClick={onClick}
      aria-label="Ajouter aux favoris"
      type="button"
    >
      <svg
        viewBox="0 0 80 82"
        xmlns="http://www.w3.org/2000/svg"
        className="cm-heart-svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="heartGrad" cx="38%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#ff8fab" />
            <stop offset="55%"  stopColor="#f03670" />
            <stop offset="100%" stopColor="#c4145a" />
          </radialGradient>
          <radialGradient id="heartGradGlow" cx="38%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#ffb3cc" />
            <stop offset="55%"  stopColor="#ff5090" />
            <stop offset="100%" stopColor="#e01a68" />
          </radialGradient>
        </defs>

        {/* ── Corps cœur ── */}
        <path
          className="cm-heart-body"
          d="M40,68 C22,56 4,44 4,26 C4,13 13,5 24,5 C30,5 36,8 40,15 C44,8 50,5 56,5 C67,5 76,13 76,26 C76,44 58,56 40,68 Z"
          fill="url(#heartGrad)"
        />

        {/* Reflet haut-gauche */}
        <ellipse
          cx="27" cy="20" rx="11" ry="15"
          fill="rgba(255,255,255,0.22)"
          transform="rotate(-20 27 20)"
        />

        {/* ── Joues ── */}
        <ellipse className="cm-cheek cm-cheek-left"
          cx="15" cy="40" rx="9" ry="7" fill="rgba(255,100,140,0.38)" />
        <ellipse className="cm-cheek cm-cheek-right"
          cx="65" cy="40" rx="9" ry="7" fill="rgba(255,100,140,0.38)" />

        {/* ── Œil gauche ── */}
        <g className="cm-eye cm-eye-left">
          <ellipse cx="29" cy="32" rx="8" ry="8.5" fill="white" />
          <circle
            className="cm-iris"
            cx="30.5" cy="33"
            r="5.5" fill="#2b2b2b"
            style={{ transformOrigin: '30.5px 33px' }}
          />
          <circle cx="33.5" cy="30" r="2.2" fill="white" />
          <circle cx="30.5" cy="33" r="2" fill="#111" />
          <ellipse
            className="cm-eyelid"
            cx="29" cy="24" rx="8" ry="8.5"
            fill="rgba(255,180,200,0.94)"
            style={{ transformOrigin: '29px 24px' }}
          />
        </g>

        {/* ── Œil droit ── */}
        <g className="cm-eye cm-eye-right">
          <ellipse cx="51" cy="32" rx="8" ry="8.5" fill="white" />
          <circle
            className="cm-iris"
            cx="52.5" cy="33"
            r="5.5" fill="#2b2b2b"
            style={{ transformOrigin: '52.5px 33px' }}
          />
          <circle cx="55.5" cy="30" r="2.2" fill="white" />
          <circle cx="52.5" cy="33" r="2" fill="#111" />
          <ellipse
            className="cm-eyelid"
            cx="51" cy="24" rx="8" ry="8.5"
            fill="rgba(255,180,200,0.94)"
            style={{ transformOrigin: '51px 24px' }}
          />
        </g>

        {/* ── Pupilles en forme de cœur (niveau 4) ── */}
        <g className="cm-heart-pupils">
          <path
            d="M30.5,32 C28.5,29.5 25.5,31 26.5,34 C27.5,36 30.5,38 30.5,38 C30.5,38 33.5,36 34.5,34 C35.5,31 32.5,29.5 30.5,32 Z"
            fill="#b8003a"
          />
          <path
            d="M52.5,32 C50.5,29.5 47.5,31 48.5,34 C49.5,36 52.5,38 52.5,38 C52.5,38 55.5,36 56.5,34 C57.5,31 54.5,29.5 52.5,32 Z"
            fill="#b8003a"
          />
        </g>

        {/* ── Bouches ── */}
        <path className="cm-mouth cm-mouth-1"
          d="M33,46 Q40,51 47,46"
          stroke="#b83575" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <path className="cm-mouth cm-mouth-2"
          d="M30,45 Q40,52 50,45"
          stroke="#b83575" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <path className="cm-mouth cm-mouth-3"
          d="M28,44 Q40,54 52,44"
          stroke="#b83575" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <g className="cm-mouth cm-mouth-4">
          <path
            d="M27,43 Q40,55 53,43"
            stroke="#b83575" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path
            d="M27,43 Q40,55 53,43 Q46,50 34,50 Z"
            fill="#e05080" opacity="0.6" />
          <ellipse cx="40" cy="51" rx="7" ry="4" fill="#ff8fab" opacity="0.8" />
        </g>

        {/* ── Sparkles ── */}
        <g className="cm-sparkles">
          <path
            className="cm-sparkle"
            d="M4,14 L6,7 L8,14 L6,21 Z"
            fill="#FFD700"
            style={{ transformOrigin: '6px 14px' }}
          />
          <path
            className="cm-sparkle"
            d="M70,8 L72,1 L74,8 L72,15 Z"
            fill="#FFD700"
            style={{ transformOrigin: '72px 8px', animationDelay: '0.25s' }}
          />
          <circle
            className="cm-sparkle"
            cx="76" cy="30" r="3"
            fill="#FFD700"
            style={{ animationDelay: '0.5s' }}
          />
        </g>

        {/* ── Label "Favoris" ── */}
        <text
          x="40" y="80"
          textAnchor="middle"
          fontSize="10.5"
          fill="#e63470"
          fontWeight="700"
          fontFamily="'Poppins', sans-serif"
          letterSpacing="0.3"
        >
          Favoris
        </text>
      </svg>
    </button>
  );
}
