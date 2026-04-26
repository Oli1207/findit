// src/components/Review.jsx
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import apiInstance from '../../utils/axios';
import { syncReviewsIfOnline } from './ReviewOffline';
import { useNavigate } from 'react-router-dom';
import './review.css' // Import de votre CSS

import LoginModal from "../auth/LoginModal";

const Review = ({ product, userData, onReviewStatsChange }) => {
  const [reviews, setReviews] = useState([]); // on garde un tableau par défaut
  const REVIEW_STORAGE_KEY = 'pending_reviews';
  const navigate = useNavigate();
  const [createReview, setCreateReview] = useState({
    user_id: userData?.user_id || 0,
    product_id: product?.id || 0,
    review: "",
    rating: 0,
  });

  const [showLogin, setShowLogin] = useState(false);

const fetchReviewData = async () => {
    if (product?.id) {
      let allReviews = [];
      // Utilisez la fonction récursive pour charger toutes les pages
      const loadPage = async (url) => {
        try {
          // Ajout du timestamp pour contourner le cache à chaque appel
          const sep = url.includes('?') ? '&' : '?';
          const fullUrl = `${url}${sep}t=${new Date().getTime()}`;

          const res = await apiInstance.get(fullUrl);
          const data = res.data;

          let currentPageReviews;
          let nextUrl = null;
          
          if (Array.isArray(data)) {
            // Cas sans pagination (array direct)
            currentPageReviews = data;
          } else if (Array.isArray(data?.results)) {
            // Cas avec pagination (objet avec 'results')
            currentPageReviews = data.results;
            nextUrl = data.next;
          } else {
            currentPageReviews = [];
          }

          allReviews = allReviews.concat(currentPageReviews);

          if (nextUrl) {
            // Si un lien 'next' existe, chargez la page suivante (fonction récursive)
            await loadPage(nextUrl);
          }

        } catch (error) {
          console.error("Error fetching reviews page:", error);
        }
      };

      // 1. Démarrez le chargement de la première page
      const firstPageUrl = `reviews/${product.id}/`;
      await loadPage(firstPageUrl);

      // 2. Mettez à jour le state une fois que tous les avis sont chargés
      setReviews(allReviews);
      console.log('Fetched reviews (Total):', allReviews);
 const total = allReviews.length;
    let avg = 0;

    if (total > 0) {
       const sum = allReviews.reduce(
        (acc, r) => acc + Number(r.rating || 0),
       0
     );
       avg = sum / total;
     }

     if (typeof onReviewStatsChange === "function" && product?.id) {
       onReviewStatsChange(product.id, {
         rating: avg,
         rating_count: total,
       });
     }
    }
  };

  useEffect(() => {
    fetchReviewData();
    // Ligne console.log(fetchReviewData.data) supprimée car incorrecte.
  }, [product]);

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setCreateReview((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (e) => {
   
    e.preventDefault();
     if (!userData) {
      setShowLogin(true);
      return;
    }
    if (createReview.review.trim() === "" || createReview.rating === 0) {
        alert("Veuillez entrer un commentaire et une note.");
        return;
    }

    const formData = new FormData();
    formData.append("user_id", userData?.user_id);
    formData.append("product_id", product?.id);
    formData.append("rating", createReview.rating);
    formData.append("review", createReview.review);

    try {
      await apiInstance.post(`reviews/${product.id}/`, formData);
      await fetchReviewData(); // refresh after successful post
      setCreateReview({ ...createReview, review: "", rating: 0 });
    } catch (error) {
      if (!navigator.onLine) {
        const offlineReviews = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY)) || [];
        offlineReviews.push({
          ...createReview,
          product_id: product?.id,
          date: new Date().toISOString(),
        });
        localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(offlineReviews));
        alert("Review enregistrée hors ligne !");
        setCreateReview({ ...createReview, review: "", rating: 0 });
      } else {
        console.error("Erreur soumission review:", error);
      }
    }
  };

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

  return (
    // Le conteneur principal du composant Review (doit s'adapter au review-panel parent)
    <div className="rv-container"> 
      
      {/* Le conteneur qui défile */}
      <div className="rv-scroll-container"> 
        <div className="rv-list-section">
          <h2>Avis ({reviews.length})</h2>

          {Array.isArray(reviews) && reviews.length > 0 ? (
            reviews.map((r) => (
              // Utilisation des nouvelles classes préfixées
              <div className="rv-item" key={r.id ?? `${r.user?.id ?? 'u'}-${Math.random()}`}>
                <div className="rv-header">
                  {/* Avatar */}
                  <img
                    src={r.profile?.image || '/placeholder-user.png'}
                    className="rv-avatar"
                    alt={r.profile?.full_name || 'User'}
                  />
                  <div className="rv-info">
                    {/* Nom */}
                    <p className="rv-username">{r.profile?.full_name || r.user?.username || 'Utilisateur'}</p>
                    {/* Date */}
                    <p className="rv-date">
                      {moment(r.date || r.created_at).fromNow()} 
                    </p>
                  </div>
                  {/* Étoiles du Rating */}
                  <div className="rv-rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <i 
                        key={i} 
                        className={`fas fa-star ${i < parseInt(r.rating || 0, 10) ? 'filled' : 'empty'}`} 
                      />
                    ))}
                  </div>
                </div>
                {/* Texte de l'avis */}
                <p className="rv-text">{r.review}</p>
              </div>
            ))
          ) : (
            <p className="rv-empty-text">Aucun avis pour l'instant.</p>
          )}
        </div>
      </div> {/* fin rv-scroll-container */}

      {/* Formulaire de soumission fixé en bas */}
      <div className="rv-footer-form">
        <form onSubmit={handleReviewSubmit} className="w-100 d-flex flex-column gap-2">
            {/* Conteneur Étoiles + Zone de Texte */}
            <div className="rv-input-group">
                {/* RATING WIDGET (Étoiles cliquables) */}
                <div className="rv-rating-widget">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <i
                            key={star}
                            className={`fas fa-star rv-star-icon ${star <= createReview.rating ? 'filled' : ''}`}
                            onClick={() => handleReviewChange({ target: { name: 'rating', value: star } })}
                            aria-label={`${star} étoiles`}
                        />
                    ))}
                </div>

                {/* TEXTAREA pour un input plus grand */}
                <textarea
                    className="form-control rv-textarea-input"
                    placeholder="Écrivez votre avis ici (max. 250 caractères)"
                    name="review"
                    value={createReview.review}
                    onChange={handleReviewChange}
                    maxLength={250} // Limitation à 250 caractères
                    rows={3} // 3 lignes par défaut pour la hauteur
                />
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="btn btn-primary rv-submit-btn w-100">
                Envoyer l'avis
            </button>
        </form>
      </div> {/* fin rv-footer-form */}

      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
};

export default Review;