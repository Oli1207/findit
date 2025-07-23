// src/components/ReviewOffline.js

import apiInstance from '../../utils/axios';

const REVIEW_STORAGE_KEY = 'pending_reviews';

export async function syncReviewsIfOnline() {
  const pending = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY)) || [];
  const successfullySent = [];

  for (const review of pending) {
    try {
      const formData = new FormData();
      Object.entries(review).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await apiInstance.post(`reviews/${review.product_id}/`, formData);
      successfullySent.push(review);
    } catch (error) {
      console.error("Erreur sync review:", error);
    }
  }

  const stillPending = pending.filter(r => !successfullySent.includes(r));
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(stillPending));
}
