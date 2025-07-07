// src/components/Review.jsx

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import apiInstance from '../../utils/axios';

const Review = ({ product, userData }) => {
    const [reviews, setReviews] = useState([]);
    const [createReview, setCreateReview] = useState({
        user_id: userData?.user_id || 0,
        product_id: product?.id || 0,
        review: "",
        rating: 0,
    });

    // Fetch reviews for the specific product
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

    // Handle changes in the review form
    const handleReviewChange = (event) => {
        const { name, value } = event.target;
        setCreateReview((prev) => ({ ...prev, [name]: value }));
    };

    // Submit the review form data to the server
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("user_id", userData?.user_id);
        formData.append("product_id", product?.id);
        formData.append("rating", createReview.rating);
        formData.append("review", createReview.review);

        try {
            await apiInstance.post(`reviews/${product.id}/`, formData);
            fetchReviewData(); // Refresh reviews after submission
            setCreateReview({ ...createReview, review: "", rating: 0 }); // Reset form
        } catch (error) {
            console.error("Error submitting review:", error);
        }
    };

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
