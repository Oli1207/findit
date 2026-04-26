import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDate } from "../../utils/formatDate";
import Swal from "sweetalert2";


// Imports Utilitaires
import apiInstance from "../../utils/axios";
import UserData from "../plugin/UserData";
import { useFollowStore } from "../../store/useFollowStore";

// Import ProductSlider (fourni par toi)
import ProductSlider from "../store/ProductSlider";

// Import CSS
import "./vendorprofile.css";
import "../customer/customershop.css";
import Review from "../store/Review";
import { useEscrowOrder } from "../../hooks/useEscrowOrder";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { container: 'swal2-container--full-page' },
  target: document.body,
});

function fmtPrice(n) {
  return Math.round(Number(n) || 0).toLocaleString("fr-FR");
}

function VendorProfile() {
  const navigate = useNavigate();
  const userData = UserData();
  const axios = apiInstance;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  // Données principales
  const [vendorData, setVendorData] = useState(null);
  const [products, setProducts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [acceptedOrders, setAcceptedOrders] = useState({});
  const [profileData, setProfileData] = useState(null); // Pour l'adresse de l'utilisateur connecté

  // --- ETATS OVERLAYS & ACTIONS (Venant de TiktokFeed) ---
  const [orderProduct, setOrderProduct] = useState(null); // Produit à commander
  const [selectedPresentation, setSelectedPresentation] = useState(null); // Vidéo/Produit pour commentaires/reviews

  const [specificationStates, setSpecificationStates] = useState({});
  // Etats Commande
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [customAddress, setCustomAddress] = useState({
    mobile: "",
    address: "",
    city: "",
    state: "",
  });

  // Etats Commentaire/Review
  const [commentValue, setCommentValue] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyValue, setReplyValue] = useState("");

  // Etats Validation livraison (escrow)
  const [validationInputs, setValidationInputs] = useState({});  // { [order_oid]: code }
  const [validatingOid,    setValidatingOid]    = useState(null);

  // --- LIGHTBOX & FLUX STATES ---
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaList, setMediaList] = useState([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [mediaType, setMediaType] = useState(null);
  const [wishlistProducts, setWishlistProducts] = useState([]); // produits de la wishlist
  const [vendorReviews,    setVendorReviews]    = useState([]); // avis reçus par le vendeur

  const snapContainerRef = useRef(null);
  const videoRefs = useRef([]);
  const [expandedText, setExpandedText] = useState({});

  // ── Follow state (pour les items wishlist / pages étrangères) ─────────────
  const { followStates, toggleFollow } = useFollowStore();

  // Fonction pour définir les références vidéo dans le lightbox
  const setVideoRef = (el, index) => {
    if (el) videoRefs.current[index] = el;
  };

  // ── Hook escrow Paystack ───────────────────────────────────────────────────
  const { handlePayWithPaystack, handleValidateDelivery, handleMarkShipped } = useEscrowOrder({
    userData,
    qtyValue,
    sizeValue,
    colorValue,
    profileData,
    useProfileAddress,
    customAddress,
    onOrderSuccess: () => handleCloseOrder(),
  });

  // Utilitaire pour extraire une URL d'image quelle que soit la forme du champ
  const getUrl = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (val.image) return typeof val.image === "string" ? val.image : val.image?.url || val.image?.path || null;
    return val.url || val.path || null;
  };

  // --- CHARGEMENT DES DONNÉES (parallèle) ---
  useEffect(() => {
    if (!userData) { setLoading(false); return; }

    const fetchAllData = async () => {
      setLoading(true);

      // Construire toutes les requêtes en parallèle
      const reqs = [];
      const keys = [];

      if (userData.user_id) {
        reqs.push(axios.get(`user/profile/${userData.user_id}/`));
        keys.push("profile");
      }
      if (userData.vendor_id) {
        reqs.push(axios.get(`vendor-shop-settings/${userData.vendor_id}/`));
        keys.push("vendor");
        reqs.push(axios.get(`vendor/orders/${userData.vendor_id}/`));
        keys.push("orders");
        reqs.push(axios.get(`vendor-products/${userData.vendor_id}/`));
        keys.push("products");
        reqs.push(axios.get(`vendor-presentations/${userData.vendor_id}/`));
        keys.push("videos");
      }
      if (userData.user_id) {
        reqs.push(axios.get(`customer/orders/${userData.user_id}/`));
        keys.push("myOrders");
        reqs.push(axios.get(`customer/wishlist/${userData.user_id}/`));
        keys.push("wishlist");
      }
      if (userData.vendor_id) {
        reqs.push(axios.get(`vendor-reviews/${userData.vendor_id}/`));
        keys.push("reviews");
      }

      const results = await Promise.allSettled(reqs);
      const d = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") d[keys[i]] = r.value.data;
        else console.warn(`Échec [${keys[i]}]:`, r.reason);
      });

      if (d.profile) setProfileData(d.profile);
      if (d.vendor)  setVendorData(d.vendor);
      if (d.orders)  setOrders(d.orders.results || d.orders || []);

      if (d.products) {
        const raw = d.products.products || d.products.results || d.products || [];
        setProducts(raw.map((p) => ({ ...p, type: p.type || "product" })));
      }

      if (d.videos) {
        const raw = d.videos.presentations || d.videos.results || d.videos || [];
        setVideos(raw.map((v) => ({ ...v, type: v.type || "presentation", comments: v.comments || [] })));
      }

      if (d.myOrders) setMyOrders(d.myOrders.results || d.myOrders || []);
      if (d.reviews)  setVendorReviews(d.reviews.results || d.reviews || []);

      if (d.wishlist) {
        const wishlistData = d.wishlist.results || d.wishlist || [];
        const flat = wishlistData
          .map((w) => w.product || w.product_detail || w.product_data || null)
          .filter(Boolean)
          .map((p) => {
            const mainImage = getUrl(p.image) || getUrl(p.cover) || getUrl(p.thumbnail) || null;
            const galleryImages = (p.gallery || []).map((g) => getUrl(g) || getUrl(g?.image) || null).filter(Boolean);
            return { ...p, type: p.type || "product", image: mainImage, gallery: galleryImages };
          });
        setWishlistProducts(flat);
      }

      setLoading(false);
    };

    fetchAllData();
  }, [userData?.vendor_id, userData?.user_id]);

  // --- LOGIQUE LIGHTBOX ---
  const openLightbox = (index, type) => {
    // Réinitialise les états d'overlay et les refs vidéo
    setOrderProduct(null);
    setSelectedPresentation(null);
    setReplyingTo(null);
    videoRefs.current = [];          // ← réinitialisation au bon endroit (pas au render)

    const listMap = { product: products, video: videos, wishlist: wishlistProducts };
    setMediaList(listMap[type] || []);
    setMediaType(type);
    setInitialIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };


  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
    videoRefs.current.forEach((v) => v && v.pause()); // S'assurer que les vidéos sont stoppées
  };

  // Défilement Lightbox (initialisation + gestion auto-play)
  useEffect(() => {
    if (lightboxOpen && snapContainerRef.current) {
      // 1. Défilement initial
      const elementHeight = window.innerHeight;
      snapContainerRef.current.scrollTop = initialIndex * elementHeight;

      // 2. Observer pour l'auto-play
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
              // Pause les autres vidéos (pour éviter le bruit)
              videoRefs.current.forEach((v) => {
                if (v && v !== video) v.pause();
              });
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.7 }
      );

      // N'observer que si c'est une liste de vidéos
      if (mediaType === "video") {
        videoRefs.current.forEach((video) => {
          if (video) observer.observe(video);
        });
      }

      return () => {
        if (mediaType === "video") {
          videoRefs.current.forEach((video) => {
            if (video) observer.unobserve(video);
          });
        }
      };
    }
  }, [lightboxOpen, initialIndex, mediaType, mediaList]);

  // --- HANDLERS D'ACTIONS (Portés de TiktokFeed) ---

  // 1. GESTION DES LIKES (Vidéos/Présentations)
  const handleLike = async (id) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }
    try {
      const res = await axios.post(`presentations/${id}/like/`, {
        user: userData?.user_id,
      });

      const updatedList = mediaList.map((item) =>
        // CHANGEMENT : grâce à normalizedVideos, toutes les vidéos ont type "presentation"
        item.id === id && item.type === "presentation"
          ? { ...item, likes_count: res.data.likes_count }
          : item
      );
      setMediaList(updatedList); // Mise à jour du flux Lightbox
      setVideos((prev) =>
        prev.map((item) =>
          item.id === id && item.type === "presentation"
            ? { ...item, likes_count: res.data.likes_count }
            : item
        )
      ); // Mise à jour de la liste globale des vidéos
    } catch (err) {
      console.error("Erreur like:", err);
    }
  };

  // 2. GESTION DES COMMENTAIRES (Présentations/Vidéos) et REVIEWS (Produits)
  const handleCommentIconClick = (item) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }
    // L'overlay gère soit le commentaire (vidéo) soit la review (produit)
    setSelectedPresentation(item);
  };

  const handleCloseCommentOverlay = () => {
    setSelectedPresentation(null);
    setReplyingTo(null);
    setCommentValue("");
    setReplyValue("");
  };

  const handleSendComment = async (presentationId, content, parentId = null) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }
    if (selectedPresentation.type !== "presentation" || !content.trim()) return;

    try {
      const res = await axios.post("comments/create/", {
        presentation: presentationId,
        content: content,
        user: userData?.user_id,
        parent: parentId,
      });

      if (selectedPresentation) {
        let updatedComments;
        if (parentId) {
          updatedComments = selectedPresentation.comments.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), res.data] }
              : c
          );
        } else {
          updatedComments = [...(selectedPresentation.comments || []), res.data];
        }

        const updatedItem = { ...selectedPresentation, comments: updatedComments };

        // Mise à jour de toutes les listes
        const updateGlobalList = (list) =>
          list.map((v) =>
            v.id === presentationId && v.type === "presentation" ? updatedItem : v
          );

        setVideos((prev) => updateGlobalList(prev));
        setMediaList((prev) => updateGlobalList(prev));
        setSelectedPresentation(updatedItem); // Garder l'overlay à jour

        if (parentId) {
          setReplyValue("");
          setReplyingTo(null);
        } else {
          setCommentValue("");
        }
      }
    } catch (err) {
      console.error("Erreur commentaire:", err);
      Toast.fire({ icon: "error", title: "Erreur envoi commentaire." });
    }
  };

  // 2.b Copie de lien pour les vidéos (comme dans TikTokFeed)
  const copyLink = (id) => {
    // CHANGEMENT : même URL que dans TikTokFeed pour une présentation
    const link = `${window.location.origin}/presentation/${id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        Toast.fire({
          icon: "success",
          title: "Lien copié dans le presse-papier",
        });
      })
      .catch(() => {
        Toast.fire({
          icon: "error",
          title: "Impossible de copier le lien",
        });
      });
  };

  const toggleSpecification = (productId) => {
    setSpecificationStates((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // 3. GESTION COMMANDE (PANIER)
  const handleOrderClick = (item) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }
    if (item.type !== "product") return; // N'ouvre que pour les produits

    setOrderProduct(item); // Ouvre l'overlay commande
  };

  const handleCloseOrder = () => {
    setOrderProduct(null);
    setQtyValue(1);
    setColorValue("No Color");
    setSizeValue("No Size");
    setSelectedColors({});
    setSelectedSize({});
  };

  const handleColorButtonClick = (productId, colorName) => {
    setColorValue(colorName);
    setSelectedColors((prev) => ({ ...prev, [productId]: colorName }));
  };

  const handleSizeButtonClick = (productId, sizeName) => {
    setSizeValue(sizeName);
    setSelectedSize((prev) => ({ ...prev, [productId]: sizeName }));
  };

  // handlePlaceOrder remplacé par handlePayWithPaystack (hook useEscrowOrder)

    const addToWishList = async (productId) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }
    try {
      const formdata = new FormData();
      formdata.append("product_id", productId);
      formdata.append("user_id", userData?.user_id);

      const res = await axios.post(
        `customer/wishlist/${userData?.user_id}/`,
        formdata
      );
      Toast.fire({ icon: "success", title: res.data.message });

      // 🔁 Rafraîchir la liste des produits wishlist
      const wishlistRes = await axios.get(
        `customer/wishlist/${userData.user_id}/`
      );
      const wishlistData =
        wishlistRes.data.results || wishlistRes.data || [];

      const wishlistFlat = wishlistData
        .map((w) => w.product)
        .filter(Boolean)
        .map((p) => ({
          ...p,
          type: p.type || "product",
        }));

      setWishlistProducts(wishlistFlat);
    } catch (e) {
      console.error(e);
      Toast.fire({ icon: "error", title: "Erreur ajout wishlist." });
    }
  };


    // Mettre un produit en solde (pour le vendeur)
  const handleSetSale = async (product) => {
    if (!userData) {
      Toast.fire({ icon: "warning", title: "Veuillez vous connecter." });
      return navigate("/login");
    }

    // On vérifie que c'est bien le vendeur propriétaire du produit
    if (product.vendor?.user !== userData?.user_id) {
      Toast.fire({
        icon: "error",
        title: "Vous ne pouvez modifier que vos propres produits.",
      });
      return;
    }

    const { value: salePrice } = await Swal.fire({
      title: `Mettre "${product.title}" en solde`,
      input: "number",
      inputLabel: "Nouveau prix en solde",
      inputAttributes: {
        min: 1,
        step: 1,
      },
      inputValue: product.price,
      showCancelButton: true,
      confirmButtonText: "Valider",
      cancelButtonText: "Annuler",
    });

    if (!salePrice) {
      return; // utilisateur a annulé ou rien saisi
    }

    if (Number(salePrice) >= Number(product.price)) {
      Toast.fire({
        icon: "warning",
        title: "Le prix en solde doit être inférieur au prix actuel.",
      });
      return;
    }

    try {
      const res = await axios.patch(`products/${product.id}/set-sale/`, {
        price: salePrice,
      });

      // Mise à jour de la liste products
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...res.data } : p))
      );

      // Si le produit est actuellement affiché dans le lightbox
      setMediaList((prev) =>
        prev.map((p) =>
          p.id === product.id && p.type === "product" ? { ...p, ...res.data } : p
        )
      );

      Toast.fire({
        icon: "success",
        title: "Produit mis en solde.",
      });
    } catch (error) {
      console.error("Erreur set sale:", error);
      Toast.fire({
        icon: "error",
        title: "Erreur lors de la mise en solde.",
      });
    }
  };


  const handleAcceptOrder = (oid) => {
    setAcceptedOrders((prev) => ({ ...prev, [oid]: true }));
    Toast.fire({ icon: "success", title: "Commande acceptée !" });
  };

  const handleCloseReview = () => {
    setSelectedPresentation(null);
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === "delivered" || s === "completed") return "vp-s-success";
    if (s === "pending" || s === "en_attente") return "vp-s-warning";
    if (s === "cancelled") return "vp-s-danger";
    return "vp-s-default";
  };

  

  // --- RENDU LIGHTBOX (identique à CustomerShop — classes cs-lb-*) ---
  const renderLightbox = () => {
    if (!lightboxOpen) return null;

    return (
      <div className="cs-lb-overlay">
        <button className="cs-lb-close" onClick={closeLightbox} aria-label="Fermer">
          <i className="fas fa-arrow-left" />
        </button>

        <div className="cs-lb-snap cs-hide-scroll" ref={snapContainerRef}>
          {mediaList.map((item, index) => {
            const isOwn     = item.vendor?.user === userData?.user_id;
            const vendorPath = isOwn
              ? `/profile/`
              : `/customer/${item.vendor?.slug || item.vendor?.id}/`;

            return (
              <div key={`${item.type}-${item.id}-${index}`} className="cs-lb-item">

                {/* Média background */}
                <div className="cs-lb-media">
                  {item.type === "product" ? (
                    <ProductSlider item={item} />
                  ) : (
                    <video
                      ref={(el) => setVideoRef(el, index)}
                      src={item.video}
                      className="cs-lb-video"
                      loop muted playsInline
                      onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
                    />
                  )}
                </div>

                {/* Gradients */}
                <div className="cs-lb-grad-top" />
                <div className="cs-lb-gradient" />

                {/* ── Info bas-gauche ── */}
                <div className="cs-lb-info">

                  {/* Chip vendeur */}
                  <div className="cs-lb-vendor-chip">
                    <Link to={vendorPath} onClick={(e) => e.stopPropagation()}>
                      <img
                        src={item.vendor?.image || vendorData?.image}
                        className="cs-lb-vendor-avatar"
                        alt={item.vendor?.name || vendorData?.name}
                      />
                    </Link>
                    <Link to={vendorPath} className="cs-lb-vendor-name" onClick={(e) => e.stopPropagation()}>
                      {item.vendor?.name || vendorData?.name}
                    </Link>
                    {/* Pas de follow chip : page personnelle du vendeur */}
                  </div>

                  <h2 className="cs-lb-title">{item.title}</h2>

                  {item.description && (
                    <p className="cs-lb-desc">{item.description}</p>
                  )}

                  {/* Lien externe (vidéo) */}
                  {item.type === "presentation" && item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="vp-link-text">
                      {item.link}
                    </a>
                  )}

                  {/* Prix (produit) */}
                  {item.type === "product" && item.price && (
                    <div className="cs-lb-price-row">
                      {item.old_price && Number(item.old_price) > Number(item.price) && (
                        <span className="cs-lb-price-old">{fmtPrice(item.old_price)} frs</span>
                      )}
                      <span className="cs-lb-price-current">{fmtPrice(item.price)} frs</span>
                    </div>
                  )}

                  {/* CTA : Acheter (produit non-propriétaire) */}
                  {item.type === "product" && !isOwn && (
                    <div className="cs-lb-cta-row">
                      <button className="cs-lb-buy-btn" onClick={() => handleOrderClick(item)}>
                        <i className="fas fa-shopping-bag" /> Acheter
                      </button>
                      <button className="cs-lb-wishlist-btn" onClick={() => addToWishList(item.id)}>
                        <i className="fas fa-heart" />
                      </button>
                    </div>
                  )}

                  {/* CTA : Mettre en solde (produit propriétaire) */}
                  {item.type === "product" && isOwn && (
                    <div className="cs-lb-cta-row">
                      <button className="cs-lb-buy-btn" onClick={() => handleSetSale(item)}>
                        <i className="fas fa-tags" />{" "}
                        {item.solde ? "Modifier solde" : "Mettre en solde"}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Actions colonne droite ── */}
                <div className="cs-lb-actions">
                  <Link to={vendorPath} onClick={(e) => e.stopPropagation()}>
                    <img
                      src={item.vendor?.image || vendorData?.image}
                      className="cs-lb-avatar"
                      alt={item.vendor?.name || vendorData?.name}
                    />
                  </Link>

                  {item.type === "presentation" ? (
                    <>
                      <div className="cs-lb-action-btn" onClick={() => handleLike(item.id)}>
                        <div className="cs-lb-action-icon"><i className="fas fa-heart" /></div>
                        <span>{item.likes_count || 0}</span>
                      </div>
                      <div className="cs-lb-action-btn" onClick={() => handleCommentIconClick(item)}>
                        <div className="cs-lb-action-icon"><i className="fas fa-comment-dots" /></div>
                        <span>{item.comments?.length || 0}</span>
                      </div>
                      <div className="cs-lb-action-btn" onClick={() => copyLink(item.id)}>
                        <div className="cs-lb-action-icon"><i className="fas fa-link" /></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cs-lb-action-btn">
                        <div className="cs-lb-action-icon"><i className="fas fa-star" /></div>
                        <span>{item.rating ? Number(item.rating).toFixed(1) : "0.0"}</span>
                      </div>
                      <div className="cs-lb-action-btn" onClick={() => handleCommentIconClick(item)}>
                        <div className="cs-lb-action-icon"><i className="fas fa-comment-dots" /></div>
                        <span>{item.rating_count || 0}</span>
                      </div>
                      <div
                        className="cs-lb-action-btn"
                        onClick={() => {
                          const link = `${window.location.origin}/products/${item.slug || item.id}/`;
                          navigator.clipboard
                            .writeText(link)
                            .then(() => Toast.fire({ icon: "success", title: "Lien copié !" }))
                            .catch(() => Toast.fire({ icon: "error", title: "Impossible de copier" }));
                        }}
                      >
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
    );
  };

  // --- RENDER PRINCIPAL ---
  if (!userData) {
    return (
      <div className="vp-container">
        <div className="vp-header">
          <span onClick={() => navigate(-1)}>← Retour</span>
        </div>
        <div className="vp-not-logged">
          <i className="fas fa-user-lock vp-icon-lock"></i>
          <h2>Accès Restreint</h2>
          <button className="vp-btn-login" onClick={() => navigate("/login")}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="vp-loader-screen">
        <div className="vp-spinner" />
        <p className="vp-loader-text">Chargement du profil…</p>
      </div>
    );

  return (
    <div className="vp-container">
      {/* 1. Modal Lightbox (TikTok Feed View) */}
      {renderLightbox()}

      {/* 2. Overlays (Commande & Commentaire) */}

      {/* A. Overlay Commande */}
      {orderProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close-panel" onClick={handleCloseOrder}>
              &times;
            </button>
            <h4 style={{ marginBottom: "15px" }}>{orderProduct.title}</h4>

            {/* Quantité */}
            <div className="mb-3">
              <label>
                <b>Quantité :</b>
              </label>
              <input
                type="number"
                className="vp-form-control"
                value={qtyValue}
                min="1"
                onChange={(e) => setQtyValue(e.target.value)}
              />
            </div>

            {/* Taille */}
            {orderProduct.size?.length > 0 && (
              <div className="mb-3">
                <label className="d-flex align-items-center gap-2">
                  <b>Taille :</b>
                  <span>
                    {selectedSize[orderProduct.id]
                      ? selectedSize[orderProduct.id]
                      : "Aucune"}
                  </span>
                </label>

                <div className="d-flex flex-wrap gap-2 mt-2">
                  {orderProduct.size.map((s, i) => (
                    <button
                      key={i}
                      className={`btn btn-sm ${
                        selectedSize[orderProduct.id] === s.name
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() =>
                        handleSizeButtonClick(orderProduct.id, s.name)
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Couleur */}
            {orderProduct.color?.length > 0 && (
              <div className="mb-3">
                <label className="d-flex align-items-center gap-2">
                  <b>Couleur :</b>

                  {selectedColors[orderProduct.id] ? (
                    <>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: selectedColors[orderProduct.id],
                          border: "1px solid #ccc",
                        }}
                      ></div>
                      <span>{selectedColors[orderProduct.id]}</span>
                    </>
                  ) : (
                    <span>Aucune</span>
                  )}
                </label>

                <div className="d-flex flex-wrap gap-2 mt-2">
                  {orderProduct.color.map((c, i) => (
                    <button
                      key={i}
                      className="btn btn-sm p-3"
                      style={{
                        backgroundColor: c.color_code,
                        border:
                          selectedColors[orderProduct.id] === c.color_code
                            ? "2px solid black"
                            : "1px solid #ccc",
                      }}
                      onClick={() =>
                        handleColorButtonClick(orderProduct.id, c.color_code)
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Adresse */}
            <div style={{ margin: "15px 0" }}>
              {profileData?.mobile &&
              profileData?.address &&
              profileData?.city ? (
                <label className="form-check my-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={useProfileAddress}
                    onChange={(e) => setUseProfileAddress(e.target.checked)}
                  />{" "}
                  Utiliser l'adresse du profil
                </label>
              ) : null}

              {(!useProfileAddress ||
                !profileData?.mobile ||
                !profileData?.address ||
                !profileData?.city) && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="text"
                    placeholder="Téléphone"
                    className="vp-form-control mb-2"
                    value={customAddress.mobile}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        mobile: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Adresse"
                    className="vp-form-control mb-2"
                    value={customAddress.address}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        address: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    className="vp-form-control mb-2"
                    value={customAddress.city}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Résumé prix + commission */}
            <div className="vp-order-summary">
              <div className="vp-order-row">
                <span>Sous-total</span>
                <span>{Math.round(Number(orderProduct.price) * qtyValue).toLocaleString("fr-FR")} frs</span>
              </div>
              <div className="vp-order-row vp-order-fee">
                <span>Commission plateforme (5 %)</span>
                <span>−{Math.round(Number(orderProduct.price) * qtyValue * 0.05).toLocaleString("fr-FR")} frs</span>
              </div>
              <div className="vp-order-row vp-order-total">
                <span>Total débité</span>
                <span><strong>{Math.round(Number(orderProduct.price) * qtyValue).toLocaleString("fr-FR")} frs</strong></span>
              </div>
            </div>

            <button
              className="vp-btn-paystack mb-2"
              onClick={() =>
                handlePayWithPaystack(
                  orderProduct.id,
                  orderProduct.price,
                  orderProduct.vendor?.id
                )
              }
            >
              <i className="fas fa-lock me-2" />
              Payer en sécurité avec Paystack
            </button>
            <button
              className="vp-btn-outline"
              onClick={() => addToWishList(orderProduct.id)}
            >
              <i className="fas fa-heart me-2" />
              Ajouter aux favoris
            </button>
          </div>
        </div>
      )}

      {/* B. Overlay Commentaires (Pour vidéos) OU Reviews (Pour produits) */}
      {selectedPresentation && (
        <div className="review-overlay">
          <div className="review-panel">
            <button
              className="btn-close-panel"
              onClick={handleCloseCommentOverlay}
            >
              &times;
            </button>
            <h4>
              {selectedPresentation.type === "presentation"
                ? "Commentaires"
                : "Avis & Reviews"}
            </h4>

            {/* Liste des commentaires/Reviews */}
            <div
              className="mb-3"
              style={{ maxHeight: "300px", overflowY: "auto", color: "black" }}
            >
              {selectedPresentation.type === "presentation" &&
                (selectedPresentation.comments || [])
                  .filter((comment) => comment.parent === null)
                  .map((comment) => (
                    <div key={comment.id} style={{ marginBottom: "10px" }}>
                      <b>{comment.display_name || "Utilisateur"}</b> :{" "}
                      {comment.content}
                      <button
                        className="btn btn-sm btn-link"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        Répondre
                      </button>
                      {/* Réponses */}
                      {(comment.replies || []).map((reply) => (
                        <div
                          key={reply.id}
                          style={{
                            marginBottom: "5px",
                            marginLeft: "20px",
                            fontStyle: "italic",
                          }}
                        >
                          ↳ <b>{reply.display_name || "Utilisateur"}</b> :{" "}
                          {reply.content}
                        </div>
                      ))}
                      {/* Formulaire de réponse */}
                      {replyingTo === comment.id && (
                        <div className="d-flex gap-2 my-1">
                          <input
                            type="text"
                            placeholder="Votre réponse"
                            className="vp-form-control"
                            value={replyValue}
                            onChange={(e) => setReplyValue(e.target.value)}
                            style={{ marginBottom: 0 }}
                          />
                          <button
                            className="vp-btn-primary"
                            style={{ width: "auto", marginTop: 0 }}
                            onClick={() =>
                              replyValue.trim() &&
                              handleSendComment(
                                selectedPresentation.id,
                                replyValue,
                                comment.id
                              )
                            }
                          >
                            Envoyer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

              {selectedPresentation.type === "product" && (
                <Review product={selectedPresentation} userData={userData} />
              )}

              {(!selectedPresentation.comments ||
                selectedPresentation.comments.length === 0) &&
                selectedPresentation.type === "presentation" && (
                  <p>Aucun commentaire.</p>
                )}
            </div>

            {/* Ajouter un commentaire principal / Review */}
            {selectedPresentation.type === "presentation" && (
              <div className="d-flex gap-2">
                <input
                  type="text"
                  placeholder="Votre commentaire"
                  className="vp-form-control"
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <button
                  className="vp-btn-primary"
                  style={{ width: "auto", marginTop: 0 }}
                  onClick={() =>
                    commentValue.trim() &&
                    handleSendComment(selectedPresentation.id, commentValue)
                  }
                >
                  Envoyer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Profil */}
      <div className="vp-header">
        <div className="vp-header-nav">
          <i className="fas fa-arrow-left vp-nav-icon" onClick={() => navigate(-1)} />
          <span className="vp-header-title">{vendorData?.name}</span>
          <i className="fas fa-cog vp-nav-icon" onClick={() => navigate("/vendor/settings")} />
        </div>
        <div className="vp-profile-info">
          <img src={vendorData?.image} alt="Profile" className="vp-avatar" />
          <div className="vp-text">
            <h2>{vendorData?.name}</h2>
            <p className="vp-bio">{vendorData?.description || "Bienvenue sur ma boutique."}</p>
          </div>
        </div>
        {/* Stats row */}
        <div className="vp-stats-row">
          <div className="vp-stat">
            <span className="vp-stat-num">{products.length}</span>
            <span className="vp-stat-label">Produits</span>
          </div>
          <div className="vp-stat">
            <span className="vp-stat-num">{videos.length}</span>
            <span className="vp-stat-label">Vidéos</span>
          </div>
          <div className="vp-stat">
            <span className="vp-stat-num">{orders.length}</span>
            <span className="vp-stat-label">Commandes</span>
          </div>
        </div>
        <button className="vp-action-btn-header" onClick={() => navigate("/vendor/settings")}>
          <i className="fas fa-pen me-2" />Modifier le profil
        </button>
      </div>

      {/* Tabs */}
          <div className="vp-tabs">
        <button
          className={`vp-tab-btn ${activeTab === "products" ? "vp-active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <i className="fas fa-th"></i>
        </button>
        <button
          className={`vp-tab-btn ${activeTab === "videos" ? "vp-active" : ""}`}
          onClick={() => setActiveTab("videos")}
        >
          <i className="fas fa-video"></i>
        </button>
        {/* 🆕 Onglet Wishlist */}
        <button
          className={`vp-tab-btn ${
            activeTab === "wishlist" ? "vp-active" : ""
          }`}
          onClick={() => setActiveTab("wishlist")}
        >
          <i className="fas fa-heart"></i>
        </button>
        <button
          className={`vp-tab-btn ${activeTab === "orders" ? "vp-active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          <i className="fas fa-receipt"></i>
        </button>
        <button
          className={`vp-tab-btn ${activeTab === "myOrders" ? "vp-active" : ""}`}
          onClick={() => setActiveTab("myOrders")}
        >
          <i className="fas fa-shopping-bag"></i>
        </button>
        <button
          className={`vp-tab-btn ${activeTab === "reviews" ? "vp-active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          <i className="fas fa-star"></i>
        </button>
      </div>


      {/* Contenu */}
      <div className="vp-content">
        {activeTab === "products" && (
          <div className="vp-grid">
            {products.map((p, index) => (
              <div
                className="vp-tile"
                key={p.id}
                onClick={() => openLightbox(index, "product")}
              >
                <img src={p.image} alt={p.title} loading="lazy" />
              </div>
            ))}
            {products.length === 0 && (
              <div className="vp-empty">Aucun produit.</div>
            )}
          </div>
        )}

        {activeTab === "videos" && (
          <div className="vp-grid">
            {videos.map((v, index) => (
              <div
                className="vp-tile"
                key={v.id}
                onClick={() => openLightbox(index, "video")}
              >
                <video src={v.video} muted />
                <div className="vp-play-icon">
                  <i className="fas fa-play"></i>
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="vp-empty">Aucune vidéo.</div>
            )}
          </div>
        )}

        {/* 🆕 Onglet Wishlist */}
        {activeTab === "wishlist" && (
          <div className="vp-grid">
            {wishlistProducts.map((p, index) => (
              <div
                className="vp-tile"
                key={p.id || index}
                onClick={() => openLightbox(index, "wishlist")}
              >
                <img
  src={p.image || "/icons/web-app-manifest-192x192.png"}
  alt={p.title}
  loading="lazy"
/>

              </div>
            ))}
            {wishlistProducts.length === 0 && (
              <div className="vp-empty">Aucun produit en favoris.</div>
            )}
          </div>
        )}

        {/* Onglet Orders (commandes reçues) */}
        {activeTab === "orders" && (
          <div className="vp-orders-list">
            {orders.map((o) => {
              const escrow   = (o.escrow_status || "").toLowerCase();
              const pillCls  = escrow === "shipped"   ? "vp-s-info"
                             : escrow === "validated" || escrow === "released" ? "vp-s-success"
                             : "vp-s-warning";
              const pillText = escrow === "paid_holding" ? "Payé"
                             : escrow === "shipped"      ? "Expédié"
                             : escrow === "validated"    ? "Validé"
                             : escrow === "released"     ? "Versé"
                             : o.payment_status || o.status || "En attente";
              return (
              <div key={o.id || o.oid} className="vp-card">

                {/* Bannière image */}
                <div className="vp-order-banner">
                  {o.product?.image
                    ? <img src={o.product.image} alt={o.product?.title} />
                    : <div className="vp-order-banner-placeholder"><i className="fas fa-image" /></div>
                  }
                  <span className={`vp-order-status-pill ${pillCls}`}>{pillText}</span>
                </div>

                {/* Corps */}
                <div className="vp-order-body">
                  <div className="vp-order-meta-row">
                    <span className="vp-order-oid">#{o.oid}</span>
                    <span className="vp-order-date"><i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />{formatDate(o?.date)}</span>
                  </div>
                  <p className="vp-order-title">{o.product?.title || "Produit"}</p>
                  <p className="vp-order-sub"><i className="fas fa-user" /> {o?.full_name || "Client"}</p>
                </div>

                {/* Chips livraison */}
                <div className="vp-order-chips">
                  {o?.qty > 0  && <span className="vp-card-chip"><i className="fas fa-layer-group" /> {o.qty} art.</span>}
                  {o?.size && o.size !== "No Size" && <span className="vp-card-chip"><i className="fas fa-ruler" /> {o.size}</span>}
                  {o?.city   && <span className="vp-card-chip"><i className="fas fa-map-marker-alt" /> {o.city}</span>}
                  {o?.mobile && <span className="vp-card-chip"><i className="fas fa-phone" /> {o.mobile}</span>}
                </div>

                {/* Prix */}
                <div className="vp-card-price-row">
                  <span style={{ fontSize: "0.8rem", color: "#999" }}>{o?.qty} × {fmtPrice(o?.product?.price)} frs</span>
                  <strong style={{ fontSize: "1rem" }}>{fmtPrice(o?.price)} frs</strong>
                </div>

                {/* Actions escrow vendeur */}
                <div className="vp-order-actions">
                  {escrow === "paid_holding" && (
                    <button
                      className="vp-btn-ship"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() =>
                        handleMarkShipped(o.oid, (oid) =>
                          setOrders((prev) =>
                            prev.map((x) => x.oid === oid ? { ...x, escrow_status: "shipped" } : x)
                          )
                        )
                      }
                    >
                      <i className="fas fa-truck" /> Marquer comme expédié
                    </button>
                  )}
                  {escrow === "shipped"   && <span className="vp-escrow-badge vp-escrow-shipped">📦 Expédié — attente de validation client</span>}
                  {escrow === "validated" && <span className="vp-escrow-badge vp-escrow-validated">✅ Validé — paiement en cours</span>}
                  {escrow === "released"  && <span className="vp-escrow-badge vp-escrow-released">💸 Paiement reversé</span>}
                </div>

              </div>
              );
            })}
            {orders.length === 0 && (
              <div className="vp-empty">Aucune commande reçue.</div>
            )}
          </div>
        )}

        {/* Onglet MyOrders (mes achats) */}
        {activeTab === "myOrders" && (
          <div className="vp-orders-list">
            {myOrders.map((mo) => {
              const escrow   = (mo.escrow_status || "").toLowerCase();
              const pillCls  = escrow === "shipped"   ? "vp-s-info"
                             : escrow === "validated" || escrow === "released" ? "vp-s-success"
                             : "vp-s-warning";
              const pillText = escrow === "paid_holding"    ? "Payé"
                             : escrow === "shipped"         ? "Expédié"
                             : escrow === "validated"       ? "Validé"
                             : escrow === "released"        ? "Finalisé"
                             : escrow === "pending_payment" ? "En attente"
                             : mo.payment_status || mo.status || "En attente";
              return (
              <div key={mo.id || mo.oid} className="vp-card">

                {/* Bannière image */}
                <div className="vp-order-banner">
                  {mo.product?.image
                    ? <img src={mo.product.image} alt={mo.product?.title} />
                    : <div className="vp-order-banner-placeholder"><i className="fas fa-image" /></div>
                  }
                  <span className={`vp-order-status-pill ${pillCls}`}>{pillText}</span>
                </div>

                {/* Corps */}
                <div className="vp-order-body">
                  <div className="vp-order-meta-row">
                    <span className="vp-order-oid">#{mo.oid}</span>
                    <span className="vp-order-date"><i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />{formatDate(mo?.date)}</span>
                  </div>
                  <p className="vp-order-title">{mo.product?.title || "Produit"}</p>
                  {mo?.vendor?.name && (
                    <p className="vp-order-sub"><i className="fas fa-store" /> {mo.vendor.name}</p>
                  )}
                </div>

                {/* Chips */}
                <div className="vp-order-chips">
                  {mo?.qty > 0  && <span className="vp-card-chip"><i className="fas fa-layer-group" /> {mo.qty} art.</span>}
                  {mo?.size  && mo.size  !== "No Size"  && <span className="vp-card-chip"><i className="fas fa-ruler" />   {mo.size}</span>}
                  {mo?.color && mo.color !== "No Color" && <span className="vp-card-chip"><i className="fas fa-palette" /> {mo.color}</span>}
                  {mo?.city  && <span className="vp-card-chip"><i className="fas fa-map-marker-alt" /> {mo.city}</span>}
                </div>

                {/* Prix */}
                <div className="vp-card-price-row">
                  <span style={{ fontSize: "0.8rem", color: "#999" }}>{mo?.qty} × {fmtPrice(mo?.product?.price)} frs</span>
                  <strong style={{ fontSize: "1rem" }}>{fmtPrice(mo?.price)} frs</strong>
                </div>

                {/* Bloc escrow */}
                <div className="vp-order-actions">
                  {escrow === "paid_holding" && (
                    <div className="vp-validation-block" style={{ margin: 0 }}>
                      <p className="vp-validation-hint" style={{ margin: 0 }}>
                        <i className="fas fa-lock" style={{ marginRight: 6 }} />
                        Paiement sécurisé — le vendeur prépare votre commande.
                      </p>
                    </div>
                  )}

                  {escrow === "shipped" && (
                    <div className="vp-validation-block" style={{ margin: 0 }}>
                      <p className="vp-validation-hint">
                        <i className="fas fa-truck" style={{ marginRight: 6 }} />
                        Article expédié — entrez votre code à réception.
                      </p>
                      <div className="vp-validation-input-row">
                        <input
                          type="text"
                          className="vp-form-control vp-code-input"
                          placeholder="A3F7D2"
                          maxLength={6}
                          value={validationInputs[mo.oid] || ""}
                          onChange={(e) =>
                            setValidationInputs((prev) => ({
                              ...prev,
                              [mo.oid]: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                        <button
                          className="vp-btn-validate"
                          disabled={validatingOid === mo.oid || !(validationInputs[mo.oid] || "").trim()}
                          onClick={async () => {
                            setValidatingOid(mo.oid);
                            await handleValidateDelivery(
                              mo.oid,
                              validationInputs[mo.oid] || "",
                              () =>
                                setMyOrders((prev) =>
                                  prev.map((x) =>
                                    x.oid === mo.oid ? { ...x, escrow_status: "validated" } : x
                                  )
                                )
                            );
                            setValidatingOid(null);
                          }}
                        >
                          {validatingOid === mo.oid
                            ? <><i className="fas fa-spinner fa-spin" /> Vérif…</>
                            : <><i className="fas fa-check" /> Valider</>
                          }
                        </button>
                      </div>
                      <p className="vp-validation-note">
                        <i className="fas fa-envelope" /> Code reçu par e-mail lors de l'achat.
                      </p>
                    </div>
                  )}

                  {escrow === "validated" && (
                    <span className="vp-escrow-badge vp-escrow-validated">✅ Réception confirmée — paiement en cours</span>
                  )}
                  {escrow === "released" && (
                    <span className="vp-escrow-badge vp-escrow-released">💸 Commande finalisée</span>
                  )}
                </div>

              </div>
              );
            })}
            {myOrders.length === 0 && (
              <div className="vp-empty">Aucune commande passée.</div>
            )}
          </div>
        )}

        {/* Onglet Avis reçus */}
        {activeTab === "reviews" && (() => {
          const avg = vendorReviews.length
            ? (vendorReviews.reduce((s, r) => s + r.rating, 0) / vendorReviews.length).toFixed(1)
            : null;
          return (
            <div style={{ padding: "16px" }}>
              {avg && (
                <div className="vp-review-summary">
                  <span className="vp-review-avg">{avg}</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1,2,3,4,5].map((s) => (
                      <i key={s} className={`fas fa-star ${parseFloat(avg) >= s ? "vp-star-on" : "vp-star-off"}`} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: "#666", marginLeft: "auto" }}>
                    {vendorReviews.length} avis
                  </span>
                </div>
              )}

              <div className="vp-review-list">
                {vendorReviews.map((r) => (
                  <div key={r.id} className="vp-review-item">
                    <div className="vp-review-item-header">
                      {r.user_image && (
                        <img src={r.user_image} className="vp-review-avatar" alt="" />
                      )}
                      <div style={{ flex: 1 }}>
                        <span className="vp-review-name">{r.user_name}</span>
                        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                          {[1,2,3,4,5].map((s) => (
                            <i key={s} className={`fas fa-star ${r.rating >= s ? "vp-star-on" : "vp-star-off"}`} style={{ fontSize: 11 }} />
                          ))}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: "#999" }}>
                        {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {r.comment && <p className="vp-review-comment">{r.comment}</p>}
                  </div>
                ))}
                {vendorReviews.length === 0 && (
                  <div className="vp-empty">Aucun avis reçu pour l'instant.</div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default VendorProfile;
