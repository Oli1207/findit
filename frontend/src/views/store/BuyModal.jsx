/**
 * BuyModal — Bottom sheet de commande partagé.
 * Utilisé dans TiktokFeed, Search, FollowedVendorsFeed.
 *
 * Persistance d'adresse via localStorage (clé : findit_delivery_address).
 * Hiérarchie :   profil API  >  localStorage  >  formulaire vide
 */
import { useState, useEffect } from "react";
import { useEscrowOrder } from "../../hooks/useEscrowOrder";
import "./buymodal.css";

const ADDR_KEY = "findit_delivery_address";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(ADDR_KEY) || "null"); }
  catch { return null; }
}
function saveLs(addr) {
  try { localStorage.setItem(ADDR_KEY, JSON.stringify(addr)); } catch {}
}

const fmtPrice = (n) =>
  Math.round(Number(n)).toLocaleString("fr-FR");

export default function BuyModal({
  product,       // objet produit complet
  userData,      // depuis UserData()
  profileData,   // depuis l'API user/profile/<id>/
  onClose,       // () => void
  onWishlist,    // (productId) => void  (optionnel)
}) {
  const [qty,        setQty]        = useState(1);
  const [sizeVal,    setSizeVal]    = useState("No Size");
  const [colorVal,   setColorVal]   = useState("No Color");

  // ── Adresse ──────────────────────────────────────────────────────────
  const [savedAddr,  setSavedAddr]  = useState(null);
  const [useSaved,   setUseSaved]   = useState(false);
  const [formAddr,   setFormAddr]   = useState({ mobile: "", address: "", city: "" });

  useEffect(() => {
    if (!product) return;
    // Reset sélections à chaque ouverture
    setQty(1);
    setSizeVal("No Size");
    setColorVal("No Color");

    // Priorité : profil complet > localStorage
    const fromProfile =
      profileData?.mobile && profileData?.address && profileData?.city
        ? { mobile: profileData.mobile, address: profileData.address, city: profileData.city }
        : null;
    const fromLs = loadSaved();
    const best = fromProfile || fromLs;

    if (best) {
      setSavedAddr(best);
      setUseSaved(true);
      setFormAddr(best);           // pré-remplit le formulaire
    } else {
      setSavedAddr(null);
      setUseSaved(false);
      setFormAddr({ mobile: "", address: "", city: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, profileData?.mobile]);

  // Adresse effectivement utilisée lors du paiement
  const effectiveAddr = useSaved && savedAddr ? savedAddr : formAddr;

  // ── Hook Paystack ─────────────────────────────────────────────────────
  const { handlePayWithPaystack } = useEscrowOrder({
    userData,
    qtyValue:          qty,
    sizeValue:         sizeVal,
    colorValue:        colorVal,
    profileData:       null,          // désactivé — on gère l'adresse ici
    useProfileAddress: false,
    customAddress:     effectiveAddr,
    onOrderSuccess: () => {
      saveLs(effectiveAddr);
      setSavedAddr(effectiveAddr);
      onClose();
    },
  });

  if (!product) return null;

  const subtotal   = Number(product.price) * qty;   // part vendeur
  const fee        = Math.round(subtotal * 0.05);    // commission plateforme (+5 %)
  const totalCharge = subtotal + fee;                // montant réellement débité

  const FIELDS = [
    { key: "mobile",  label: "Téléphone", icon: "fa-phone",    placeholder: "Ex : 0612 34 56 78" },
    { key: "address", label: "Adresse",   icon: "fa-home",     placeholder: "Rue, quartier…"      },
    { key: "city",    label: "Ville",     icon: "fa-city",     placeholder: "Ex : Abidjan"        },
  ];

  return (
    <div className="bm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bm-sheet">
        {/* ── Drag handle + close ──────────────────────────────────── */}
        <div className="bm-handle" />
        <button className="bm-close" onClick={onClose} aria-label="Fermer">
          <i className="fas fa-times" />
        </button>

        {/* ── En-tête produit ─────────────────────────────────────── */}
        <div className="bm-product-head">
          {product.image && (
            <img src={product.image} alt={product.title} className="bm-thumb" />
          )}
          <div className="bm-product-meta">
            <p className="bm-vendor">@{product.vendor?.name}</p>
            <h3 className="bm-title">{product.title}</h3>
            <div className="bm-price-row">
              {product.old_price && Number(product.old_price) > Number(product.price) && (
                <span className="bm-old-price">{fmtPrice(product.old_price)} frs</span>
              )}
              <span className="bm-price">{fmtPrice(product.price)} frs</span>
            </div>
          </div>
        </div>

        <div className="bm-divider" />

        {/* ── Quantité ────────────────────────────────────────────── */}
        <div className="bm-section">
          <label className="bm-label">Quantité</label>
          <div className="bm-qty-row">
            <button className="bm-qty-btn" onClick={() => setQty((v) => Math.max(1, v - 1))}>
              <i className="fas fa-minus" />
            </button>
            <span className="bm-qty-val">{qty}</span>
            <button className="bm-qty-btn" onClick={() => setQty((v) => v + 1)}>
              <i className="fas fa-plus" />
            </button>
          </div>
        </div>

        {/* ── Tailles ─────────────────────────────────────────────── */}
        {product.size?.length > 0 && (
          <div className="bm-section">
            <label className="bm-label">
              Taille
              {sizeVal !== "No Size" && (
                <span className="bm-selected"> — {sizeVal}</span>
              )}
            </label>
            <div className="bm-chips">
              {product.size.map((s, i) => (
                <button
                  key={i}
                  className={`bm-chip${sizeVal === s.name ? " bm-chip--active" : ""}`}
                  onClick={() => setSizeVal(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Couleurs ────────────────────────────────────────────── */}
        {product.color?.length > 0 && (
          <div className="bm-section">
            <label className="bm-label">
              Couleur
              {colorVal !== "No Color" && (
                <span className="bm-selected"> — {colorVal}</span>
              )}
            </label>
            <div className="bm-dots">
              {product.color.map((c, i) => (
                <button
                  key={i}
                  className={`bm-dot${colorVal === c.color_code ? " bm-dot--active" : ""}`}
                  style={{ backgroundColor: c.color_code }}
                  title={c.name}
                  onClick={() => setColorVal(c.color_code)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bm-divider" />

        {/* ── Livraison ───────────────────────────────────────────── */}
        <div className="bm-section">
          <label className="bm-label">
            <i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: "#DF468F" }} />
            Livraison
          </label>

          {savedAddr && (
            <label className="bm-checkbox-row">
              <input
                type="checkbox"
                checked={useSaved}
                onChange={(e) => setUseSaved(e.target.checked)}
              />
              <span>
                Utiliser mon adresse enregistrée
                <small className="bm-saved-preview">
                  {" "}· {savedAddr.city}{savedAddr.mobile ? ` · ${savedAddr.mobile}` : ""}
                </small>
              </span>
            </label>
          )}

          {(!useSaved || !savedAddr) && (
            <div className="bm-addr-form">
              {FIELDS.map((f) => (
                <div className="bm-field" key={f.key}>
                  <i className={`fas ${f.icon} bm-field-icon`} />
                  <input
                    className="bm-input"
                    placeholder={f.placeholder}
                    value={formAddr[f.key]}
                    onChange={(e) =>
                      setFormAddr((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bm-divider" />

        {/* ── Récapitulatif ────────────────────────────────────────── */}
        <div className="bm-summary">
          <div className="bm-summary-row">
            <span>Sous-total</span>
            <span>{fmtPrice(subtotal)} frs</span>
          </div>
          <div className="bm-summary-row bm-summary-fee">
            <span>Commission plateforme (5 %)</span>
            <span>+{fmtPrice(fee)} frs</span>
          </div>
          <div className="bm-summary-row bm-summary-total">
            <span>Total débité</span>
            <strong>{fmtPrice(totalCharge)} frs</strong>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <button
          className="bm-btn-pay"
          onClick={() =>
            handlePayWithPaystack(product.id, product.price, product.vendor?.id)
          }
        >
          <i className="fas fa-lock" /> Payer en sécurité avec Paystack
        </button>

        {onWishlist && (
          <button className="bm-btn-wish" onClick={() => onWishlist(product.id)}>
            <i className="fas fa-heart" /> Ajouter aux favoris
          </button>
        )}
      </div>
    </div>
  );
}
