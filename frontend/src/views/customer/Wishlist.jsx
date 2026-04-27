// Wishlist.jsx — Liste de favoris (page profil)
// Mobile-first · design cohérent avec le reste de l'app
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import ProductSlider from '../store/ProductSlider';
import BuyModal from '../store/BuyModal';

const Toast = Swal.mixin({
  toast: true, position: 'top', showConfirmButton: false,
  timer: 2500, timerProgressBar: true,
  background: '#1a1a1a', color: '#fff',
});

const fmtPrice = (n) => Math.round(Number(n)).toLocaleString('fr-FR');

// ── Styles inline (cohérents avec le design system fi-*) ──────────────────────
const S = {
  page: {
    minHeight: '100dvh',
    background: 'var(--fi-bg)',
    color: 'var(--fi-text)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 90,
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px',
    borderBottom: '1px solid var(--fi-border)',
    position: 'sticky', top: 0, zIndex: 40,
    background: 'var(--fi-bg-2)',
  },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--fi-text)',
    fontSize: 17, cursor: 'pointer', width: 36, height: 36,
    borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 17, fontWeight: 700, margin: 0 },
  count: { fontSize: 13, color: 'var(--fi-muted)' },

  // grille 2 colonnes
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    padding: 12,
  },
  card: {
    background: 'var(--fi-bg-2)',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid var(--fi-border)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
  },
  // conteneur image carré — ProductSlider s'y positionne en absolute
  imgWrap: {
    position: 'relative',
    aspectRatio: '4 / 5',
    overflow: 'hidden',
    background: 'var(--fi-card-img-bg, #111)',
  },
  body: { padding: '10px 10px 12px' },
  vendor: { fontSize: 11, color: 'var(--fi-muted)', marginBottom: 3 },
  productTitle: {
    fontSize: 13, fontWeight: 600, color: 'var(--fi-text)',
    margin: '0 0 6px',
    display: '-webkit-box', WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical', overflow: 'hidden',
    lineHeight: 1.35,
  },
  priceRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 },
  priceOld: {
    fontSize: 11, color: 'var(--fi-muted)', textDecoration: 'line-through',
  },
  priceCurrent: { fontSize: 13, fontWeight: 700, color: 'var(--fi-text)' },
  actions: { display: 'flex', gap: 6 },
  btnBuy: {
    flex: 1, padding: '8px 0', background: '#DF468F', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
  },
  btnRemove: {
    width: 34, height: 34, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(220,38,38,0.10)',
    border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8,
    color: '#f87171', fontSize: 13, cursor: 'pointer', flexShrink: 0,
  },

  // états vide / chargement
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '80px 24px', textAlign: 'center',
    color: 'var(--fi-muted)',
  },
  emptyIcon: { fontSize: 52, opacity: 0.25 },
  emptyText: { fontSize: 15, fontWeight: 600, color: 'var(--fi-text)', margin: 0 },
  emptyHint: { fontSize: 13, margin: 0 },
};

export default function Wishlist() {
  const userData = UserData();
  const navigate = useNavigate();

  const [wishlist,    setWishlist]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [orderProduct, setOrderProduct] = useState(null);
  const [profileData, setProfileData] = useState(null);

  // ── Fetch wishlist ────────────────────────────────────────────────────────
  const fetchWishlist = async () => {
    if (!userData?.user_id) return;
    try {
      const { data } = await apiInstance.get(`customer/wishlist/${userData.user_id}/`);
      setWishlist(data);
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  };

  // ── Fetch profil (pour pré-remplir l'adresse dans BuyModal) ──────────────
  useEffect(() => {
    if (!userData?.user_id) return;
    apiInstance.get(`user/profile/${userData.user_id}/`)
      .then(({ data }) => setProfileData(data))
      .catch(() => {});
  }, [userData?.user_id]);

  useEffect(() => { fetchWishlist(); }, [userData?.user_id]);

  // ── Toggle wishlist (retirer) ─────────────────────────────────────────────
  const removeFromWishlist = async (productId) => {
    try {
      const fd = new FormData();
      fd.append('product_id', productId);
      fd.append('user_id', userData.user_id);
      const { data } = await apiInstance.post(`customer/wishlist/${userData.user_id}/`, fd);
      Toast.fire({ icon: 'success', title: data.message });
      fetchWishlist();
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur lors de la suppression.' });
    }
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
          </button>
          <h1 style={S.title}>Favoris</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--fi-bg-2)' }}>
              <div style={{ aspectRatio: '4/5', background: 'var(--fi-skel-gradient)' }} />
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 12, borderRadius: 6, background: 'var(--fi-skel-gradient)', width: '60%' }} />
                <div style={{ height: 10, borderRadius: 6, background: 'var(--fi-skel-gradient)', width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate(-1)} aria-label="Retour">
          <i className="fas fa-arrow-left" />
        </button>
        <h1 style={S.title}>
          <i className="fas fa-heart" style={{ color: '#DF468F', marginRight: 8 }} />
          Favoris
        </h1>
        {wishlist.length > 0 && (
          <span style={S.count}>{wishlist.length} article{wishlist.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Grille ── */}
      {wishlist.length === 0 ? (
        <div style={S.empty}>
          <i className="fas fa-heart" style={S.emptyIcon} />
          <p style={S.emptyText}>Aucun favori pour l'instant</p>
          <p style={S.emptyHint}>Appuie sur ❤ dans le feed pour sauvegarder des produits.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {wishlist.map((w) => {
            const p = w.product;
            // Construire l'objet attendu par ProductSlider
            const sliderItem = {
              image: p.image,
              gallery: p.gallery || [],
              title: p.title,
            };

            return (
              <div key={w.id} style={S.card}>
                {/* ── Galerie images (slider swipeable) ── */}
                <div style={S.imgWrap}>
                  <ProductSlider item={sliderItem} />
                </div>

                {/* ── Infos ── */}
                <div style={S.body}>
                  {p.vendor?.name && (
                    <p style={S.vendor}>@{p.vendor.name}</p>
                  )}
                  <p style={S.productTitle}>{p.title}</p>

                  <div style={S.priceRow}>
                    {p.old_price && Number(p.old_price) > Number(p.price) && (
                      <span style={S.priceOld}>{fmtPrice(p.old_price)} frs</span>
                    )}
                    <span style={S.priceCurrent}>{fmtPrice(p.price)} frs</span>
                  </div>

                  <div style={S.actions}>
                    <button
                      style={S.btnBuy}
                      onClick={() => setOrderProduct(p)}
                    >
                      <i className="fas fa-shopping-bag" style={{ marginRight: 5 }} />
                      Acheter
                    </button>
                    <button
                      style={S.btnRemove}
                      onClick={() => removeFromWishlist(p.id)}
                      title="Retirer des favoris"
                    >
                      <i className="fas fa-heart-broken" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal achat ── */}
      {orderProduct && (
        <BuyModal
          product={orderProduct}
          userData={userData}
          profileData={profileData}
          onClose={() => setOrderProduct(null)}
          onWishlist={(id) => removeFromWishlist(id)}
        />
      )}
    </div>
  );
}
