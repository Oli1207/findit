import React, { useState, useEffect, useRef } from "react";
import apiInstance from "../../utils/axios";
import { Link, useNavigate } from "react-router-dom";
import GetCurrentAddress from "../plugin/UserCountry";
import UserData from "../plugin/UserData";
import { useMediaQuery } from "react-responsive";
import Swal from "sweetalert2";
import Review from "./Review";
import "./tiktokfeed.css";
// import star from 'etoile.png'
import { useFollowStore } from "../../store/useFollowStore";
import ReloadPrompt from "../../Prompt";
import InstallButton from "../../InstallButton";
import { setUser } from "../../utils/auth";
import { saveOrderOffline, syncOrdersIfOnline } from "./OrderQueue";
import { subscribeUserToPush } from "../../utils/push";
import { syncReviewsIfOnline } from "./ReviewOffline";
import { useSwipeable } from "react-swipeable";
import BottomBar from "./BottomBar";
import ProductSlider from "./ProductSlider";
import BuyModal from "./BuyModal";
import LoginModal from "../auth/LoginModal";
import { useTheme } from "../../context/ThemeContext";

const Solde = () => {
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const axios = apiInstance;
  const userData = UserData();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { toggle, isDark } = useTheme();
  const currentAddress = GetCurrentAddress();
  const navigate = useNavigate();
  const [orderProduct, setOrderProduct] = useState(null);
  const [showLogin,    setShowLogin]    = useState(false);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showSpecifications, setShowSpecifications] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [specificationStates, setSpecificationStates] = useState({});
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [loading, setLoading] = useState(true);
  
const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedPresentation, setSelectedPresentation] = useState(null);
const [commentValue, setCommentValue] = useState("");
const [replyingTo, setReplyingTo] = useState(null);
const [replyValue, setReplyValue] = useState("");
const videoRefs = useRef([]);
videoRefs.current = []; // Nettoie avant chaque nouveau rendu de .map



  const [customAddress, setCustomAddress] = useState({
    mobile: "",
    address: "",
    city: "",
    state: "",
    // country: currentAddress.country,
  });


  //tous les syncs
  useEffect(() => {
    setUser(); // ← essentiel pour lire le cookie et décoder le user
  }, []);

  useEffect(() => {
    const syncAll = () => {
      if (navigator.onLine) {
        syncOrdersIfOnline();
        syncReviewsIfOnline();
      }
    };

    syncAll();
    window.addEventListener("online", syncAll);
    return () => window.removeEventListener("online", syncAll);
  }, []);

  //fin sync

  // const [followStates, setFollowStates] = useState({});
  const { followStates, fetchFollowStates, toggleFollow } = useFollowStore();

  const [search, setSearch] = useState("");

  const [viewCountTrigger, setViewCountTrigger] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("userData", userData); // ➤ ajoute ça

        const response = await axios.get(`user/profile/${userData?.user_id}/`); // Remplacez par l'URL complète si nécessaire
        setProfileData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfile();
  }, [userData?.user_id]);

  const handleOrderClick = (product) => {
    if (!userData) { setShowLogin(true); return; }
    setOrderProduct(product);
  };

  const handleCloseOrder = () => {
    setOrderProduct(null);
  };
  useEffect(() => {
  let page = 1;
  let hasMore = true;
  let isFetching = false;

  const fetchProducts = async () => {
    if (!hasMore || isFetching) return;

    isFetching = true;
    setLoading(true);
    try {
      const response = await axios.get(`products-soldes/?page=${page}`);

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];

      const transformed = data.map((item) => {
        const galleryImages = item.gallery?.map((g) => g.image) || [];
        return {
          ...item,
          gallery: galleryImages,
        };
      });

      setProducts((prev) => [...prev, ...transformed]);

      // Logs
      console.log("💡 Produits personnalisés pour:", userData?.user_id);
      data.forEach((product, i) => {
        console.log(
          `#${(page - 1) * (response.data.page_size || 5) + (i + 1)} ${product.title} — vues: ${
            product.views
          }, rating: ${product.rating}, vendor: ${product.vendor?.name}`
        );
      });

      // fetchFollowStates
      const vendorIds = data.map((p) => p.vendor?.id).filter(Boolean);
      if (vendorIds.length && userData?.user_id) {
        await fetchFollowStates(vendorIds, userData?.user_id);
      }

      // Gestion pagination ou liste brute
      hasMore = Array.isArray(response.data)
        ? data.length > 0
        : !!response.data.next;

      page++;
    } catch (error) {
      console.error("Erreur chargement produits :", error);
    } finally {
      setLoading(false);
      isFetching = false;
    }
  };

  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 50 &&
      !loading &&
      hasMore
    ) {
      fetchProducts();
    }
  };

  window.addEventListener("scroll", handleScroll);

  // Reset au changement d'utilisateur ou de vues + premier chargement
  setProducts([]);
  page = 1;
  hasMore = true;
  fetchProducts();

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [userData?.user_id, viewCountTrigger]);

  const startTimesRef = useRef({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const productId = entry.target.getAttribute("data-id");
          if (!productId) return;

          if (entry.isIntersecting) {
            if (!startTimesRef.current[productId]) {
              startTimesRef.current[productId] = Date.now();
              console.log(`👁️ Produit ${productId} visible → start`);
            }
          } else {
            const startTime = startTimesRef.current[productId];
            if (startTime) {
              const duration = (Date.now() - startTime) / 1000;
              console.log(
                `👋 Produit ${productId} sort → ${duration.toFixed(2)}s`
              );

              if (duration >= 15) {
                console.log(
                  `✅ Envoi vue pour ${productId} (${duration.toFixed(2)}s)`
                );
                sendView(productId, duration);
              } else {
                console.log(
                  `⏱️ Ignoré : temps trop court pour ${productId} (${duration.toFixed(
                    2
                  )}s)`
                );
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
        user_id: userData?.user_id,
        product_id: productId,
        duration: duration,
      });
      console.log(`Vue enregistrée pour ${productId} (durée: ${duration}s)`);

      // ✅ Déclencher refetch du feed
      setViewCountTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Erreur enregistrement vue :", error);
    }
  };

  useEffect(() => {
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.7 };

  const observerCallback = (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        // Pause les autres vidéos
        videoRefs.current.forEach((v) => {
          if (v !== video && v) v.pause();
        });
        video.play();
      } else {
        video.pause();
      }
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);

  videoRefs.current.forEach((video) => {
    if (video) observer.observe(video);
  });

  return () => {
    videoRefs.current.forEach((video) => {
      if (video) observer.unobserve(video);
    });
  };
}, [products]); // ← ou [videos] selon ton tableau utilisé


  // const handleFollowToggle = (userId, vendorId) => {
  //   if (!userId || !vendorId) {
  //     console.error("User ID or Vendor ID is missing");
  //     return;
  //   }
  //   // Créer une instance de FormData
  //   const formData = new FormData();
  //   formData.append('user_id', userId); // Ajouter l'ID de l'utilisateur

  //   // Envoyer une requête POST à l'API
  //   axios.post(`toggle-follow/${vendorId}/`, formData)
  //     .then(response => {
  //       if (response.data.success) {
  //         console.log(response.data);
  //         setFollowStates((prevState) => ({
  //           ...prevState,
  //           [vendorId]: response.data.following, // Met à jour l'état pour ce vendeur
  //         }));

  //       } else {
  //         console.error('Erreur:', response.data.error);
  //       }
  //     })
  //     .catch(error => {
  //       console.error('Error toggling follow:', error);
  //     });
  // };

  const handleStartConversation = async (vendorId) => {
    const userId = userData?.user_id; // Exemple de récupération de l'ID utilisateur
    if (!userId) {
      alert("User ID is missing. Please log in.");
      return;
    }

    if (!vendorId) {
      alert("Vendor ID is missing.");
      return;
    }

    try {
      const response = await apiInstance.post("conversations/", {
        user_id: userId,
        vendor_id: vendorId,
      });
      const conversation = response.data;
      console.log("Conversation started:", conversation);

      navigate(`/conversation/${conversation.id}`);
      console.log(conversation.id);
    } catch (error) {
      console.error(
        "Error starting conversation:",
        error.response?.data || error.message
      );
      alert("Unable to start conversation. Please try again.");
    }
  };

  const handleReviewIconClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseReview = () => {
    setSelectedProduct(null);
  };

  const handleColorButtonClick = (product_id, colorName) => {
    setColorValue(colorName);
    setSelectedColors((prevSelectedColors) => ({
      ...prevSelectedColors,
      [product_id]: colorName,
    }));
  };

  const handleSizeButtonClick = (product_id, sizeName) => {
    setSizeValue(sizeName);
    setSelectedSize((prevSelectedSize) => ({
      ...prevSelectedSize,
      [product_id]: sizeName,
    }));
  };

  const handleQtyChange = (event) => {
    setQtyValue(event.target.value);
  };

  const handleAddressChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlaceOrder = async (product_id, price, vendor_id) => {
    if (!userData) {
      navigate("/login");
      return;
    }
    const orderData = {
      product_id,
      user_id: userData?.user_id,
      qty: qtyValue,
      price,
      vendor: vendor_id,
      size: sizeValue,
      color: colorValue,
      full_name: userData?.full_name,
      mobile: useProfileAddress ? profileData?.mobile : customAddress.mobile,
      address: useProfileAddress ? profileData?.address : customAddress.address,
      city: useProfileAddress ? profileData?.city : customAddress.city,
      state: useProfileAddress ? profileData?.state : "",
      country: useProfileAddress ? profileData?.country : "",
    };

    // ✅ Mise à jour profil si nécessaire
    if (!useProfileAddress) {
      const profileForm = new FormData();
      profileForm.append("mobile", customAddress.mobile);
      profileForm.append("address", customAddress.address);
      profileForm.append("city", customAddress.city);
      try {
        await axios.patch(`user/profile/${userData?.user_id}/`, profileForm);
      } catch (error) {
        console.error("Erreur mise à jour profil :", error);
      }
    }

    // ✅ Vérifier connexion
    if (!navigator.onLine) {
      saveOrderOffline(orderData);
      Swal.fire({
        icon: "info",
        title: "Commande enregistrée hors-ligne",
        text: "Elle sera automatiquement envoyée dès que vous serez reconnecté.",
      });
      return;
    }

    // ✅ Envoi au serveur
    try {
      const formData = new FormData();
      Object.entries(orderData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await axios.post(`create-order/`, formData);

      Swal.fire({
        icon: "success",
        title: "Commande passée avec succès !",
        text: response.data.message,
      });
      setOrderProduct(null);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Échec commande",
        text: error.response?.data?.message || "Erreur réseau",
      });

      saveOrderOffline(orderData);
      alert("Commande enregistrée hors-ligne.");
    }
  };

  const addToWishList = async (productId) => {
    const formdata = new FormData();
    formdata.append("product_id", productId);
    formdata.append("user_id", userData?.user_id);

    const response = await axios.post(
      `customer/wishlist/${userData?.user_id}/`,
      formdata
    );
    Swal.fire({
      icon: "success",
      title: response.data.message,
    });
  };

  const toggleSpecification = (productId) => {
    setSpecificationStates((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleViewProduct = (product) => {
    window.open(product.url, "_blank");
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
  useEffect(() => {
    const access = localStorage.getItem("access");
    if (userData) {
      // L'utilisateur est connecté, on tente d'enregistrer la subscription
      subscribeUserToPush();
    }
  }, []);

  //pour vidéo

  
 const handleLike = async (id) => {
  try {
    const res = await apiInstance.post(`presentations/${id}/like/`, {
      user: userData?.user_id,
    });

    // Met à jour localement uniquement le bon item dans le tableau
    const updatedItems = products.map((item) =>
      item.id === id && item.type === "presentation"
        ? { ...item, likes_count: res.data.likes_count }
        : item
    );

    setProducts(updatedItems); // 🔁 met à jour sans refetch
  } catch (err) {
    console.error("Erreur like:", err);
  }
};


const handleComment = async (presentationId, content, parentId = null) => {
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
const handleCommentIconClick = (presentation) => {
  setSelectedPresentation(presentation);
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
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setSelectedIndex((prev) => ({
        ...prev,
        [item.id]: Math.min((prev[item.id] || 0) + 1, totalImages - 1),
      }));
    },
    onSwipedRight: () => {
      setSelectedIndex((prev) => ({
        ...prev,
        [item.id]: Math.max((prev[item.id] || 0) - 1, 0),
      }));
    },
    trackMouse: true,
  });
  const handleReviewStatsChange = (productId, stats) => {
  setProducts((prev) =>
    prev.map((p) =>
      p.id === productId
        ? { ...p, rating: stats.rating, rating_count: stats.rating_count }
        : p
    )
  );
};

  // fin vidéo
  if (loading) {
    return (
      <div className="loading-spinner">
        <i style={{ color: "#FF6B35" }} className="fas fa-spinner fa-spin fa-3x" />
        <span>Chargement des soldes…</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <InstallButton />

      {/* ── Top bar Solde ── */}
      <div className="top-bar">
        {/* Toggle dark/light — gauche */}
        <div className="top-bar-left">
          <button
            className="top-icon-btn top-theme-btn"
            onClick={toggle}
            aria-label="Changer le thème"
          >
            <i className={isDark ? "fas fa-sun" : "fas fa-moon"} />
          </button>
        </div>

        <div className="top-tabs">
          <span className="tab-pill active">🔥 Solde</span>
          <Link to="/" className="brand-center">find<span>IT</span></Link>
          <Link to="/suivis" className="tab-pill">Suivis</Link>
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
              <span style={{ fontSize: 52, display: "block", marginBottom: 16 }}>🏷️</span>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 8 }}>
                Aucun article en solde
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Reviens bientôt, les bonnes affaires arrivent !
              </p>
            </div>
          </div>
        ) : (
          products.map((item, index) => (
            <div
              className="feed-item"
              data-id={`${item.type}-${item.id}`}
              key={`${item.type}-${item.id}`}
            >
              {item.type === "product" ? (
                /* ── Carte produit solde ── */
                <>
                  <ProductSlider item={item} />
                  <div className="feed-gradient-top" />
                  <div className="feed-gradient" />

                  <div className="info">
                    {/* Chip vendeur */}
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

                    <h2><Link to={`/detail/${item.slug}`}>{item.title}</Link></h2>
                    <p>{item.description}</p>

                    {/* Prix avec badge de réduction */}
                    <div className="price-row">
                      {item.solde && item.old_price && Number(item.old_price) > Number(item.price) ? (
                        <>
                          <span className="price-old">
                            {Math.round(Number(item.old_price)).toLocaleString("fr-FR")} frs
                          </span>
                          <span className="solde-pct-badge">
                            -{Math.round((1 - Number(item.price) / Number(item.old_price)) * 100)}%
                          </span>
                        </>
                      ) : null}
                      <span className="price-current">
                        {Math.round(Number(item.price)).toLocaleString("fr-FR")} frs
                      </span>
                    </div>

                    {/* CTA Acheter — variante solde */}
                    <div className="feed-cta-row">
                      <button className="feed-buy-btn solde" onClick={() => handleOrderClick(item)}>
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
                      <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#FF6B35", fontSize: "12px" }}>
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

      {/* ── Overlay avis ── */}
      {selectedProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseReview}>&times;</button>
            <Review product={selectedProduct} userData={userData} onReviewStatsChange={handleReviewStatsChange} />
          </div>
        </div>
      )}

      {/* ── Modal commande (BuyModal partagé — Paystack escrow + commission) ── */}
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />
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
            <h4 className="mb-3">Commentaires</h4>

            <div className="mb-3" style={{ maxHeight: "300px", overflowY: "auto", color: "black" }}>
              {selectedPresentation.comments
                .filter((c) => c.parent === null)
                .map((comment) => (
                  <div key={comment.id}>
                    <b>{comment.display_name}</b> : {comment.content}
                    <button className="btn btn-sm btn-link" onClick={() => setReplyingTo(comment.id)}>Répondre</button>
                    {comment?.replies.map((reply) => (
                      <div key={reply.id} style={{ marginBottom: 20, marginLeft: 20, fontStyle: "italic" }}>
                        ↳ <b>{reply.display_name}</b> : {reply.content}
                      </div>
                    ))}
                    {replyingTo === comment.id && (
                      <div className="d-flex gap-2 my-1">
                        <input type="text" placeholder="Votre réponse" className="form-control"
                          value={replyValue} onChange={(e) => setReplyValue(e.target.value)} />
                        <button className="btn btn-success"
                          onClick={() => replyValue.trim() && handleComment(selectedPresentation.id, replyValue, comment.id)}>
                          Envoyer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="d-flex gap-2">
              <input type="text" placeholder="Votre commentaire" className="form-control"
                value={commentValue} onChange={(e) => setCommentValue(e.target.value)} />
              <button className="btn btn-primary"
                onClick={() => commentValue.trim() && handleComment(selectedPresentation.id, commentValue)}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solde;
