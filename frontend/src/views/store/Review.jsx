// src/components/Review.jsx
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import apiInstance from '../../utils/axios';
import { syncReviewsIfOnline } from './ReviewOffline';
import { useNavigate } from 'react-router-dom';

const Review = ({ product, userData }) => {
  const [reviews, setReviews] = useState([]);
  const REVIEW_STORAGE_KEY = 'pending_reviews';
    const navigate = useNavigate()
  const [createReview, setCreateReview] = useState({
    user_id: userData?.user_id || 0,
    product_id: product?.id || 0,
    review: "",
    rating: 0,
  });

  const fetchReviewData = async () => {
    if (product?.id) {
      try {
        const res = await apiInstance.get(`reviews/${product.id}/`);
        setReviews(res.data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    }
  };

  useEffect(() => {
    fetchReviewData();
  }, [product]);

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setCreateReview((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (e) => {
    if (!userData) {
      navigate('/login')
      return;
    }
    e.preventDefault();
    const formData = new FormData();
    formData.append("user_id", userData?.user_id);
    formData.append("product_id", product?.id);
    formData.append("rating", createReview.rating);
    formData.append("review", createReview.review);

    try {
      await apiInstance.post(`reviews/${product.id}/`, formData);
      fetchReviewData();
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
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-6">
          <h2>Create a New Review</h2>
          <form onSubmit={handleReviewSubmit}>
            <div className="mb-3">
              <label htmlFor="rating" className="form-label">Rating</label>
              <select
                name="rating"
                value={createReview.rating}
                onChange={handleReviewChange}
                className="form-select"
                id="rating"
              >
                <option value="">Select Rating</option>
                {[1, 2, 3, 4, 5].map((star) => (
                  <option key={star} value={star}>{star} Star</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="reviewText" className="form-label">Review</label>
              <textarea
                className="form-control"
                id="reviewText"
                rows={4}
                placeholder="Write your review"
                name="review"
                value={createReview.review}
                onChange={handleReviewChange}
              />
            </div>
            <button type="submit" className="btn btn-primary">Submit Review</button>
          </form>
        </div>

        <div className="col-md-6">
          <h2>Existing Reviews</h2>
          {reviews.map((r, index) => (
            <div className="card mb-3" key={index}>
              <div className="row border g-0">
                <div className="col-md-3">
                  <img src={r.profile.image} alt="User" className="img-fluid" />
                </div>
                <div className="col-md-9">
                  <div className="card-body">
                    <h5 className="card-title">{r.profile.full_name}</h5>
                    <p className="card-text">{moment(r.date).format("D MMMM, YYYY")}</p>
                    <p className="card-text">{r.review}</p>
                    <div className="card-text">
                      {[...Array(parseInt(r.rating))].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Review;
