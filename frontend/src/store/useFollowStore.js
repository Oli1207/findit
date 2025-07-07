import { create } from 'zustand';
import axios from '../utils/axios';  // ton instance axios
import { mountStoreDevtool } from 'simple-zustand-devtools';

export const useFollowStore = create((set, get) => ({
  followStates: {},

  // Charger les états abonnements pour une liste de vendors
  fetchFollowStates: async (vendorIds, userId) => {
    const newFollowStates = {};
    for (const vendorId of vendorIds) {
      try {
        const res = await axios.get(`vendors/${vendorId}/is-following/${userId}/`);
        newFollowStates[vendorId] = res.data.following;
      } catch (error) {
        console.error(`Erreur fetch follow state vendor ${vendorId}`, error);
      }
    }
    set({ followStates: { ...get().followStates, ...newFollowStates } });
  },

  // Toggle follow / unfollow pour un vendor
  toggleFollow: async (userId, vendorId) => {
    if (!userId || !vendorId) {
      console.error("User ID or Vendor ID missing");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      const res = await axios.post(`toggle-follow/${vendorId}/`, formData);
      if (res.data.success) {
        set((state) => ({
          followStates: {
            ...state.followStates,
            [vendorId]: res.data.following
          }
        }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }
}));

if (import.meta.env.DEV) {
  mountStoreDevtool('FollowStore', useFollowStore);
}
