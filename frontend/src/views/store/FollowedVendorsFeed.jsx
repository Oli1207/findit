// FollowedVendorsFeed.jsx
import React, { useState, useEffect, useRef } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate } from "react-router-dom";
import GetCurrentAddress from "../plugin/UserCountry";
import UserData from "../plugin/UserData";
import { useMediaQuery } from "react-responsive";
import Swal from "sweetalert2";
import Review from "./Review";
import "./tiktokfeed.css";
import { useFollowStore } from "../../store/useFollowStore";
import ReloadPrompt from "../../Prompt";
import InstallButton from "../../InstallButton";
import { setUser } from "../../utils/auth";
import { subscribeUserToPush } from "../../utils/push";
import { syncReviewsIfOnline } from "./ReviewOffline";
import { useSwipeable } from "react-swipeable";
import BottomBar from "./BottomBar";
import LoginModal from "../auth/LoginModal";
import ProductSlider from "./ProductSlider";
import BuyModal from "./BuyModal";
import { useTheme } from "../../context/ThemeContext";

const FollowedVendorsFeed = () => {
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const axios = apiInstance;
  const userData = UserData();
  const { toggle, isDark } = useTheme();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const currentAddress = GetCurrentAddress();
  const navigate = useNavigate();
  const [orderProduct, setOrderProduct] = useState(null);
  const [specificationStates, setSpecificationStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [commentValue, setCommentValue] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyValue, setReplyValue] = useState("");
  const videoRefs = useRef([]);
  // Ne jamais réinitialiser videoRefs.current en dehors d'un effet — violation Rules of Hooks sinon
  const [expandedText, setExpandedText] = useState({});

  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const startTimesRef = useRef({});

  // --------- SYNC + PROFIL ---------
  // ⚠️ Tous les hooks DOIVENT être déclarés avant tout return conditionnel
  useEffect(() => {
    setUser();
  }, []);

  useEffect(() => {
    const syncAll = () => {
      if (navigator.onLine) {
        syncReviewsIfOnline();
      }
    };

    syncAll();
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`user/profile/${userData?.user_id}/`);
        setProfileData(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    if (userData?.user_id) {
      fetchProfile();
    }
  }, [userData?.user_id]);

  // ─── Normalisation URLs images ───────────────────────────────────────────────
  const getUrl = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (val.image) {
      if (typeof val.image === "string") return val.image;
      if (typeof val.image === "object") return val.image.url || val.image.path || null;
    }
    return val.url || val.path || null;
  };

  const normalizeItems = (data) =>
    data.map((item) => {
      const resolvedType = item.type || (item.video ? "presentation" : "product");
      const mainImage = getUrl(item.image) || getUrl(item.cover) || getUrl(item.thumbnail) || null;
      const galleryImages = (item.gallery || [])
        .map((g) => (typeof g === "string" ? g : getUrl(g) || getUrl(g?.image) || null))
        .filter(Boolean);
      return { ...item, type: resolvedType, image: mainImage, gallery: galleryImages };
    });

  // ─── Fetch feed suivis (avec pagination) ─────────────────────────────────────
  const fetchProducts = async (pageNum = 1, append = false) => {
    if (!userData?.user_id) { setLoading(false); return; }
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await axios.get(
        `followed-feed/unified/${userData.user_id}/?page=${pageNum}`
      );
      const data     = response.data;
      const rawItems = Array.isArray(data) ? data : (data.results || []);
      const more     = Array.isArray(data) ? false : (data.has_more ?? false);
      const transformed = normalizeItems(rawItems);

      if (append) setProducts((prev) => [...prev, ...transformed]);
      else        setProducts(transformed);

      setHasMore(more);
      setCurrentPage(pageNum);

      const vendorIds = rawItems.map((p) => p.vendor?.id).filter(Boolean);
      if (vendorIds.length) await fetchFollowStates(vendorIds, userData.user_id);
    } catch (error) {
      console.error("Erreur chargement feed suivis :", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [userData?.user_id]);

  // ─── Infinite scroll ──────────────────────────────────────────────────────────
  const feedItemRefsF = useRef([]);
  useEffect(() => {
    if (!hasMore || loadingMore || products.length === 0) return;
    const triggerIndex = products.length - 4;
    if (triggerIndex < 0) return;
    const el = feedItemRefsF.current[triggerIndex];
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { observer.disconnect(); fetchProducts(currentPage + 1, true); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [products.length, hasMore, loadingMore, currentPage]);

  
  // --------- OBSERVER VUES PRODUITS ---------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const productId = entry.target.getAttribute("data-id");
          if (!productId) return;

          if (entry.isIntersecting) {
            if (!startTimesRef.current[productId]) {
              startTimesRef.current[productId] = Date.now();
            }
          } else {
            const startTime = startTimesRef.current[productId];
            if (startTime) {
              const duration = (Date.now() - startTime) / 1000;

              if (duration >= 15) {
                sendView(productId, duration);
              }
              delete startTimesRef.current[productId];
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    const items = document.querySelectorAll(".feed-item[data-id]");
    items.forEach((el) => observer.observe(el));

    return () => {
      items.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const sendView = async (productId, duration) => {
    try {
      await axios.post(`products/${productId}/view/`, {
        product_id: productId,
        duration: duration,
      });
    } catch (_) {
      // silencieux – non critique
    }
  };

  // --------- AUTOPLAY / PAUSE VIDÉOS ---------
  useEffect(() => {
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.7 };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          videoRefs.current.forEach((v) => {
            if (v !== video && v) v.pause();
          });
          video.play();
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, [products]);

  // --------- ACTIONS PRODUITS ---------
  const handleOrderClick = (product) => {
    if (!userData) {
      setShowLogin(true);
      return;
    }
    setOrderProduct(product);
  };

  const handleCloseOrder = () => {
    setOrderProduct(null);
  };

  const handleReviewIconClick = (product) => {
    if (!userData) {
      setShowLogin(true);
      return;
    }
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
  };

  const addToWishList = async (productId) => {
    if (!userData) { setShowLogin(true); return; }
    const formdata = new FormData();
    formdata.append("product_id", productId);
    formdata.append("user_id", userData?.user_id);
    try {
      const res = await axios.post(`customer/wishlist/${userData?.user_id}/`, formdata);
      Swal.fire({
        toast: true, position: "bottom",
        icon: "success", title: res.data.message,
        showConfirmButton: false, timer: 2000,
      });
    } catch {
      Swal.fire({
        toast: true, position: "bottom",
        icon: "error", title: "Erreur lors de l'ajout",
        showConfirmButton: false, timer: 2000,
      });
    }
  };

  const toggleSpecification = (productId) => {
    setSpecificationStates((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleCopyLink = (product) => {
    const url = `${window.location.origin}/detail/${product.slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        Swal.fire({
          toast: true,
          position: "bottom",
          icon: "success",
          title: "Lien copié dans le presse-papier",
          showConfirmButton: false,
          timer: 2000,
        });
      })
      .catch((err) => {
        console.error("Erreur copie lien :", err);
      });
  };

  // --------- PUSH NOTIFS ---------
  useEffect(() => {
    if (userData) {
      subscribeUserToPush();
    }
  }, [userData]);

  // --------- VIDÉOS : LIKE + COMMENTAIRES ---------
  const handleLike = async (id) => {
    if (!userData) {
      setShowLogin(true);
      return;
    }
    try {
      const res = await apiInstance.post(`presentations/${id}/like/`, {
        user: userData?.user_id,
      });

      const updatedItems = products.map((item) =>
        item.id === id && item.type === "presentation"
          ? { ...item, likes_count: res.data.likes_count }
          : item
      );

      setProducts(updatedItems);
    } catch (err) {
      console.error("Erreur like:", err);
    }
  };

  const handleComment = async (e, presentationId, content, parentId = null) => {
    e.preventDefault();

    if (!userData) {
      setShowLogin(true);
      return;
    }

    try {
      const res = await apiInstance.post("comments/create/", {
        presentation: presentationId,
        content: content,
        user: userData?.user_id,
        parent: parentId,
      });

      if (selectedPresentation) {
        const updatedComments = selectedPresentation.comments.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), res.data],
            };
          }
          return comment;
        });

        if (parentId) {
          setSelectedPresentation({
            ...selectedPresentation,
            comments: updatedComments,
          });
          setReplyValue("");
          setReplyingTo(null);
        } else {
          setSelectedPresentation({
            ...selectedPresentation,
            comments: [...selectedPresentation.comments, res.data],
          });
          setCommentValue("");
        }
      }
    } catch (err) {
      console.error("Erreur commentaire:", err);
    }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/presentation/${id}`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      toast: true,
      position: "bottom",
      icon: "success",
      title: "Lien copié dans le presse-papier",
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleCommentIconClick = async (presentation) => {
    if (!userData) { setShowLogin(true); return; }
    setSelectedPresentation({ ...presentation, comments: presentation.comments || [] });
    try {
      const { data } = await apiInstance.get(`presentations/${presentation.id}/`);
      setSelectedPresentation((prev) =>
        prev?.id === presentation.id ? { ...prev, ...data } : prev
      );
    } catch {/* silencieux */}
  };

  const handleCloseCommentOverlay = () => {
    setSelectedPresentation(null);
    setReplyingTo(null);
  };

  const setVideoRef = (el, index) => {
    if (el && !videoRefs.current[index]) {
      videoRefs.current[index] = el;
    }
  };

  const handleReviewStatsChange = (productId, stats) => {
  setProducts((prev) =>
    prev.map((p) =>
      p.id === productId
        ? { ...p, rating: stats.rating, rating_count: stats.rating_count }
        : p
    )
  );
};
const truncateText = (text, max) => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
};

  // --------- RENDER ---------
  // 🔐 Non connecté — guard dans le JSX (jamais avant les hooks)
  if (!userData) {
    return (
      <div className="app-container">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="top-icon-btn top-theme-btn" onClick={toggle} aria-label="Changer le thème">
              <i className={isDark ? "fas fa-sun" : "fas fa-moon"} />
            </button>
          </div>
          <div className="top-tabs">
            <Link to="/solde" className="tab-pill">🔥 Solde</Link>
            <Link to="/" className="brand-center">find<span>IT</span></Link>
            <Link to="/search" className="tab-pill">Explorer</Link>
          </div>
          <div className="top-bar-right">
            <Link to="/search" className="top-icon-btn"><i className="fas fa-search" /></Link>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70vh", padding:"0 32px", textAlign:"center" }}>
          <i className="fas fa-user-lock" style={{ fontSize:52, color:"#DF468F", opacity:0.7, marginBottom:20 }} />
          <h2 style={{ color:"#f0f0f0", fontFamily:"Poppins,sans-serif", fontSize:20, fontWeight:700, marginBottom:10 }}>Accès Restreint</h2>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, marginBottom:24 }}>
            Connecte-toi pour voir le fil de tes vendeurs suivis.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            style={{ background:"linear-gradient(135deg,#DF468F,#c4317a)", color:"#fff", border:"none", borderRadius:50, padding:"12px 32px", fontWeight:700, fontSize:15, fontFamily:"Poppins,sans-serif", cursor:"pointer" }}
          >
            Se connecter
          </button>
        </div>
        <BottomBar />
        <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="top-icon-btn top-theme-btn" onClick={toggle} aria-label="Changer le thème">
              <i className={isDark ? "fas fa-sun" : "fas fa-moon"} />
            </button>
          </div>
          <div className="top-tabs">
            <Link to="/solde" className="tab-pill">🔥 Solde</Link>
            <Link to="/" className="brand-center">find<span>IT</span></Link>
            <span className="tab-pill active">Suivis</span>
          </div>
          <div className="top-bar-right">
            <Link to="/search" className="top-icon-btn"><i className="fas fa-search" /></Link>
          </div>
        </div>
        <div className="feed-container">
          {[0,1,2].map(i => (
            <div key={i} className="feed-item feed-skel">
              <div className="feed-skel-img" />
              <div className="feed-skel-info">
                <div className="feed-skel-line feed-skel-line--short" />
                <div className="feed-skel-line" />
                <div className="feed-skel-line feed-skel-line--medium" />
              </div>
            </div>
          ))}
        </div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ── Top bar ── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <button className="top-icon-btn top-theme-btn" onClick={toggle} aria-label="Changer le thème">
            <i className={isDark ? "fas fa-sun" : "fas fa-moon"} />
          </button>
        </div>
        <div className="top-tabs">
          <Link to="/solde" className="tab-pill">🔥 Solde</Link>
          <Link to="/" className="brand-center">find<span>IT</span></Link>
          <span className="tab-pill active">Suivis</span>
        </div>

        <div className="top-bar-right">
          <Link to="/search" className="top-icon-btn">
            <i className="fas fa-search" />
          </Link>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="feed-container">
        {products.length === 0 ? (
          <div className="feed-item" style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "40px 24px" }}>
              <i className="fas fa-user-friends" style={{ fontSize: 52, marginBottom: 16, display: "block", color: "#DF468F", opacity: 0.6 }} />
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 8 }}>
                Aucune publication
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Abonne-toi à des vendeurs pour voir leur contenu ici.
              </p>
            </div>
          </div>
        ) : (
          products.map((item, index) => (
            <div
              ref={(el) => { feedItemRefsF.current[index] = el; }}
              className="feed-item"
              data-id={`${item.type}-${item.id}`}
              key={`${item.type}-${item.id}`}
            >
              {item.type === "product" ? (
                /* ── Carte produit ── */
                <>
                  <ProductSlider item={item} />
                  <div className="feed-gradient-top" />
                  <div className="feed-gradient" />

                  <div className="info">
                    <div className="vendor-chip">
                      <Link to={item.vendor?.user === userData?.user_id ? `/profile/` : `/customer/${item.vendor?.slug}/`}>
                        <img src={item.vendor?.image} className="vendor-avatar-sm" alt={item.vendor?.name} />
                      </Link>
                      <Link
                        to={item.vendor?.user === userData?.user_id ? `/profile/` : `/customer/${item.vendor?.slug}/`}
                        className="vendor-name-link"
                      >
                        {item.vendor?.name}
                      </Link>
                      {item.vendor?.user !== userData?.user_id && (
                        <span
                          className={`follow-chip${followStates[item.vendor?.id] ? " following" : ""}`}
                          onClick={() => toggleFollow(userData?.user_id, item.vendor?.id)}
                        >
                          {followStates[item.vendor?.id] ? "Abonné" : "+ Suivre"}
                        </span>
                      )}
                    </div>

                    <h2>{item.title}</h2>
                    <p>{item.description}</p>

                    <div className="price-row">
                      {item.old_price && Number(item.old_price) > Number(item.price) && (
                        <span className="price-old">
                          {Math.round(Number(item.old_price)).toLocaleString("fr-FR")} frs
                        </span>
                      )}
                      <span className="price-current">
                        {Math.round(Number(item.price)).toLocaleString("fr-FR")} frs
                      </span>
                    </div>

                    <div className="feed-cta-row">
                      <button className="feed-buy-btn" onClick={() => handleOrderClick(item)}>
                        <i className="fas fa-shopping-bag" /> Acheter
                      </button>
                      <button className="feed-wishlist-btn" onClick={() => addToWishList(item.id)}>
                        <i className="fas fa-heart" />
                      </button>
                    </div>

                    {item?.category?.title && (
                      <span className="category-tag" style={{ marginTop: 6 }}>{item.category.title}</span>
                    )}

                    {item.specification?.length > 0 && (
                      <div className="specifications mt-1">
                        <p className="specs-toggle-btn" onClick={() => toggleSpecification(item.id)}>
                          <i className="fas fa-info-circle me-1" /> Spécifications
                        </p>
                        {specificationStates[item.id] && (
                          <div className="specs-content">
                            {item.specification.slice(0, 3).map((spec, i) => (
                              <div key={i}><strong>{spec.title}:</strong> {spec.content}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="actions">
                    <div className="action-btn">
                      <div className="action-icon-wrap">
                        <i className="fas fa-star" />
                      </div>
                      <span>{item.rating ? item.rating.toFixed(1) : "0.0"}</span>
                    </div>
                    <div className="action-btn" onClick={() => handleReviewIconClick(item)}>
                      <div className="action-icon-wrap">
                        <i className="fas fa-comment-dots" />
                      </div>
                      <span>{item.rating_count || 0}</span>
                    </div>
                    <div className="action-btn" onClick={() => handleCopyLink(item)}>
                      <div className="action-icon-wrap">
                        <i className="fas fa-link" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Carte vidéo ── */
                <div
                  className="feed-item"
                  data-id={`${item.type}-${item.id}`}
                  key={`${item.type}-${item.id}`}
                >
                  <video
                    ref={(el) => setVideoRef(el, index)}
                    autoPlay
                    src={item.video}
                    className="feed-image"
                    muted
                    loop
                    playsInline
                    onClick={(e) => {
                      const v = e.target;
                      v.paused ? v.play() : v.pause();
                    }}
                    style={{ cursor: "pointer" }}
                  />
                  <div className="feed-gradient-top" />
                  <div className="feed-gradient" />

                  <div className="info">
                    <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{item.vendor?.name}</p>
                    <h2 style={{ marginBottom: "6px" }}>{item.title}</h2>
                    <p>{item.description}</p>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#DF468F", fontSize: "12px" }}>
                        {item.link}
                      </a>
                    )}
                  </div>

                  <div className="actions">
                    <div className="action-btn" onClick={() => handleLike(item.id)}>
                      <div className="action-icon-wrap heart-btn">
                        <i className="fas fa-heart" />
                      </div>
                      <span>{item.likes_count || 0}</span>
                    </div>
                    <div className="action-btn" onClick={() => handleCommentIconClick(item)}>
                      <div className="action-icon-wrap">
                        <i className="fas fa-comment-dots" />
                      </div>
                      <span>{item.comments?.length || 0}</span>
                    </div>
                    <div className="action-btn" onClick={() => copyLink(item.id)}>
                      <div className="action-icon-wrap">
                        <i className="fas fa-link" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomBar />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />

      {/* ── Overlay avis ── */}
      {selectedProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseReview}>&times;</button>
            <Review product={selectedProduct} userData={userData} onReviewStatsChange={handleReviewStatsChange} />
          </div>
        </div>
      )}

      {/* ── Modal commande ── */}
      {orderProduct && (
        <BuyModal
          product={orderProduct}
          userData={userData}
          profileData={profileData}
          onClose={handleCloseOrder}
          onWishlist={(id) => addToWishList(id)}
        />
      )}

      {/* ── Overlay commentaires vidéo ── */}
      {selectedPresentation && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseCommentOverlay}>&times;</button>
            <h4 style={{ color: "#f0f0f0", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              <i className="fas fa-comment-dots" style={{ marginRight: 8, color: "#DF468F" }} />
              Commentaires
            </h4>

            {/* Liste des commentaires */}
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>
              {(selectedPresentation.comments || []).length === 0 && (
                <p style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  Aucun commentaire pour l'instant.
                </p>
              )}
              {(selectedPresentation.comments || [])
                .filter((c) => c.parent === null)
                .map((comment) => (
                  <div key={comment.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: "#f0f0f0", fontSize: 13 }}>
                          {comment.display_name}
                        </span>
                        <span style={{ color: "#bbb", fontSize: 13, marginLeft: 8 }}>
                          {comment.content}
                        </span>
                      </div>
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                      >
                        Répondre
                      </button>
                    </div>
                    {(comment.replies || []).map((reply) => (
                      <div key={reply.id} style={{ marginLeft: 20, marginTop: 6, fontSize: 12, color: "#aaa", fontStyle: "italic" }}>
                        ↳ <strong style={{ color: "#ccc" }}>{reply.display_name}</strong> {reply.content}
                      </div>
                    ))}
                    {replyingTo === comment.id && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Votre réponse…"
                          value={replyValue}
                          onChange={(e) => setReplyValue(e.target.value)}
                          style={{
                            flex: 1, padding: "8px 12px", fontSize: 13, borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.05)", color: "#f0f0f0", outline: "none",
                          }}
                        />
                        <button
                          onClick={(e) => replyValue.trim() && handleComment(e, selectedPresentation.id, replyValue, comment.id)}
                          style={{
                            padding: "8px 14px", borderRadius: 10, border: "none", fontSize: 13,
                            background: "linear-gradient(135deg,#DF468F,#c4317a)", color: "#fff",
                            cursor: "pointer", fontWeight: 700,
                          }}
                        >
                          Envoyer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Zone saisie commentaire */}
            <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
              <input
                type="text"
                placeholder="Votre commentaire…"
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                style={{
                  flex: 1, padding: "10px 14px", fontSize: 13, borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "#f0f0f0", outline: "none",
                }}
              />
              <button
                onClick={(e) => commentValue.trim() && handleComment(e, selectedPresentation.id, commentValue)}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#DF468F,#c4317a)", color: "#fff",
                  cursor: "pointer", fontWeight: 700, fontSize: 14,
                }}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowedVendorsFeed;
