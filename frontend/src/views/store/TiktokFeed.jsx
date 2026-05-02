import React, { useState, useEffect, useRef } from "react";
import apiInstance from "../../utils/axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { BagCharacter, HeartCharacter } from "./CharacterMotion";
import CategoryOnboarding from "./CategoryOnboarding";

const TikTokFeed = () => {
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
const [showLogin, setShowLogin] = useState(false);

  // const [selectedIndex, setSelectedIndex] = useState({});

  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [commentValue, setCommentValue] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyValue, setReplyValue] = useState("");
  const videoRefs = useRef([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);

    // Références sur chaque item du feed (produits + présentations)
  const feedItemRefs = useRef([]);

  // Pour savoir sur quel item on doit se positionner au chargement
  const location = useLocation();
  const [initialTarget, setInitialTarget] = useState(null);

  // videoRefs.current = []; // Nettoie avant chaque nouveau rendu de .map

const [expandedText, setExpandedText] = useState({});

  // ── Onboarding catégories (invités) ──────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [guestCats, setGuestCats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('findit_guest_cats') || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    // Montrer l'onboarding uniquement si : pas connecté + jamais fait
    if (!userData && !localStorage.getItem('findit_onboarded')) {
      // Petit délai pour laisser le feed apparaître d'abord
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [userData]);

  // Quand l'utilisateur se connecte après avoir sélectionné des catégories en invité
  // → on envoie les slugs au backend pour créer des CategoryInterest
  useEffect(() => {
    if (!userData?.user_id) return;
    const savedCats = (() => {
      try { return JSON.parse(localStorage.getItem('findit_guest_cats') || '[]'); }
      catch { return []; }
    })();
    if (savedCats.length > 0) {
      apiInstance.post(`save-category-preferences/${userData.user_id}/`, {
        categories: savedCats,
      }).then(() => {
        // Supprimer après synchro pour ne pas re-envoyer
        localStorage.removeItem('findit_guest_cats');
      }).catch(() => {});
    }
  }, [userData?.user_id]);

  // ── Character Motion state ─────────────────────────────────────────────────
  const [focusedItemId,   setFocusedItemId]   = useState(null);
  const [focusedItem,     setFocusedItem]     = useState(null);
  const [enthusiasmLevel, setEnthusiasmLevel] = useState(0);
  const focusTimerRef        = useRef(null);
  const enthusiasmIntervalRef = useRef(null);
  const currentVisibleRef    = useRef(null);   // id du produit actuellement visible
  // Ref miroir de products pour les closures dans setTimeout
  const productsRef = useRef([]);

  // Garde productsRef synchronisé
  useEffect(() => { productsRef.current = products; }, [products]);

  //tous les syncs
  useEffect(() => {
    setUser(); // ← essentiel pour lire le cookie et décoder le user
  }, []);

  useEffect(() => {
    const syncAll = () => {
      if (navigator.onLine) {
        syncReviewsIfOnline(); // sync des reviews hors-ligne uniquement (commandes → Paystack, online only)
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


  useEffect(() => {
    if (!userData?.user_id) return;          // ← évite GET /user/profile/undefined/
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`user/profile/${userData.user_id}/`);
        setProfileData(response.data);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };
    fetchProfile();
  }, [userData?.user_id]);

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

  // ─── Normalisation des URLs d'images ────────────────────────────────────────
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

  // ─── Clé de cache localStorage pour le feed (par user_id ou "anon") ─────────
  const FEED_CACHE_KEY = `findit_feed_${userData?.user_id || "anon"}`;

  // ─── Chargement du feed (initial ou pagination) ──────────────────────────────
  const fetchProducts = async (pageNum = 1, append = false) => {
    // Page 1 : si on a un cache local valide (< 3 min), l'afficher immédiatement
    // puis revalider en arrière-plan (stale-while-revalidate)
    if (pageNum === 1 && !append) {
      try {
        const saved = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || "null");
        if (saved && Date.now() - saved.ts < 3 * 60 * 1000) {
          setProducts(saved.items);
          setHasMore(saved.hasMore ?? true);
          setLoading(false);
          // On continue le fetch pour mettre à jour en fond (pas de return)
        }
      } catch { /* localStorage indisponible */ }
    }

    if (pageNum === 1) setLoading((p) => (products.length === 0 ? true : p));
    else setLoadingMore(true);

    try {
      // Pour les invités : ajouter ?cats= si des catégories ont été sélectionnées
      const catsParam = (!userData?.user_id && guestCats.length > 0)
        ? `&cats=${guestCats.join(',')}`
        : '';
      const url = userData?.user_id
        ? `unified-feed/${userData.user_id}/?page=${pageNum}`
        : `popular-products/?page=${pageNum}${catsParam}`;

      const response = await axios.get(url);
      const data     = response.data;

      const rawItems = Array.isArray(data) ? data : (data.results || []);
      const more     = Array.isArray(data) ? false : (data.has_more ?? false);

      const transformed = normalizeItems(rawItems);

      if (append) {
        setProducts((prev) => [...prev, ...transformed]);
      } else {
        setProducts(transformed);
        // Mettre en cache page 1 pour la prochaine visite
        try {
          localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({
            items: transformed, hasMore: more, ts: Date.now(),
          }));
        } catch { /* quota exceeded, pas grave */ }
      }

      setHasMore(more);
      setCurrentPage(pageNum);

      if (userData?.user_id) {
        const vendorIds = rawItems.map((p) => p.vendor?.id).filter(Boolean);
        if (vendorIds.length) await fetchFollowStates(vendorIds, userData.user_id);
      }
    } catch (error) {
      console.error("Erreur chargement produits :", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Chargement initial (reset à chaque changement d'utilisateur)
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [userData?.user_id]);

  // ─── Infinite scroll : charge la page suivante quand on approche de la fin ──
  useEffect(() => {
    if (!hasMore || loadingMore || products.length === 0) return;

    const triggerIndex = products.length - 4;
    if (triggerIndex < 0) return;

    const triggerEl = feedItemRefs.current[triggerIndex];
    if (!triggerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          fetchProducts(currentPage + 1, true);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [products.length, hasMore, loadingMore, currentPage]);

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
  // ── Observer : déclenche le focused mode après 5s sur un produit ────────────
  // On garde l'observer actif même pendant le focused mode pour tracker
  // la visibilité (nécessaire pour le "retour des personnages" après slide)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const charId = entry.target.getAttribute("data-char-id");
          if (!charId) return;

          if (entry.isIntersecting) {
            // Nouveau produit visible → on démarre le timer de 5s
            if (currentVisibleRef.current !== charId) {
              // Annule le timer de l'ancien produit s'il était en cours
              if (focusTimerRef.current) {
                clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
              }
              currentVisibleRef.current = charId;
              focusTimerRef.current = setTimeout(() => {
                // L'utilisateur est resté 5s → on ouvre le focused mode
                const item = productsRef.current.find(
                  (p) => p.type === "product" && String(p.id) === charId
                );
                if (item) startFocusMode(item);
              }, 5000);
            }
          } else {
            // Produit sorti du viewport → annule le timer
            if (currentVisibleRef.current === charId) {
              currentVisibleRef.current = null;
              if (focusTimerRef.current) {
                clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
              }
            }
          }
        });
      },
      { threshold: 0.8 }
    );

    const items = document.querySelectorAll(".feed-item[data-char-id]");
    items.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [products]);

  // Récupère ?product=ID ou ?presentation=ID dans l'URL

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get("product");
    const presentationId = params.get("presentation");

    if (productId) {
      setInitialTarget({ id: productId, type: "product" });
    } else if (presentationId) {
      setInitialTarget({ id: presentationId, type: "presentation" });
    } else {
      setInitialTarget(null);
    }
  }, [location.search]);

    // Quand le feed est chargé ET qu'on a une cible initiale,
  // on scrolle jusqu'à l'item correspondant
  // Quand le feed est chargé ET qu'on a une cible initiale,
  // on scrolle jusqu'à l'item correspondant
  // Quand le feed est chargé ET qu'on a une cible initiale,
  // on scrolle jusqu'à l'item correspondant en cherchant directement dans le DOM
  useEffect(() => {
    if (!initialTarget || !products.length) return;

    // On cible d'abord exactement type-id, ex: "product-7" ou "presentation-4"
    const selectorExact = `.feed-item[data-id="${initialTarget.type}-${initialTarget.id}"]`;
    let targetEl = document.querySelector(selectorExact);

    // Si pas trouvé (type différent, données bizarres...), on fait un fallback sur l'id seul
    if (!targetEl) {
      const selectorById = `.feed-item[data-id$="-${initialTarget.id}"]`;
      targetEl = document.querySelector(selectorById);
    }

    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200); // petit délai pour laisser React finir le rendu
    }
  }, [initialTarget, products.length]);

    useEffect(() => {
    // Tant que ça charge, on ne tente pas de scroller
    if (loading) return;
    if (!initialTarget || !products.length) return;

    // On cible d'abord exactement type-id, ex: "product-7" ou "presentation-4"
    const selectorExact = `.feed-item[data-id="${initialTarget.type}-${initialTarget.id}"]`;
    let targetEl = document.querySelector(selectorExact);

    // Si pas trouvé (type différent, données bizarres...), on fait un fallback sur l'id seul
    if (!targetEl) {
      const selectorById = `.feed-item[data-id$="-${initialTarget.id}"]`;
      targetEl = document.querySelector(selectorById);
    }

    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200); // petit délai pour laisser React finir le rendu
    }
  }, [initialTarget, products.length, loading]);

  
  // Enregistre une vue produit – silencieusement, sans refetch du feed entier
  const sendView = async (productId, duration) => {
    try {
      await axios.post(`products/${productId}/view/`, {
        product_id: productId,
        duration: duration,
      });
    } catch (_) {
      // échec silencieux – pas critique
    }
  };

  // useEffect(() => {
  //   const observerOptions = { root: null, rootMargin: "0px", threshold: 0.7 };

  //   const observerCallback = (entries) => {
  //     entries.forEach((entry) => {
  //       const video = entry.target;
  //       if (entry.isIntersecting) {
  //         // Pause les autres vidéos
  //         videoRefs.current.forEach((v) => {
  //           if (v !== video && v) v.pause();
  //         });
  //         video.play();
  //       } else {
  //         video.pause();
  //       }
  //     });
  //   };

  //   const observer = new IntersectionObserver(
  //     observerCallback,
  //     observerOptions
  //   );

  //   videoRefs.current.forEach((video) => {
  //     if (video) observer.observe(video);
  //   });

  //   return () => {
  //     videoRefs.current.forEach((video) => {
  //       if (video) observer.unobserve(video);
  //     });
  //   };
  // }, [products]); // ← ou [videos] selon ton tableau utilisé

  // 🟣 1) Observer les vidéos et choisir celle qui est la plus visible
// 🟣 1) Observer les vidéos et choisir celle qui est la plus visible
useEffect(() => {
  const videos = videoRefs.current;
  if (!videos || !videos.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      let bestIndex = null;
      let bestRatio = 0;

      entries.forEach((entry) => {
        const video = entry.target;
        const idx = videos.indexOf(video);
        if (idx === -1) return;

        // on garde la vidéo avec le plus grand ratio
        if (entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          bestIndex = idx;
        }
      });

      // 👉 aucune vidéo suffisamment visible → on désactive tout
      if (bestRatio < 0.4 || bestIndex === null) {
        setActiveVideoIndex(null);
      } else {
        setActiveVideoIndex(bestIndex);
      }
    },
    {
      // on suit finement l'entrée/sortie des vidéos
      threshold: Array.from({ length: 11 }, (_, i) => i / 10), // 0.0 → 1.0
    }
  );

  videos.forEach((v) => v && observer.observe(v));

  return () => {
    observer.disconnect();
  };
}, [products]);

// 🟣 2) Ne laisser jouer qu'UNE vidéo : celle de activeVideoIndex
useEffect(() => {
  const videos = videoRefs.current;

  videos.forEach((video, idx) => {
    if (!video) return;

    if (idx === activeVideoIndex && activeVideoIndex !== null) {
      // cette vidéo est la seule active
      video.muted = false;
      const playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {});
      }
    } else {
      // toutes les autres (ou aucune active) → pause + mute
      video.pause();
      video.muted = true;
    }
  });
}, [activeVideoIndex]);


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


  // ── Character Motion helpers ───────────────────────────────────────────────
  const startFocusMode = (item) => {
    setFocusedItemId(item.id);
    setFocusedItem(item);
    setEnthusiasmLevel(1);
    // Enthousiasme monte de 1 niveau toutes les 8s (max 4)
    enthusiasmIntervalRef.current = setInterval(() => {
      setEnthusiasmLevel((prev) => Math.min(4, prev + 1));
    }, 8000);
  };

  const exitFocusMode = (itemIdOverride) => {
    const wasOnId = String(itemIdOverride ?? focusedItemId ?? '');
    setFocusedItemId(null);
    setFocusedItem(null);
    setEnthusiasmLevel(0);
    if (enthusiasmIntervalRef.current) {
      clearInterval(enthusiasmIntervalRef.current);
      enthusiasmIntervalRef.current = null;
    }
    // Si l'utilisateur est encore sur ce produit (ex : slide d'images),
    // relancer le timer de 5s pour que les personnages reviennent
    if (wasOnId && currentVisibleRef.current === wasOnId) {
      focusTimerRef.current = setTimeout(() => {
        if (currentVisibleRef.current !== wasOnId) return;
        const item = productsRef.current.find(
          (p) => p.type === 'product' && String(p.id) === wasOnId
        );
        if (item) startFocusMode(item);
      }, 5000);
    }
  };

  // Swipe bas = quitter le focused mode
  const focusedSwipe = useSwipeable({ onSwipedDown: exitFocusMode, trackMouse: false });

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

  const handleViewProduct = (product) => {
    window.open(product.url, "_blank");
  };

   // Lien partage pour un PRODUIT : renvoie sur le feed avec ?product=ID
  const handleCopyLink = (product) => {
    const url = `${window.location.origin}/?product=${product.id}`;
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
       if (!userData) {
      setShowLogin(true);
      return;
    }
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

    // Lien partage pour une PRÉSENTATION : renvoie sur le feed avec ?presentation=ID
  const copyLink = (id) => {
    const link = `${window.location.origin}/?presentation=${id}`;
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
    // Affiche d'abord avec les données disponibles (comments_count)
    setSelectedPresentation({ ...presentation, comments: presentation.comments || [] });
    // Puis charge les commentaires complets depuis l'API
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
  if (el) {
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

  // fin vidéo
  // ── Skeleton feed (3 cartes placeholder pendant le chargement initial) ──
  if (loading && products.length === 0) {
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
        <div className="feed-container">
          {[0, 1, 2].map(i => (
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
      <InstallButton />

      {/* ── Onboarding catégories (premier lancement, invité) ── */}
      {showOnboarding && (
        <CategoryOnboarding
          onComplete={(cats) => {
            setGuestCats(cats);
            setShowOnboarding(false);
            // Relancer le feed avec les nouvelles catégories
            if (cats.length > 0) {
              setProducts([]);
              setLoading(true);
              fetchProducts(1, false);
            }
          }}
        />
      )}

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
          <Link to="/search" className="tab-pill">Explorer</Link>
        </div>
        <div className="top-bar-right">
          <Link to="/search" className="top-icon-btn">
            <i className="fas fa-search" />
          </Link>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="feed-container">
        {products.map((item, index) => (
          <div
            ref={(el) => { feedItemRefs.current[index] = el; }}
            className="feed-item"
            data-id={`${item.type}-${item.id}`}
            data-char-id={item.type === "product" ? String(item.id) : undefined}
            key={`${item.type}-${item.id}`}
          >
            {item.type === "product" ? (
              /* ── Carte produit ── */
              <>
                <ProductSlider item={item} />
                <div className="feed-gradient-top" />
                <div className="feed-gradient" />

                {/* Info bas-gauche */}
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

                  {/* Badge "Nouveau" — produits de moins de 48h */}
                  {item.date && (Date.now() - new Date(item.date).getTime()) < 48 * 3600 * 1000 && (
                    <span className="feed-new-badge">✦ Nouveau</span>
                  )}

                  <h2>{item.title}</h2>
                  <p>{item.description}</p>

                  {/* Prix + badge réduction */}
                  <div className="price-row">
                    {item.old_price && Number(item.old_price) > Number(item.price) && (
                      <>
                        <span className="price-old">
                          {Math.round(Number(item.old_price)).toLocaleString("fr-FR")} frs
                        </span>
                        <span className="feed-discount-badge">
                          -{Math.round((1 - Number(item.price) / Number(item.old_price)) * 100)}%
                        </span>
                      </>
                    )}
                    <span className="price-current">
                      {Math.round(Number(item.price)).toLocaleString("fr-FR")} frs
                    </span>
                  </div>

                  {/* CTA Acheter */}
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

                {/* Boutons d’action – droite (épurés) */}
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
                  src={item.video}
                  className="feed-image"
                  loop
                  playsInline
                  muted
                  preload="none"
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
                    <span>{item.comments_count ?? item.comments?.length ?? 0}</span>
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
        ))}
      </div>

      <BottomBar />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />

      {/* ── Focused Mode Overlay (Character Motion) ── */}
      {focusedItemId && focusedItem && (
        <div
          className="cm-focused-overlay"
          {...focusedSwipe}
        >
          {/* Hint "touche pour quitter" — disparaît après 3.5s */}
          <div className="cm-tap-hint">
            <i className="fas fa-hand-point-up" /> Touche l'image pour quitter
          </div>

          {/* Images du produit — tap pour fermer */}
          <div className="cm-product-images" onClick={exitFocusMode}>
            <ProductSlider item={focusedItem} />
          </div>

          {/* Personnages animés — droite */}
          <div className="cm-characters">
            <BagCharacter
              emotionLevel={enthusiasmLevel}
              onClick={(e) => {
                e.stopPropagation();
                exitFocusMode();
                handleOrderClick(focusedItem);
              }}
            />
            <HeartCharacter
              emotionLevel={enthusiasmLevel}
              onClick={(e) => {
                e.stopPropagation();
                addToWishList(focusedItem.id);
                exitFocusMode();
              }}
            />
          </div>

          {/* Boutons d'action en bas */}
          <div className="cm-bottom-actions">
            <button
              className="cm-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                exitFocusMode(focusedItem.id);
                handleReviewIconClick(focusedItem);
              }}
            >
              <i className="fas fa-star" /> Laisser un avis
            </button>
            <button
              className="cm-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(focusedItem);
                exitFocusMode(focusedItem.id);
              }}
            >
              <i className="fas fa-link" /> Partager
            </button>
          </div>
        </div>
      )}

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
                placeholder={userData ? "Votre commentaire…" : "Connectez-vous pour commenter"}
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                disabled={!userData}
                style={{
                  flex: 1, padding: "10px 14px", fontSize: 13, borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "#f0f0f0", outline: "none",
                  opacity: userData ? 1 : 0.5,
                }}
              />
              <button
                onClick={(e) => {
                  if (!userData) { setShowLogin(true); return; }
                  commentValue.trim() && handleComment(e, selectedPresentation.id, commentValue);
                }}
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

export default TikTokFeed;
