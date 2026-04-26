// CustomerShop.jsx — Rewrite complet UI/UX expert
// Design : Instagram profile × TikTok shop × Shopify mobile
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import apiInstance from '../../utils/axios';
import UserData from '../plugin/UserData';
import { useFollowStore } from '../../store/useFollowStore';
import { useEscrowOrder } from '../../hooks/useEscrowOrder';

import ProductSlider from '../store/ProductSlider';
import LoginModal from '../auth/LoginModal';
import Review from '../store/Review';

import './customershop.css';

const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1a1a1a',
  color: '#fff',
});

const MAX_COMMENT_LENGTH = 250;

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="cs-container">
      {/* header skeleton */}
      <div className="cs-header">
        <div className="cs-top-nav">
          <div className="cs-skel cs-skel--icon" />
          <div className="cs-skel cs-skel--title" />
          <div className="cs-skel cs-skel--icon" />
        </div>
        <div className="cs-profile-section">
          <div className="cs-skel cs-skel--avatar" />
          <div className="cs-stats-row">
            {[0, 1, 2].map(i => (
              <div key={i} className="cs-stat">
                <div className="cs-skel cs-skel--stat-val" />
                <div className="cs-skel cs-skel--stat-lbl" />
              </div>
            ))}
          </div>
        </div>
        <div className="cs-profile-meta">
          <div className="cs-skel cs-skel--name" />
          <div className="cs-skel cs-skel--bio" />
        </div>
        <div className="cs-actions-row">
          <div className="cs-skel cs-skel--btn" />
          <div className="cs-skel cs-skel--btn" />
        </div>
      </div>
      {/* tabs skeleton */}
      <div className="cs-tabs">
        {[0, 1, 2].map(i => <div key={i} className="cs-tab-btn"><div className="cs-skel cs-skel--icon" /></div>)}
      </div>
      {/* grid skeleton */}
      <div className="cs-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="cs-tile cs-skel" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerShop() {
  const navigate = useNavigate();
  const { slug }  = useParams();
  const userData  = UserData();
  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [vendor,     setVendor]     = useState(null);
  const [products,   setProducts]   = useState([]);
  const [videos,     setVideos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('products');

  // ── UI ────────────────────────────────────────────────────────────────────
  const [showLogin, setShowLogin] = useState(false);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [mediaList,     setMediaList]     = useState([]);
  const [initialIndex,  setInitialIndex]  = useState(0);
  const [mediaType,     setMediaType]     = useState(null); // 'product' | 'video'
  const snapContainerRef = useRef(null);
  const videoRefs        = useRef([]);

  // ── Order ─────────────────────────────────────────────────────────────────
  const [orderProduct,      setOrderProduct]      = useState(null);
  const [qtyValue,          setQtyValue]          = useState(1);
  const [selectedSize,      setSelectedSize]      = useState({});
  const [sizeValue,         setSizeValue]         = useState('No Size');
  const [selectedColors,    setSelectedColors]    = useState({});
  const [colorValue,        setColorValue]        = useState('No Color');
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [profileData,       setProfileData]       = useState(null);
  const [customAddress,     setCustomAddress]     = useState({ mobile: '', address: '', city: '' });

  // ── Reviews / Comments ────────────────────────────────────────────────────
  const [selectedProduct,      setSelectedProduct]      = useState(null);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [commentValue,         setCommentValue]         = useState('');
  const [replyingTo,           setReplyingTo]           = useState(null);
  const [replyValue,           setReplyValue]           = useState('');
  const commentInputRef = useRef(null);

  // ── Vendor Reviews ────────────────────────────────────────────────────────
  const [vendorReviews,    setVendorReviews]    = useState([]);
  const [reviewRating,     setReviewRating]     = useState(0);
  const [reviewHover,      setReviewHover]      = useState(0);
  const [reviewComment,    setReviewComment]    = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── Escrow hook ───────────────────────────────────────────────────────────
  const { handlePayWithPaystack } = useEscrowOrder({
    userData,
    qtyValue,
    sizeValue,
    colorValue,
    profileData,
    useProfileAddress,
    customAddress,
    onOrderSuccess: () => { setOrderProduct(null); setQtyValue(1); },
  });

  // ── Fetch (parallel) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Critical path: shop + products in parallel
        const [shopRes, productsRes] = await Promise.all([
          apiInstance.get(`shop/${slug}/`),
          apiInstance.get(`vendor/products/${slug}/`),
        ]);
        if (cancelled) return;

        const shopData  = shopRes.data;
        const vendorId  = shopData.id;
        setVendor(shopData);

        // Normalize products
        const getUrl = (v) => {
          if (!v) return null;
          if (typeof v === 'string') return v;
          return v?.url || v?.image?.url || (typeof v?.image === 'string' ? v.image : null) || v?.path || null;
        };
        const raw = productsRes.data.results || productsRes.data || [];
        const normalized = raw.map(item => ({
          ...item,
          image:   getUrl(item.image) || getUrl(item.cover) || null,
          gallery: (item.gallery || []).map(g => getUrl(g)).filter(Boolean),
          type:    item.type || 'product',
        }));
        setProducts(normalized);

        // Non-critical: videos + profile + reviews in parallel
        const [vidR, profileR, reviewR] = await Promise.allSettled([
          apiInstance.get('presentations/'),
          userData?.user_id ? apiInstance.get(`user/profile/${userData.user_id}/`) : null,
          vendorId ? apiInstance.get(`vendor-reviews/${vendorId}/`) : null,
        ]);
        if (cancelled) return;

        if (vidR.status === 'fulfilled') {
          const all = vidR.value?.data?.results || vidR.value?.data || [];
          setVideos(
            all
              .filter(v => v.vendor?.id === vendorId || v.vendor === vendorId)
              .map(v => ({ ...v, type: 'presentation', comments: v.comments || [] }))
          );
        }
        if (profileR.status === 'fulfilled' && profileR.value) {
          setProfileData(profileR.value.data);
        }
        if (reviewR.status === 'fulfilled' && reviewR.value) {
          setVendorReviews(reviewR.value.data.results || reviewR.value.data || []);
        }

        // Follow states
        if (userData?.user_id) {
          const ids = [...new Set([vendorId, ...normalized.map(p => p.vendor?.id)].filter(Boolean))];
          fetchFollowStates(ids, userData.user_id);
        }
      } catch (err) {
        console.error('CustomerShop fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug, userData?.user_id]);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = useCallback((index, type) => {
    videoRefs.current = [];
    setMediaList(type === 'product' ? products : videos);
    setMediaType(type);
    setInitialIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  }, [products, videos]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
    videoRefs.current.forEach(v => v?.pause());
  }, []);

  useEffect(() => {
    if (lightboxOpen && snapContainerRef.current) {
      snapContainerRef.current.scrollTop = initialIndex * window.innerHeight;
    }
  }, [lightboxOpen, initialIndex]);

  // Video autoplay via IntersectionObserver
  useEffect(() => {
    if (!lightboxOpen || mediaType !== 'video' || !snapContainerRef.current) return;
    const container = snapContainerRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const vid = entry.target;
          if (entry.isIntersecting) {
            videoRefs.current.forEach(v => { if (v && v !== vid) v.pause(); });
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    videoRefs.current.forEach(v => v && obs.observe(v));
    return () => obs.disconnect();
  }, [lightboxOpen, mediaType, mediaList]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const checkLogin = useCallback(() => {
    if (!userData) { setShowLogin(true); return false; }
    return true;
  }, [userData]);

  const fmtPrice = n => Math.round(Number(n)).toLocaleString('fr-FR');

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStartConversation = async () => {
    if (!checkLogin()) return;
    try {
      const res = await apiInstance.post('conversations/', {
        user_id: userData.user_id,
        vendor_id: vendor.id,
      });
      navigate(`/conversation/${res.data.id}`);
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur lors de l\'ouverture du chat' });
    }
  };

  const handleOrderClick = (item) => {
    if (!checkLogin()) return;
    setOrderProduct(item);
    setQtyValue(1);
    setColorValue('No Color');
    setSizeValue('No Size');
  };

  const addToWishList = async (id) => {
    if (!checkLogin()) return;
    try {
      const fd = new FormData();
      fd.append('product_id', id);
      fd.append('user_id', userData.user_id);
      await apiInstance.post(`customer/wishlist/${userData.user_id}/`, fd);
      Toast.fire({ icon: 'success', title: 'Ajouté aux favoris !' });
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur wishlist' });
    }
  };

  const handleLike = async (id) => {
    if (!checkLogin()) return;
    try {
      const res = await apiInstance.post(`presentations/${id}/like/`, { user: userData.user_id });
      const count = res?.data?.likes_count;
      const upd = list => list.map(v => v.id === id
        ? { ...v, likes_count: typeof count === 'number' ? count : (v.likes_count || 0) + 1 }
        : v
      );
      setVideos(upd);
      setMediaList(prev => upd(prev));
    } catch { /* silent */ }
  };

  const handleCopyLink = async (item) => {
    const path = item.type === 'presentation' ? `/presentation/${item.id}/` : `/detail/${item.slug}/`;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      Toast.fire({ icon: 'success', title: 'Lien copié !' });
    } catch {
      Toast.fire({ icon: 'error', title: 'Impossible de copier' });
    }
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const handleCommentIconClick = (presentation) => {
    if (!checkLogin()) return;
    setSelectedPresentation(presentation);
    setReplyingTo(null);
    setCommentValue('');
    setReplyValue('');
  };

  const handleCloseComments = () => {
    setSelectedPresentation(null);
    setReplyingTo(null);
    setCommentValue('');
    setReplyValue('');
  };

  const handleSendComment = async (presentationId, rawContent, parentId = null) => {
    if (!checkLogin()) return;
    const content = rawContent.trim().slice(0, MAX_COMMENT_LENGTH);
    if (!content) return;
    try {
      const res = await apiInstance.post('comments/create/', {
        presentation: presentationId,
        content,
        user: userData.user_id,
        parent: parentId,
      });
      const current = selectedPresentation.comments || [];
      const updated = parentId
        ? current.map(c => c.id === parentId ? { ...c, replies: [...(c.replies || []), res.data] } : c)
        : [...current, res.data];
      const updatedItem = { ...selectedPresentation, comments: updated };
      const upd = list => list.map(v => v.id === presentationId ? updatedItem : v);
      setVideos(upd);
      setMediaList(upd);
      setSelectedPresentation(updatedItem);
      if (parentId) { setReplyValue(''); setReplyingTo(null); }
      else { setCommentValue(''); commentInputRef.current?.focus(); }
    } catch {
      Toast.fire({ icon: 'error', title: 'Erreur envoi commentaire' });
    }
  };

  // ── Vendor Reviews ────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!checkLogin()) return;
    if (reviewRating === 0) { Toast.fire({ icon: 'warning', title: 'Sélectionnez une note (1–5 étoiles).' }); return; }
    try {
      setReviewSubmitting(true);
      const { data } = await apiInstance.post(`vendor-reviews/${vendor?.id}/`, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setVendorReviews(prev => {
        const exists = prev.find(r => r.user === data.user);
        return exists ? prev.map(r => r.user === data.user ? data : r) : [data, ...prev];
      });
      setReviewRating(0);
      setReviewComment('');
      Toast.fire({ icon: 'success', title: 'Avis publié !' });
    } catch (err) {
      Toast.fire({ icon: 'error', title: err?.response?.data?.message || 'Erreur lors de l\'envoi.' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return <SkeletonLoader />;

  const avgRating = vendorReviews.length
    ? (vendorReviews.reduce((s, r) => s + r.rating, 0) / vendorReviews.length).toFixed(1)
    : null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="cs-container">
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />

      {/* ══════════════════ LIGHTBOX ══════════════════ */}
      {lightboxOpen && (
        <div className="cs-lb-overlay">
          <button className="cs-lb-close" onClick={closeLightbox} aria-label="Fermer">
            <i className="fas fa-arrow-left" />
          </button>

          <div className="cs-lb-snap cs-hide-scroll" ref={snapContainerRef}>
            {mediaList.map((item, index) => {
              const vendorPath = item.vendor?.user === userData?.user_id
                ? '/profile/'
                : `/customer/${item.vendor?.slug}/`;
              return (
                <div key={`${item.type}-${item.id}-${index}`} className="cs-lb-item">

                  {/* Média background */}
                  <div className="cs-lb-media">
                    {mediaType === 'product' ? (
                      <ProductSlider item={item} />
                    ) : (
                      <video
                        ref={el => { if (el) videoRefs.current[index] = el; }}
                        src={item.video}
                        className="cs-lb-video"
                        loop muted playsInline
                        onClick={e => e.target.paused ? e.target.play() : e.target.pause()}
                      />
                    )}
                  </div>

                  {/* Gradients */}
                  <div className="cs-lb-grad-top" />
                  <div className="cs-lb-gradient" />

                  {/* ── Info bas-gauche (identique au .info du feed) ── */}
                  <div className="cs-lb-info">

                    {/* Chip vendeur */}
                    <div className="cs-lb-vendor-chip">
                      <Link to={vendorPath} onClick={e => e.stopPropagation()}>
                        <img
                          src={item.vendor?.image || vendor?.image}
                          className="cs-lb-vendor-avatar"
                          alt={item.vendor?.name || vendor?.name}
                        />
                      </Link>
                      <Link to={vendorPath} className="cs-lb-vendor-name" onClick={e => e.stopPropagation()}>
                        {item.vendor?.name || vendor?.name}
                      </Link>
                      {item.vendor?.user !== userData?.user_id && (
                        <span
                          className={`cs-lb-follow-chip${followStates[item.vendor?.id] ? ' followed' : ''}`}
                          onClick={() => userData ? toggleFollow(userData.user_id, item.vendor?.id) : setShowLogin(true)}
                        >
                          {followStates[item.vendor?.id] ? 'Abonné' : '+ Suivre'}
                        </span>
                      )}
                    </div>

                    <h2 className="cs-lb-title">{item.title}</h2>

                    {item.description && (
                      <p className="cs-lb-desc">{item.description}</p>
                    )}

                    {/* Prix (produit uniquement) */}
                    {mediaType === 'product' && item.price && (
                      <div className="cs-lb-price-row">
                        {item.old_price && Number(item.old_price) > Number(item.price) && (
                          <span className="cs-lb-price-old">{fmtPrice(item.old_price)} frs</span>
                        )}
                        <span className="cs-lb-price-current">{fmtPrice(item.price)} frs</span>
                      </div>
                    )}

                    {/* CTA Acheter (produit uniquement) */}
                    {mediaType === 'product' && (
                      <div className="cs-lb-cta-row">
                        <button className="cs-lb-buy-btn" onClick={() => handleOrderClick(item)}>
                          <i className="fas fa-shopping-bag" /> Acheter
                        </button>
                        <button className="cs-lb-wishlist-btn" onClick={() => addToWishList(item.id)}>
                          <i className="fas fa-heart" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Actions colonne droite (identique au .actions du feed) ── */}
                  <div className="cs-lb-actions">
                    {/* Avatar vendeur */}
                    <Link to={vendorPath} onClick={e => e.stopPropagation()}>
                      <img
                        src={item.vendor?.image || vendor?.image}
                        className="cs-lb-avatar"
                        alt={item.vendor?.name || vendor?.name}
                      />
                    </Link>

                    {/* Boutons selon le type */}
                    {mediaType === 'video' ? (
                      <>
                        <div className="cs-lb-action-btn" onClick={() => handleLike(item.id)}>
                          <div className="cs-lb-action-icon"><i className="fas fa-heart" /></div>
                          <span>{item.likes_count || 0}</span>
                        </div>
                        <div className="cs-lb-action-btn" onClick={() => handleCommentIconClick(item)}>
                          <div className="cs-lb-action-icon"><i className="fas fa-comment-dots" /></div>
                          <span>{item.comments?.length || 0}</span>
                        </div>
                        <div className="cs-lb-action-btn" onClick={() => handleCopyLink(item)}>
                          <div className="cs-lb-action-icon"><i className="fas fa-link" /></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cs-lb-action-btn">
                          <div className="cs-lb-action-icon"><i className="fas fa-star" /></div>
                          <span>{item.rating ? Number(item.rating).toFixed(1) : '0.0'}</span>
                        </div>
                        <div className="cs-lb-action-btn" onClick={() => setSelectedProduct(item)}>
                          <div className="cs-lb-action-icon"><i className="fas fa-comment-dots" /></div>
                          <span>{item.rating_count || 0}</span>
                        </div>
                        <div className="cs-lb-action-btn" onClick={() => handleCopyLink(item)}>
                          <div className="cs-lb-action-icon"><i className="fas fa-link" /></div>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════ OVERLAY : AVIS PRODUIT ══════════════════ */}
      {selectedProduct && (
        <div className="cs-panel-overlay" onClick={e => e.target === e.currentTarget && setSelectedProduct(null)}>
          <div className="cs-panel">
            <div className="cs-panel-handle" />
            <button className="cs-panel-close" onClick={() => setSelectedProduct(null)}>
              <i className="fas fa-times" />
            </button>
            <Review
              product={selectedProduct}
              userData={userData}
              onReviewStatsChange={(id, stats) =>
                setProducts(prev => prev.map(p => p.id === id ? { ...p, ...stats } : p))
              }
            />
          </div>
        </div>
      )}

      {/* ══════════════════ OVERLAY : COMMANDE ══════════════════ */}
      {orderProduct && (
        <div className="cs-panel-overlay" onClick={e => e.target === e.currentTarget && setOrderProduct(null)}>
          <div className="cs-panel">
            <div className="cs-panel-handle" />
            <button className="cs-panel-close" onClick={() => setOrderProduct(null)}>
              <i className="fas fa-times" />
            </button>

            {/* En-tête produit */}
            <div className="cs-panel-product-header">
              {orderProduct.image && (
                <img src={orderProduct.image} alt={orderProduct.title} className="cs-panel-product-img" />
              )}
              <div className="cs-panel-product-meta">
                <p className="cs-panel-product-vendor">@{orderProduct.vendor?.name}</p>
                <h4 className="cs-panel-product-title">{orderProduct.title}</h4>
                <p className="cs-panel-product-price">{fmtPrice(orderProduct.price)} frs</p>
              </div>
            </div>

            {/* Quantité */}
            <div className="cs-field">
              <label className="cs-field-label">Quantité</label>
              <div className="cs-qty-row">
                <button className="cs-qty-btn" onClick={() => setQtyValue(v => Math.max(1, Number(v) - 1))}>
                  <i className="fas fa-minus" />
                </button>
                <span className="cs-qty-val">{qtyValue}</span>
                <button className="cs-qty-btn" onClick={() => setQtyValue(v => Number(v) + 1)}>
                  <i className="fas fa-plus" />
                </button>
              </div>
            </div>

            {/* Tailles */}
            {orderProduct.size?.length > 0 && (
              <div className="cs-field">
                <label className="cs-field-label">
                  Taille
                  {selectedSize[orderProduct.id] && <span className="cs-field-selected"> — {selectedSize[orderProduct.id]}</span>}
                </label>
                <div className="cs-variant-row">
                  {orderProduct.size.map((s, i) => (
                    <button key={i}
                      className={`cs-variant-btn${selectedSize[orderProduct.id] === s.name ? ' cs-variant-btn--active' : ''}`}
                      onClick={() => { setSizeValue(s.name); setSelectedSize(p => ({ ...p, [orderProduct.id]: s.name })); }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Couleurs */}
            {orderProduct.color?.length > 0 && (
              <div className="cs-field">
                <label className="cs-field-label">
                  Couleur
                  {selectedColors[orderProduct.id] && <span className="cs-field-selected"> — {selectedColors[orderProduct.id]}</span>}
                </label>
                <div className="cs-variant-row">
                  {orderProduct.color.map((c, i) => (
                    <button key={i} className="cs-color-swatch"
                      style={{
                        backgroundColor: c.color_code,
                        outline: selectedColors[orderProduct.id] === c.color_code ? '2px solid #000' : '2px solid transparent',
                      }}
                      onClick={() => { setColorValue(c.color_code); setSelectedColors(p => ({ ...p, [orderProduct.id]: c.color_code })); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Adresse */}
            {profileData?.mobile && profileData?.address && profileData?.city && (
              <label className="cs-checkbox-row">
                <input type="checkbox" checked={useProfileAddress} onChange={e => setUseProfileAddress(e.target.checked)} />
                <span>Utiliser mon adresse enregistrée</span>
              </label>
            )}
            {(!useProfileAddress || !profileData?.mobile || !profileData?.address || !profileData?.city) && (
              <>
                {['mobile', 'address', 'city'].map(field => (
                  <div className="cs-field" key={field}>
                    <label className="cs-field-label">{{ mobile: 'Téléphone', address: 'Adresse', city: 'Ville' }[field]}</label>
                    <input className="cs-input" placeholder={{ mobile: '+225 07 00 00 00 00', address: 'Rue, quartier', city: 'Abidjan' }[field]}
                      value={customAddress[field]}
                      onChange={e => setCustomAddress(p => ({ ...p, [field]: e.target.value }))} />
                  </div>
                ))}
              </>
            )}

            {/* Récapitulatif */}
            <div className="cs-order-summary">
              <div className="cs-order-row">
                <span>Sous-total</span>
                <span>{fmtPrice(Number(orderProduct.price) * qtyValue)} frs</span>
              </div>
              <div className="cs-order-row cs-order-fee">
                <span>Commission (5 %)</span>
                <span>−{fmtPrice(Number(orderProduct.price) * qtyValue * 0.05)} frs</span>
              </div>
              <div className="cs-order-row cs-order-total">
                <span>Total débité</span>
                <strong>{fmtPrice(Number(orderProduct.price) * qtyValue)} frs</strong>
              </div>
            </div>

            <button className="cs-btn-paystack"
              onClick={() => handlePayWithPaystack(orderProduct.id, orderProduct.price, orderProduct.vendor?.id)}>
              <i className="fas fa-lock" style={{ marginRight: 8 }} />Payer en sécurité avec Paystack
            </button>
            <button className="cs-btn-wishlist" onClick={() => { addToWishList(orderProduct.id); setOrderProduct(null); }}>
              <i className="fas fa-heart" style={{ marginRight: 8 }} />Ajouter aux favoris
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ OVERLAY : COMMENTAIRES VIDÉO ══════════════════ */}
      {selectedPresentation && (
        <div className="cs-panel-overlay" onClick={e => e.target === e.currentTarget && handleCloseComments()}>
          <div className="cs-panel cs-panel--comments">
            <div className="cs-panel-handle" />
            <button className="cs-panel-close" onClick={handleCloseComments}>
              <i className="fas fa-times" />
            </button>

            <h3 className="cs-panel-title">
              Commentaires
              <span className="cs-panel-title-count">{selectedPresentation.comments?.filter(c => !c.parent).length || 0}</span>
            </h3>

            {/* Liste des commentaires */}
            <div className="cs-comments-list">
              {(selectedPresentation.comments || []).filter(c => !c.parent).length === 0 && (
                <div className="cs-comments-empty">
                  <i className="fas fa-comment-slash" />
                  <p>Aucun commentaire. Soyez le premier !</p>
                </div>
              )}

              {(selectedPresentation.comments || []).filter(c => !c.parent).map(c => (
                <div key={c.id} className="cs-comment-thread">
                  <div className="cs-comment">
                    <div className="cs-comment-avatar-wrap">
                      {c.user_image
                        ? <img src={c.user_image} className="cs-comment-avatar" alt="" />
                        : <div className="cs-comment-avatar cs-comment-avatar--placeholder"><i className="fas fa-user" /></div>
                      }
                    </div>
                    <div className="cs-comment-body">
                      <span className="cs-comment-author">{c.display_name || 'Utilisateur'}</span>
                      <p className="cs-comment-text">{c.content}</p>
                      <button className="cs-comment-reply-btn"
                        onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}>
                        {replyingTo === c.id ? 'Annuler' : 'Répondre'}
                      </button>
                    </div>
                  </div>

                  {/* Réponses */}
                  {(c.replies || []).map(r => (
                    <div key={r.id} className="cs-comment cs-comment--reply">
                      <div className="cs-comment-avatar-wrap">
                        {r.user_image
                          ? <img src={r.user_image} className="cs-comment-avatar cs-comment-avatar--sm" alt="" />
                          : <div className="cs-comment-avatar cs-comment-avatar--sm cs-comment-avatar--placeholder"><i className="fas fa-user" /></div>
                        }
                      </div>
                      <div className="cs-comment-body">
                        <span className="cs-comment-author">{r.display_name || 'Utilisateur'}</span>
                        <p className="cs-comment-text">{r.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Form réponse inline */}
                  {replyingTo === c.id && (
                    <div className="cs-comment-reply-form">
                      <textarea
                        rows={1}
                        maxLength={MAX_COMMENT_LENGTH}
                        placeholder={`Répondre à ${c.display_name || 'Utilisateur'}…`}
                        className="cs-comment-input"
                        value={replyValue}
                        autoFocus
                        onChange={e => setReplyValue(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replyValue.trim() && handleSendComment(selectedPresentation.id, replyValue, c.id); } }}
                      />
                      <button className="cs-comment-send-btn" disabled={!replyValue.trim()}
                        onClick={() => replyValue.trim() && handleSendComment(selectedPresentation.id, replyValue, c.id)}>
                        <i className="fas fa-paper-plane" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Compose bar sticky */}
            <div className="cs-comment-compose">
              <textarea
                ref={commentInputRef}
                rows={1}
                maxLength={MAX_COMMENT_LENGTH}
                className="cs-comment-input"
                placeholder="Ajouter un commentaire…"
                value={commentValue}
                onChange={e => setCommentValue(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commentValue.trim() && handleSendComment(selectedPresentation.id, commentValue); } }}
              />
              <button className="cs-comment-send-btn" disabled={!commentValue.trim()}
                onClick={() => commentValue.trim() && handleSendComment(selectedPresentation.id, commentValue)}>
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ PROFILE HEADER ══════════════════ */}
      <div className="cs-header">
        {/* Top nav */}
        <div className="cs-top-nav">
          <button className="cs-icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <i className="fas fa-arrow-left" />
          </button>
          <span className="cs-top-nav-title">{vendor?.name}</span>
          <button className="cs-icon-btn" aria-label="Options">
            <i className="fas fa-ellipsis-h" />
          </button>
        </div>

        {/* Avatar + stats */}
        <div className="cs-profile-section">
          <div className="cs-avatar-wrap">
            <img src={vendor?.image} alt={vendor?.name} className="cs-avatar" />
            {avgRating && <span className="cs-avatar-rating">★ {avgRating}</span>}
          </div>
          <div className="cs-stats-row">
            <div className="cs-stat">
              <span className="cs-stat-value">{products.length}</span>
              <span className="cs-stat-label">Articles</span>
            </div>
            <div className="cs-stat">
              <span className="cs-stat-value">{vendor?.followers_count ?? '—'}</span>
              <span className="cs-stat-label">Abonnés</span>
            </div>
            <div className="cs-stat">
              <span className="cs-stat-value">{videos.length}</span>
              <span className="cs-stat-label">Vidéos</span>
            </div>
          </div>
        </div>

        {/* Nom + bio */}
        <div className="cs-profile-meta">
          <h1 className="cs-username" style={{ display:'flex', alignItems:'center', gap:8 }}>
            {vendor?.name}
            {vendor?.verified && (
              <span title="Identité vérifiée par Findit" style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:22, height:22, background:'#2563eb', borderRadius:'50%',
                fontSize:12, color:'#fff', flexShrink:0,
              }}>
                <i className="fas fa-check" />
              </span>
            )}
          </h1>
          {vendor?.description && <p className="cs-bio">{vendor.description}</p>}
        </div>

        {/* Boutons */}
        <div className="cs-actions-row">
          {userData?.vendor_id !== vendor?.id && (
            <button
              className={`cs-btn-follow${followStates[vendor?.id] ? ' cs-btn-follow--active' : ''}`}
              onClick={async () => {
                if (!checkLogin()) return;
                const wasFollowing = followStates[vendor?.id] ?? false;
                const result = await toggleFollow(userData?.user_id, vendor?.id);
                if (result?.success) {
                  setVendor(prev => ({
                    ...prev,
                    followers_count: result.followers_count ??
                      Math.max(0, (prev.followers_count || 0) + (result.following ? 1 : -1)),
                  }));
                }
              }}
            >
              {followStates[vendor?.id] ? 'Abonné ✓' : "S'abonner"}
            </button>
          )}
          <button className="cs-btn-msg" onClick={handleStartConversation}>
            <i className="fas fa-paper-plane" style={{ marginRight: 6 }} />Message
          </button>
        </div>
      </div>

      {/* ══════════════════ TABS ══════════════════ */}
      <div className="cs-tabs">
        <button className={`cs-tab-btn${activeTab === 'products' ? ' active' : ''}`} onClick={() => setActiveTab('products')}>
          <i className="fas fa-th-large" />
        </button>
        <button className={`cs-tab-btn${activeTab === 'videos' ? ' active' : ''}`} onClick={() => setActiveTab('videos')}>
          <i className="fas fa-film" />
        </button>
        <button className={`cs-tab-btn${activeTab === 'reviews' ? ' active' : ''}`} onClick={() => setActiveTab('reviews')}>
          <i className="fas fa-star" />
          {vendorReviews.length > 0 && <span className="cs-tab-badge">{vendorReviews.length}</span>}
        </button>
      </div>

      {/* ══════════════════ CONTENT ══════════════════ */}
      <div className="cs-content">

        {/* ── Produits ── */}
        {activeTab === 'products' && (
          <div className="cs-grid">
            {products.map((p, i) => (
              <div className="cs-tile" key={p.id} onClick={() => openLightbox(i, 'product')}>
                <img src={p.image || '/icons/web-app-manifest-192x192.png'} alt={p.title} loading="lazy" />
                {p.solde && <span className="cs-tile-badge">Solde</span>}
                <div className="cs-tile-hover">
                  <span className="cs-tile-hover-price">{fmtPrice(p.price)} frs</span>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="cs-empty">
                <i className="fas fa-box-open" />
                <p>Aucun produit pour l'instant.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Vidéos ── */}
        {activeTab === 'videos' && (
          <div className="cs-grid">
            {videos.map((v, i) => (
              <div className="cs-tile" key={v.id} onClick={() => openLightbox(i, 'video')}>
                <video src={v.video} muted playsInline preload="none" />
                <div className="cs-tile-video-overlay">
                  <i className="fas fa-play cs-tile-play-icon" />
                  {v.likes_count > 0 && (
                    <span className="cs-tile-likes">
                      <i className="fas fa-heart" /> {v.likes_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="cs-empty">
                <i className="fas fa-video-slash" />
                <p>Aucune vidéo pour l'instant.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Avis vendeur ── */}
        {activeTab === 'reviews' && (
          <div className="cs-reviews-tab">

            {/* Résumé */}
            {avgRating && (
              <div className="cs-review-summary">
                <span className="cs-review-avg">{avgRating}</span>
                <div>
                  <div className="cs-review-stars">
                    {[1,2,3,4,5].map(s => (
                      <i key={s} className={`fas fa-star${parseFloat(avgRating) >= s ? ' cs-star-filled' : ' cs-star-empty'}`} />
                    ))}
                  </div>
                  <span className="cs-review-count">{vendorReviews.length} avis</span>
                </div>
              </div>
            )}

            {/* Formulaire */}
            {userData && vendor && userData.vendor_id !== vendor.id && (
              <div className="cs-review-form">
                <p className="cs-review-form-title">Votre avis</p>
                <div className="cs-star-picker">
                  {[1,2,3,4,5].map(s => (
                    <i key={s}
                      className={`fas fa-star cs-star-pick${(reviewHover || reviewRating) >= s ? ' cs-star-filled' : ' cs-star-empty'}`}
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewRating(s)}
                    />
                  ))}
                </div>
                <textarea
                  className="cs-review-textarea"
                  rows={3}
                  maxLength={500}
                  placeholder="Votre commentaire (optionnel)…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                />
                <div className="cs-review-form-footer">
                  <small>{reviewComment.length}/500</small>
                  <button className="cs-btn-review-submit"
                    disabled={reviewSubmitting || reviewRating === 0}
                    onClick={handleSubmitReview}>
                    {reviewSubmitting ? '…' : 'Publier'}
                  </button>
                </div>
              </div>
            )}

            {/* Liste */}
            <div className="cs-review-list">
              {vendorReviews.map(r => (
                <div key={r.id} className="cs-review-item">
                  <div className="cs-review-item-header">
                    {r.user_image
                      ? <img src={r.user_image} className="cs-review-avatar" alt="" />
                      : <div className="cs-review-avatar cs-review-avatar--placeholder"><i className="fas fa-user" /></div>
                    }
                    <div className="cs-review-meta">
                      <span className="cs-review-name">{r.user_name}</span>
                      <div className="cs-review-stars-sm">
                        {[1,2,3,4,5].map(s => (
                          <i key={s} className={`fas fa-star${r.rating >= s ? ' cs-star-filled' : ' cs-star-empty'}`} style={{ fontSize: 11 }} />
                        ))}
                      </div>
                    </div>
                    <span className="cs-review-date">
                      {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p className="cs-review-comment">{r.comment}</p>}
                </div>
              ))}
              {vendorReviews.length === 0 && (
                <div className="cs-empty">Aucun avis. Soyez le premier à noter cette boutique !</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
