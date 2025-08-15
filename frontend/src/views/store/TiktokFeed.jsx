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

const TikTokFeed = () => {
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const axios = apiInstance;
  const userData = UserData();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const currentAddress = GetCurrentAddress();
  const navigate = useNavigate();
  const [orderProduct, setOrderProduct] = useState(null);
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSize, setSelectedSize] = useState({});
  const [showSpecifications, setShowSpecifications] = useState({});
  const [colorValue, setColorValue] = useState("No Color");
  const [sizeValue, setSizeValue] = useState("No Size");
  const [qtyValue, setQtyValue] = useState(1);
  const [specificationStates, setSpecificationStates] = useState({});
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [loading, setLoading] = useState(true);

  const [selectedIndex, setSelectedIndex] = useState({});

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
    if (!userData) {
      navigate("/login");
      return;
    }
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
      if (userData?.user_id) {
        const response = await axios.get(`unified-feed/${userData.user_id}/?page=${page}`);
        
        // Si backend avec pagination DRF
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

        console.log("💡 Produits personnalisés pour:", userData.user_id);
        data.forEach((product, i) => {
          console.log(
            `#${(page - 1) * (response.data.page_size || 5) + (i + 1)} ${product.title} — vues: ${
              product.views
            }, rating: ${product.rating}, vendor: ${product.vendor?.name}`
          );
        });

        const vendorIds = data.map((p) => p.vendor?.id).filter(Boolean);
        await fetchFollowStates(vendorIds, userData?.user_id);

        // Gestion pagination ou liste brute
        hasMore = Array.isArray(response.data)
          ? data.length > 0
          : !!response.data.next;
      } else {
        const response = await axios.get(`popular-products/?page=${page}`);
        
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        setProducts((prev) => [...prev, ...data]);

        hasMore = Array.isArray(response.data)
          ? data.length > 0
          : !!response.data.next;
      }
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

  // Reset au changement d'utilisateur ou de vues
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

  // fin vidéo
  if (loading) {
    return (
      <div className="loading-spinner">
        <i
          style={{ color: "#DF468F" }}
          className="fas fa-spinner fa-spin fa-3x"
        ></i>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* <ReloadPrompt/> */}
      <InstallButton />
      {/* Top navigation */}
      <div className="top-bar">
        <div className="tabs">
          <Link to="/solde" className="text-decoration-none text-white">
            <span>Solde</span>
          </Link>
          <Link to="/suivis" className="text-decoration-none text-white">
            <span>Suivis </span>
          </Link>
          {/* <span className="active">Accueil</span> */}
        </div>
        <div className="search-icon">
          <Link to="/search" className="text-decoration-none text-white">
            <i class="fas fa-search"></i>
          </Link>
        </div>
      </div>

      {/* Feed */}
      <div className="feed-container">
        {products.map((item, index) => (
          <div
            className="feed-item"
            data-id={`${item.type}-${item.id}`}
            key={`${item.type}-${item.id}`}
          >
            {/* Si c'est un produit */}
            {item.type === "product" ? (
              <>
                <div className="feed-image">
                  <div
                    {...handlers}
                    className="feed-slider"
                    style={{
                      display: "flex",
                      transform: `translateX(-${
                        (selectedIndex[item.id] || 0) * 100
                      }%)`,
                      transition: "transform 0.3s ease",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    {[item.image, ...(item.gallery || [])].map(
                      (img, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={img}
                          className="feed-slide-image"
                          alt={item.title}
                          style={{
                            minWidth: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )
                    )}
                  </div>

                  {/* Points de navigation */}
                  <div
                    className="feed-dots"
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: "5px",
                      zIndex: "10",
                    }}
                  >
                    {[item.image, ...(item.gallery || [])].map(
                      (_, imgIndex) => (
                        <span
                          key={imgIndex}
                          className={`feed-dot ${
                            (selectedIndex[item.id] || 0) === imgIndex
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedIndex((prev) => ({
                              ...prev,
                              [item.id]: imgIndex,
                            }))
                          }
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background:
                              (selectedIndex[item.id] || 0) === imgIndex
                                ? "white"
                                : "rgba(255,255,255,0.5)",
                            cursor: "pointer",
                          }}
                        />
                      )
                    )}
                  </div>
                  
                </div>

                <div className="info">
                  <Link
                    to={
                      item.vendor?.user === userData?.user_id
                        ? `/vendor/${item.vendor?.slug}/`
                        : `/customer/${item.vendor?.slug}/`
                    }
                    style={{ fontWeight: "bold", fontSize: "15px" }}
                    className="ms-2"
                  >
                    {item.vendor?.name}
                  </Link>

                  <h2>
                    <Link to={`/detail/${item.slug}`}>{item.title}</Link>
                  </h2>
                  <p style={{ color: "white" }}>{item.description}</p>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "#DF468F",
                    }}
                  >
                    {item.price} frs
                  </p>
                  <p>{item?.category?.title}</p>

                  {/* Spécifications */}
                  <div className="specifications mt-2">
                    {item.specification && item.specification.length > 0 && (
                      <>
                        <p
                          onClick={() => toggleSpecification(item.id)}
                          style={{
                            cursor: "pointer",
                            color: "#ffffff",
                            fontSize: "14px",
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <i className="fas fa-info-circle me-2" />
                          Spécifications
                        </p>

                        {specificationStates[item.id] && (
                          <div
                            className="text-white mt-2 small"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {item.specification
                              .slice(0, 3)
                              .map((spec, index) => (
                                <div key={index} className="mb-1">
                                  <strong>{spec.title}:</strong> {spec.content}
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="actions">
                  <Link
                    to={
                      item.vendor?.user === userData?.user_id
                        ? `/vendor/${item.vendor?.slug}/`
                        : `/customer/${item.vendor?.slug}/`
                    }
                  >
                    <img
                      src={item.vendor?.image}
                      className="rounded-circle"
                      alt={item.vendor?.name}
                      style={{
                        height: "40px",
                        width: "50px",
                        objectFit: "cover",
                        margin: "10px",
                      }}
                    />
                  </Link>

                  {item.vendor?.user !== userData?.user_id && (
                    <span
                      onClick={() =>
                        toggleFollow(userData?.user_id, item.vendor?.id)
                      }
                      style={{
                        cursor: "pointer",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        backgroundColor: followStates[item.vendor?.id]
                          ? "#e0e0e0"
                          : "#007bff",
                        color: followStates[item.vendor?.id] ? "#333" : "#fff",
                        fontSize: "12px",
                        fontWeight: 500,
                        marginLeft: "10px",
                      }}
                    >
                      {followStates[item.vendor?.id] ? (
                        ""
                      ) : (
                        <i className="fas fa-plus" />
                      )}
                    </span>
                  )}

                  <div className="action-btn">
                    <i className="fas fa-star" />
                    <span>{item.rating ? item.rating.toFixed(1) : "0.0"}</span>
                  </div>
                  <div
                    className="action-btn"
                    onClick={() => handleReviewIconClick(item)}
                  >
                    <i className="fas fa-comment-dots" />
                    <span>{item.rating_count || 0}</span>
                  </div>
                  <div
                    className="action-btn"
                    onClick={() => handleOrderClick(item)}
                  >
                    <i className="fas fa-shopping-cart" />
                  </div>
                  <div
                    className="action-btn"
                    onClick={() => handleCopyLink(item)}
                  >
                    <i className="fas fa-link" />
                  </div>
                </div>
              </>
            ) : (
              // Si c’est une présentation vidéo
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
                    const video = e.target;
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />

                <div className="overlay"></div>

                <div className="info">
                  <h3 style={{ textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",  color:"white"  }}>
                    {item.vendor?.name}
                  </h3>
                  <h2 style={{ textShadow: "0 0 9px rgba(0, 0, 0, 0.6)", color:"white" }}>
                    {item.title}
                  </h2>
                  <p style={{ textShadow: "0 0 9px rgba(0, 0, 0, 0.6)",  color:"white"  }}>
                    {item.description}
                  </p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.link}
                    </a>
                  )}
                </div>

                <div className="actions">
                  <div
                    style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                    className="action-btn"
                    onClick={() => handleLike(item.id)}
                  >
                    <i className="fas fa-heart" /> {item.likes_count}
                  </div>
                  <div
                    style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                    className="action-btn"
                    onClick={() => handleCommentIconClick(item)}
                  >
                    <i className="fas fa-comment-dots"></i>{" "}
                    <span>{item.comments?.length || 0}</span>
                  </div>
                  <div
                    style={{ textShadow: "0 0 4px rgba(0, 0, 0, 0.6)" }}
                    className="action-btn"
                    onClick={() => copyLink(item.id)}
                  >
                    <i className="fas fa-link" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <BottomBar />

      {/* Review overlay */}
      {selectedProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseReview}>
              &times;
            </button>
            <Review product={selectedProduct} userData={userData} />
          </div>
        </div>
      )}
      {orderProduct && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseOrder}>
              &times;
            </button>
            <h4 className="mb-3">{orderProduct.title}</h4>
            {/* Variations */}
            <div className="mb-3">
              <label>
                <b>Quantité :</b>
              </label>
              <input
                type="number"
                className="form-control"
                value={qtyValue}
                min="1"
                onChange={handleQtyChange}
              />
            </div>
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
                  {orderProduct.size.map((size, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleSizeButtonClick(orderProduct.id, size.name)
                      }
                      className={`btn btn-sm ${
                        selectedSize[orderProduct.id] === size.name
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {orderProduct.color?.length > 0 && (
              <div className="mb-3">
                <label className="d-flex align-items-center gap-2">
                  <b>Couleur :</b>

                  {/* ✅ Cercle coloré + nom ou code affiché */}
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
                  {orderProduct.color.map((color, index) => (
                    <button
                      key={index}
                      className="btn btn-sm p-3"
                      style={{
                        backgroundColor: color.color_code,
                        border:
                          selectedColors[orderProduct.id] === color.color_code
                            ? "2px solid black"
                            : "1px solid #ccc",
                      }}
                      onClick={() =>
                        handleColorButtonClick(
                          orderProduct.id,
                          color.color_code
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Utiliser mon adresse */}
            {profileData?.mobile &&
            profileData?.address &&
            profileData?.city ? (
              <div className="form-check my-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="useProfileAddress"
                  checked={useProfileAddress}
                  onChange={(e) => setUseProfileAddress(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="useProfileAddress">
                  Utiliser mon adresse enregistrée
                </label>
              </div>
            ) : null}
            {/* /* Si décoché ou adresse inexistante → champs personnalisés  */}
            {(!useProfileAddress ||
              !profileData?.mobile ||
              !profileData?.address ||
              !profileData?.city) && (
              <div>
                <div className="mb-2">
                  <label>Téléphone</label>
                  <input
                    className="form-control"
                    value={customAddress.mobile}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        mobile: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
                <div className="mb-2">
                  <label>Adresse</label>
                  <input
                    className="form-control"
                    value={customAddress.address}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        address: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
                <div className="mb-2">
                  <label>Ville</label>
                  <input
                    className="form-control"
                    value={customAddress.city}
                    onChange={(e) =>
                      setCustomAddress({
                        ...customAddress,
                        city: e.target.value,
                      })
                    }
                    type="text"
                  />
                </div>
              </div>
            )}
            {/* Boutons actions */}
            <button
              className="btn btn-primary w-100 my-2"
              onClick={() =>
                handlePlaceOrder(
                  orderProduct?.id,
                  orderProduct?.price,
                  orderProduct.vendor?.id
                )
              }
            >
              <i className="fas fa-shopping-cart me-2" />
              Commander
            </button>
            <button
              className="btn btn-outline-danger w-100"
              onClick={() => addToWishList(orderProduct.id)}
            >
              <i className="fas fa-heart me-2" />
              Ajouter en wishlist
            </button>
          </div>
        </div>
      )}
      {selectedPresentation && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseCommentOverlay}>
              &times;
            </button>
            <h4 className="mb-3">Commentaires</h4>

            {/* Liste des commentaires */}
            <div
              className="mb-3"
              style={{ maxHeight: "300px", overflowY: "auto", color: "black" }}
            >
              {selectedPresentation.comments
                .filter((comment) => comment.parent === null)
                .map((comment) => (
                  <div key={comment.id}>
                    <b>{comment.display_name}</b> : {comment.content}
                    <button
                      className="btn btn-sm btn-link"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      Répondre
                    </button>
                    {/* Réponses */}
                    {comment?.replies.map((reply) => (
                      <div
                        key={reply.id}
                        style={{
                          marginBottom: "20px",
                          marginLeft: "20px",
                          fontStyle: "italic",
                        }}
                      >
                        ↳ <b>{reply.display_name}</b> : {reply.content}
                      </div>
                    ))}
                    {/* Formulaire de réponse */}
                    {replyingTo === comment.id && (
                      <div className="d-flex gap-2 my-1">
                        <input
                          type="text"
                          placeholder="Votre réponse"
                          className="form-control"
                          value={replyValue}
                          onChange={(e) => setReplyValue(e.target.value)}
                        />
                        <button
                          className="btn btn-success"
                          onClick={() =>
                            replyValue.trim() &&
                            handleComment(
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
            </div>

            {/* Ajouter un commentaire principal */}
            <div className="d-flex gap-2">
              <input
                type="text"
                placeholder="Votre commentaire"
                className="form-control"
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() =>
                  commentValue.trim() &&
                  handleComment(selectedPresentation.id, commentValue)
                }
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TikTokFeed;
