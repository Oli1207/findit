import React, { useState, useEffect, useRef, useCallback } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate } from "react-router-dom";
import UserData from "../plugin/UserData";
import Swal from "sweetalert2";
import Review from "./Review";
import "./search.css";
import "./tiktokfeed.css";
import { useFollowStore } from "../../store/useFollowStore";
import BottomBar from "./BottomBar";
import LoginModal from "../auth/LoginModal";
import ProductSlider from "./ProductSlider";
import BuyModal from "./BuyModal";

const Toast = Swal.mixin({
  toast: true, position: "top", showConfirmButton: false,
  timer: 3000, timerProgressBar: true, background: "#1a1a1a", color: "#fff",
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getUrl = (val) => {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (val?.image) return typeof val.image === "string" ? val.image : val.image?.url || null;
  return val?.url || val?.path || null;
};

const normalizeItems = (arr) =>
  (arr || []).map((item) => ({
    ...item,
    type:    item.type || "product",
    image:   getUrl(item.image) || getUrl(item.cover) || null,
    gallery: (item.gallery || []).map((g) => getUrl(g) || getUrl(g?.image)).filter(Boolean),
  }));

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

const TABS = [
  { key: "all",      label: "Tout",     icon: "fas fa-border-all" },
  { key: "products", label: "Produits", icon: "fas fa-shopping-bag" },
  { key: "videos",   label: "Vidéos",   icon: "fas fa-play-circle" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Search() {
  const navigate = useNavigate();
  const userData = UserData();
  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [profileData,    setProfileData]    = useState(null);
  const [categories,     setCategories]     = useState([]);
  const [items,          setItems]          = useState([]);
  const [searchInput,    setSearchInput]    = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTab,      setActiveTab]      = useState("all");  // all|products|videos
  const [mode,           setMode]           = useState("categories");
  const [isSearching,    setIsSearching]    = useState(false);
  const [nextPageUrl,    setNextPageUrl]    = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const debouncedQuery = useDebounce(searchInput, 400);
  const loaderRef      = useRef(null);

  // ── Lightbox TikTok ───────────────────────────────────────────────────────
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const [lightboxList,  setLightboxList]  = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const snapRef   = useRef(null);
  const videoRefs = useRef([]);

  // ── Overlays ──────────────────────────────────────────────────────────────
  const [orderProduct,    setOrderProduct]    = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPresentation, setSelectedPresentation] = useState(null); // comments
  const [commentValue,    setCommentValue]    = useState("");
  const [replyingTo,      setReplyingTo]      = useState(null);
  const [replyValue,      setReplyValue]      = useState("");
  const [showLogin,       setShowLogin]       = useState(false);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.user_id) return;
    apiInstance.get(`user/profile/${userData.user_id}/`)
      .then((r) => setProfileData(r.data)).catch(() => {});
  }, [userData?.user_id]);

  // ── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    apiInstance.get("category/")
      .then((r) => setCategories(r.data.results || r.data || []))
      .catch(() => setCategories([]));
  }, []);

  // ── Search on debounced query or tab change ───────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim() && !activeCategory) {
      setMode("categories");
      setItems([]);
      setNextPageUrl(null);
      return;
    }
    if (debouncedQuery.trim()) runSearch(debouncedQuery.trim());
    else if (activeCategory) runCategorySearch(activeCategory, activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeTab]);

  const buildParams = (extra = {}) => ({
    type: activeTab,
    page: 1,
    ...extra,
  });

  const runSearch = async (q) => {
    setIsSearching(true);
    setMode("results");
    setActiveCategory(null);
    try {
      const { data } = await apiInstance.get("search/", { params: buildParams({ query: q }) });
      const list = normalizeItems(data.results || []);
      setItems(list);
      setNextPageUrl(data.next || null);
      syncFollowStates(list);
    } catch { setItems([]); }
    finally { setIsSearching(false); }
  };

  const runCategorySearch = async (cat, tab = activeTab) => {
    setIsSearching(true);
    setMode("results");
    try {
      const { data } = await apiInstance.get("search/", {
        params: buildParams({ category_id: cat.id, type: tab }),
      });
      const list = normalizeItems(data.results || []);
      setItems(list);
      setNextPageUrl(data.next || null);
      syncFollowStates(list);
    } catch { setItems([]); }
    finally { setIsSearching(false); }
  };

  const handleCategoryClick = async (cat) => {
    setActiveCategory(cat);
    setSearchInput("");
    setActiveTab("all");
    await runCategorySearch(cat, "all");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (mode === "results") {
      if (searchInput.trim()) runSearch(searchInput.trim());
      else if (activeCategory) runCategorySearch(activeCategory, tab);
    }
  };

  const syncFollowStates = (list) => {
    const ids = list.map((p) => p.vendor?.id).filter(Boolean);
    if (ids.length) fetchFollowStates(ids, userData?.user_id);
  };

  const handleBack = () => {
    setMode("categories");
    setItems([]);
    setSearchInput("");
    setNextPageUrl(null);
    setActiveCategory(null);
  };

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const fetchMore = useCallback(async () => {
    if (!nextPageUrl || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const params = nextPageUrl.startsWith("?")
        ? Object.fromEntries(new URLSearchParams(nextPageUrl.slice(1)))
        : {};
      const { data } = await apiInstance.get("search/", {
        params: { ...params, type: activeTab },
      });
      const list = normalizeItems(data.results || []);
      setItems((prev) => [...prev, ...list]);
      setNextPageUrl(data.next || null);
    } catch { /* ignore */ }
    finally { setIsFetchingMore(false); }
  }, [nextPageUrl, isFetchingMore, activeTab]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) fetchMore(); },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore]);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = (idx) => {
    videoRefs.current = [];
    setLightboxList(items);
    setLightboxIndex(idx);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
    videoRefs.current.forEach((v) => v?.pause());
  };

  useEffect(() => {
    if (!lightboxOpen || !snapRef.current) return;
    snapRef.current.scrollTop = lightboxIndex * window.innerHeight;
  }, [lightboxOpen, lightboxIndex]);

  // Autoplay dans la lightbox
  useEffect(() => {
    if (!lightboxOpen || !snapRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting) {
            videoRefs.current.forEach((x) => x && x !== v && x.pause());
            v.play().catch(() => {});
          } else v.pause();
        });
      },
      { root: snapRef.current, threshold: 0.6 }
    );
    videoRefs.current.forEach((v) => v && obs.observe(v));
    return () => obs.disconnect();
  }, [lightboxOpen, lightboxList]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleOrderClick = (item) => {
    if (!userData) { setShowLogin(true); return; }
    setOrderProduct(item);
  };

  const addToWishList = async (productId) => {
    if (!userData) { setShowLogin(true); return; }
    const fd = new FormData();
    fd.append("product_id", productId);
    fd.append("user_id", userData.user_id);
    try {
      const { data } = await apiInstance.post(`customer/wishlist/${userData.user_id}/`, fd);
      Toast.fire({ icon: "success", title: data.message });
    } catch { Toast.fire({ icon: "error", title: "Erreur wishlist" }); }
  };

  const handleLike = async (id) => {
    if (!userData) { setShowLogin(true); return; }
    try {
      const res = await apiInstance.post(`presentations/${id}/like/`, { user: userData.user_id });
      setItems((prev) =>
        prev.map((it) =>
          it.id === id && it.type === "presentation"
            ? { ...it, likes_count: res.data.likes_count }
            : it
        )
      );
      setLightboxList((prev) =>
        prev.map((it) =>
          it.id === id && it.type === "presentation"
            ? { ...it, likes_count: res.data.likes_count }
            : it
        )
      );
    } catch { Toast.fire({ icon: "error", title: "Erreur like" }); }
  };

  // Ouvre le panel commentaires et charge les commentaires complets
  const openCommentOverlay = async (presentation) => {
    setSelectedPresentation({ ...presentation, comments: presentation.comments || [] });
    try {
      const { data } = await apiInstance.get(`presentations/${presentation.id}/`);
      setSelectedPresentation((prev) =>
        prev?.id === presentation.id ? { ...prev, ...data } : prev
      );
    } catch {/* silencieux */}
  };

  const handleComment = async (e, presentationId, content, parentId = null) => {
    e.preventDefault();
    if (!userData) { setShowLogin(true); return; }
    if (!content.trim()) return;
    try {
      const res = await apiInstance.post("comments/create/", {
        presentation: presentationId, content, user: userData.user_id, parent: parentId,
      });
      setSelectedPresentation((prev) => {
        if (!prev) return prev;
        if (parentId) {
          return {
            ...prev,
            comments: prev.comments.map((c) =>
              c.id === parentId ? { ...c, replies: [...(c.replies || []), res.data] } : c
            ),
          };
        }
        return { ...prev, comments: [...(prev.comments || []), res.data] };
      });
      if (parentId) { setReplyValue(""); setReplyingTo(null); }
      else setCommentValue("");
    } catch { Toast.fire({ icon: "error", title: "Erreur commentaire" }); }
  };

  const copyLink = (item) => {
    const url = item.type === "presentation"
      ? `${window.location.origin}/?presentation=${item.id}`
      : `${window.location.origin}/detail/${item.slug}`;
    navigator.clipboard.writeText(url);
    Toast.fire({ icon: "success", title: "Lien copié !" });
  };

  const fmtPrice = (n) => Math.round(Number(n)).toLocaleString("fr-FR");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const productsCount = items.filter((i) => i.type === "product").length;
  const videosCount   = items.filter((i) => i.type === "presentation").length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="srch-root">
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />

      {/* ── Header fixe ─────────────────────────────────────────────────── */}
      <header className="srch-header">
        {mode === "results" ? (
          <button className="srch-back-btn" onClick={handleBack} aria-label="Retour">
            <i className="fas fa-arrow-left" />
          </button>
        ) : (
          <i className="fas fa-search srch-header-icon" />
        )}
        <div className="srch-input-wrap">
          <input
            className="srch-input"
            type="text"
            placeholder="chemise, robe, haul…"
            value={searchInput}
            autoComplete="off"
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
          {searchInput && (
            <button className="srch-clear-btn" onClick={() => setSearchInput("")}>
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </header>

      {/* ── Lightbox TikTok ─────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div className="srch-lb-overlay">
          <button className="srch-lb-close" onClick={closeLightbox}>
            <i className="fas fa-times" />
          </button>
          <div className="srch-lb-snap" ref={snapRef}>
            {lightboxList.map((item, idx) => (
              <div key={`lb-${item.type}-${item.id}`} className="srch-lb-item">

                {/* ── Média ─────────────────────────────────────────────── */}
                {item.type === "presentation" ? (
                  <video
                    ref={(el) => { if (el) videoRefs.current[idx] = el; }}
                    src={item.video}
                    className="feed-image"
                    style={{ objectFit: "cover" }}
                    loop muted playsInline
                    onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
                  />
                ) : (
                  <ProductSlider item={item} />
                )}

                <div className="feed-gradient-top" />
                <div className="feed-gradient" />

                {/* ── Produit ───────────────────────────────────────────── */}
                {item.type === "product" ? (
                  <>
                    <div className="info">
                      <div className="vendor-chip">
                        <Link to={item.vendor?.user === userData?.user_id ? "/profile/" : `/customer/${item.vendor?.slug}/`}>
                          <img src={item.vendor?.image} className="vendor-avatar-sm" alt="" />
                        </Link>
                        <Link
                          to={item.vendor?.user === userData?.user_id ? "/profile/" : `/customer/${item.vendor?.slug}/`}
                          className="vendor-name-link"
                        >
                          {item.vendor?.name}
                        </Link>
                        {item.vendor?.user !== userData?.user_id && (
                          <span
                            className={`follow-chip${followStates[item.vendor?.id] ? " following" : ""}`}
                            onClick={() => userData ? toggleFollow(userData.user_id, item.vendor?.id) : setShowLogin(true)}
                          >
                            {followStates[item.vendor?.id] ? "Abonné" : "+ Suivre"}
                          </span>
                        )}
                      </div>
                      <h2>{item.title}</h2>
                      <div className="price-row">
                        {item.old_price && Number(item.old_price) > Number(item.price) && (
                          <span className="price-old">{fmtPrice(item.old_price)} frs</span>
                        )}
                        <span className="price-current">{fmtPrice(item.price)} frs</span>
                      </div>
                      <div className="feed-cta-row">
                        <button className="feed-buy-btn" onClick={(e) => { e.stopPropagation(); handleOrderClick(item); }}>
                          <i className="fas fa-shopping-bag" /> Acheter
                        </button>
                        <button className="feed-wishlist-btn" onClick={(e) => { e.stopPropagation(); addToWishList(item.id); }}>
                          <i className="fas fa-heart" />
                        </button>
                      </div>
                      {item.category?.title && (
                        <span className="category-tag" style={{ marginTop: 6 }}>{item.category.title}</span>
                      )}
                    </div>

                    <div className="actions">
                      <div className="action-btn">
                        <div className="action-icon-wrap"><i className="fas fa-star" /></div>
                        <span>{item.rating ? Number(item.rating).toFixed(1) : "0.0"}</span>
                      </div>
                      <div className="action-btn" onClick={() => setSelectedProduct(item)}>
                        <div className="action-icon-wrap"><i className="fas fa-comment-dots" /></div>
                        <span>{item.rating_count || 0}</span>
                      </div>
                      <div className="action-btn" onClick={() => copyLink(item)}>
                        <div className="action-icon-wrap"><i className="fas fa-link" /></div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Présentation ──────────────────────────────────────── */
                  <>
                    <div className="info">
                      <div className="vendor-chip">
                        <Link to={item.vendor?.user === userData?.user_id ? "/profile/" : `/customer/${item.vendor?.slug}/`}>
                          <img src={item.vendor?.image} className="vendor-avatar-sm" alt="" />
                        </Link>
                        <Link
                          to={item.vendor?.user === userData?.user_id ? "/profile/" : `/customer/${item.vendor?.slug}/`}
                          className="vendor-name-link"
                        >
                          {item.vendor?.name}
                        </Link>
                        {item.vendor?.user !== userData?.user_id && (
                          <span
                            className={`follow-chip${followStates[item.vendor?.id] ? " following" : ""}`}
                            onClick={() => userData ? toggleFollow(userData.user_id, item.vendor?.id) : setShowLogin(true)}
                          >
                            {followStates[item.vendor?.id] ? "Abonné" : "+ Suivre"}
                          </span>
                        )}
                      </div>
                      <h2 style={{ marginBottom: 6 }}>{item.title}</h2>
                      {item.description && (
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", margin: "0 0 4px" }}>
                          {item.description}
                        </p>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer"
                          style={{ color: "#DF468F", fontSize: 12 }}
                        >
                          {item.link}
                        </a>
                      )}
                      {item.category?.title && (
                        <span className="category-tag" style={{ marginTop: 6 }}>{item.category.title}</span>
                      )}
                    </div>

                    <div className="actions">
                      <div className="action-btn" onClick={() => handleLike(item.id)}>
                        <div className="action-icon-wrap"><i className="fas fa-heart" /></div>
                        <span>{item.likes_count || 0}</span>
                      </div>
                      <div className="action-btn" onClick={() => openCommentOverlay(lightboxList[idx])}>
                        <div className="action-icon-wrap"><i className="fas fa-comment-dots" /></div>
                        <span>{item.comments_count || 0}</span>
                      </div>
                      <div className="action-btn" onClick={() => copyLink(item)}>
                        <div className="action-icon-wrap"><i className="fas fa-link" /></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overlay Review ──────────────────────────────────────────────── */}
      {selectedProduct && (
        <div className="srch-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedProduct(null)}>
          <div className="srch-panel">
            <div className="srch-panel-handle" />
            <button className="srch-panel-close" onClick={() => setSelectedProduct(null)}>
              <i className="fas fa-times" />
            </button>
            <Review product={selectedProduct} userData={userData}
              onReviewStatsChange={(id, stats) =>
                setItems((prev) => prev.map((p) => p.id === id ? { ...p, ...stats } : p))
              }
            />
          </div>
        </div>
      )}

      {/* ── Overlay Commentaires vidéo ───────────────────────────────────── */}
      {selectedPresentation && (
        <div className="srch-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedPresentation(null)}>
          <div className="srch-panel">
            <div className="srch-panel-handle" />
            <button className="srch-panel-close" onClick={() => { setSelectedPresentation(null); setReplyingTo(null); }}>
              <i className="fas fa-times" />
            </button>
            <h4 style={{ color: "#f0f0f0", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              <i className="fas fa-comment-dots" style={{ marginRight: 8, color: "#DF468F" }} />
              Commentaires
            </h4>
            <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 14 }}>
              {(selectedPresentation.comments || [])
                .filter((c) => c.parent === null)
                .map((comment) => (
                  <div key={comment.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: "#f0f0f0", fontSize: 13 }}>{comment.display_name}</span>
                        <span style={{ color: "#aaa", fontSize: 13, marginLeft: 8 }}>{comment.content}</span>
                      </div>
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer" }}
                      >
                        Répondre
                      </button>
                    </div>
                    {(comment.replies || []).map((r) => (
                      <div key={r.id} style={{ marginLeft: 20, marginTop: 6, color: "#aaa", fontSize: 12, fontStyle: "italic" }}>
                        ↳ <strong style={{ color: "#ccc" }}>{r.display_name}</strong> {r.content}
                      </div>
                    ))}
                    {replyingTo === comment.id && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          className="srch-form-input"
                          placeholder="Votre réponse…"
                          value={replyValue}
                          onChange={(e) => setReplyValue(e.target.value)}
                          style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                        />
                        <button
                          className="srch-btn-paystack"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={(e) => handleComment(e, selectedPresentation.id, replyValue, comment.id)}
                        >
                          Envoyer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="srch-form-input"
                placeholder="Votre commentaire…"
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                style={{ flex: 1, padding: "10px 14px" }}
              />
              <button
                className="srch-btn-paystack"
                style={{ width: "auto", padding: "10px 16px" }}
                onClick={(e) => handleComment(e, selectedPresentation.id, commentValue)}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal commande ──────────────────────────────────────────────── */}
      {orderProduct && (
        <BuyModal
          product={orderProduct}
          userData={userData}
          profileData={profileData}
          onClose={() => setOrderProduct(null)}
          onWishlist={(id) => addToWishList(id)}
        />
      )}

      {/* ── Contenu principal ────────────────────────────────────────────── */}
      <main className="srch-main">

        {/* ── MODE : Catégories ─────────────────────────────────────────── */}
        {mode === "categories" && (
          <>
            <p className="srch-section-label">Parcourir les catégories</p>
            <div className="srch-cat-grid">
              {categories.map((c) => (
                <div key={c.id} className="srch-cat-card" onClick={() => handleCategoryClick(c)}>
                  {c.image && <img src={c.image} alt={c.title} className="srch-cat-img" loading="lazy" />}
                  <div className="srch-cat-overlay">
                    <span className="srch-cat-label">{c.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MODE : Résultats ──────────────────────────────────────────── */}
        {mode === "results" && (
          <>
            {/* Chapeau */}
            <div className="srch-results-header">
              {activeCategory ? (
                <span className="srch-results-title">
                  <i className="fas fa-th" style={{ marginRight: 6 }} />{activeCategory.title}
                </span>
              ) : (
                <span className="srch-results-title">
                  Résultats pour <em>"{searchInput || debouncedQuery}"</em>
                </span>
              )}
              {!isSearching && items.length > 0 && (
                <span className="srch-results-count">{items.length} résultat{items.length > 1 ? "s" : ""}</span>
              )}
            </div>

            {/* ── Tabs filtres ──── */}
            <div className="srch-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`srch-tab${activeTab === tab.key ? " srch-tab--active" : ""}`}
                  onClick={() => handleTabChange(tab.key)}
                >
                  <i className={tab.icon} />
                  {tab.label}
                  {tab.key === "products" && productsCount > 0 && (
                    <span className="srch-tab-count">{productsCount}</span>
                  )}
                  {tab.key === "videos" && videosCount > 0 && (
                    <span className="srch-tab-count">{videosCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Loading */}
            {isSearching && (
              <div className="srch-loading">
                <div className="srch-spinner" />
                <span>Recherche en cours…</span>
              </div>
            )}

            {/* Grid résultats */}
            {!isSearching && items.length > 0 && (
              <div className="srch-product-grid">
                {items.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.id}-${idx}`}
                    className={`srch-product-card${item.type === "presentation" ? " srch-video-card" : ""}`}
                    onClick={() => openLightbox(idx)}
                  >
                    <div className="srch-card-img-wrap">
                      {item.type === "presentation" ? (
                        <>
                          {/* Thumbnail vidéo : image vendeur ou poster */}
                          <img
                            src={item.vendor?.image || "/icons/web-app-manifest-192x192.png"}
                            alt={item.title}
                            className="srch-card-img srch-card-img--video-thumb"
                            loading="lazy"
                          />
                          <div className="srch-video-play-overlay">
                            <i className="fas fa-play" />
                          </div>
                          <span className="srch-badge-video">
                            <i className="fas fa-video" /> Vidéo
                          </span>
                        </>
                      ) : (
                        <>
                          <img
                            src={item.image || "/icons/web-app-manifest-192x192.png"}
                            alt={item.title}
                            className="srch-card-img"
                            loading="lazy"
                          />
                          {item.solde && <span className="srch-badge-sale">Solde</span>}
                        </>
                      )}
                    </div>
                    <div className="srch-card-body">
                      <p className="srch-card-vendor">@{item.vendor?.name}</p>
                      <p className="srch-card-title">{item.title || item.description}</p>
                      <div className="srch-card-footer">
                        {item.type === "product" ? (
                          <span className="srch-card-price">
                            {item.old_price && Number(item.old_price) > Number(item.price) && (
                              <span className="srch-card-old">{fmtPrice(item.old_price)}</span>
                            )}
                            {fmtPrice(item.price)} frs
                          </span>
                        ) : (
                          <span className="srch-card-video-stats">
                            <i className="fas fa-heart" /> {item.likes_count || 0}
                            <i className="fas fa-comment-dots" style={{ marginLeft: 8 }} /> {item.comments_count || 0}
                          </span>
                        )}
                        {item.type === "product" && item.rating > 0 && (
                          <span className="srch-card-rating">
                            <i className="fas fa-star" /> {Number(item.rating).toFixed(1)}
                          </span>
                        )}
                        {item.category && (
                          <span className="srch-card-cat-chip">{item.category.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aucun résultat */}
            {!isSearching && items.length === 0 && (
              <div className="srch-empty">
                <i className="fas fa-search-minus srch-empty-icon" />
                <p className="srch-empty-title">Aucun résultat</p>
                <p className="srch-empty-sub">
                  {activeCategory
                    ? `Aucun contenu dans "${activeCategory.title}"`
                    : `Aucun article pour "${debouncedQuery}"`}
                </p>
                <button className="srch-empty-btn" onClick={handleBack}>
                  Parcourir les catégories
                </button>
              </div>
            )}

            {/* Sentinel infinite scroll */}
            <div ref={loaderRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isFetchingMore && <div className="srch-spinner srch-spinner-sm" />}
            </div>
          </>
        )}
      </main>

      <BottomBar />
    </div>
  );
}
