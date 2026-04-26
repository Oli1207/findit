import { create } from 'zustand';
import axios from '../utils/axios';
import Swal from 'sweetalert2';
import { mountStoreDevtool } from 'simple-zustand-devtools';

export const useFollowStore = create((set, get) => ({
  followStates: {},

  /**
   * Charge les états d'abonnement pour une liste de vendeurs en UNE SEULE requête.
   * Remplace la boucle N×GET par un POST batch → O(1) requête.
   */
  fetchFollowStates: async (vendorIds, userId) => {
    if (!vendorIds?.length) return;

    const unique = [...new Set(vendorIds.filter(Boolean))];
    if (!unique.length) return;

    try {
      // POST /vendors/is-following/ → { "1": true, "2": false, ... }
      const res = await axios.post('vendors/is-following/', { vendor_ids: unique });
      set((state) => ({
        followStates: { ...state.followStates, ...res.data },
      }));
    } catch (error) {
      // Échec silencieux – les boutons afficheront "Suivre" par défaut
      console.error('Erreur fetch follow states:', error);
    }
  },

  /**
   * Toggle follow / unfollow avec mise à jour optimiste.
   * - L'UI répond immédiatement (pas d'attente réseau)
   * - Rollback + toast Swal en cas d'erreur
   */
  toggleFollow: async (userId, vendorId) => {
    if (!userId || !vendorId) return;

    const currentState = get().followStates;
    const wasFollowing  = currentState[vendorId] ?? false;

    // ── Mise à jour optimiste ─────────────────────────────────────────────
    set((state) => ({
      followStates: { ...state.followStates, [vendorId]: !wasFollowing },
    }));

    try {
      const res = await axios.post(`toggle-follow/${vendorId}/`);

      if (res.data.success) {
        set((state) => ({
          followStates: { ...state.followStates, [vendorId]: res.data.following },
        }));
        return res.data; // { success, following, followers_count }
      } else {
        set((state) => ({
          followStates: { ...state.followStates, [vendorId]: wasFollowing },
        }));
        return { success: false };
      }
    } catch (error) {
      set((state) => ({
        followStates: { ...state.followStates, [vendorId]: wasFollowing },
      }));

      const isUnauth = error?.response?.status === 401 || error?.response?.status === 403;
      Swal.fire({
        icon: 'error',
        title: isUnauth ? 'Connexion requise' : 'Erreur',
        text: isUnauth
          ? 'Connecte-toi pour suivre ce vendeur.'
          : "Impossible de modifier l'abonnement. Réessaie.",
        timer: 2500,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff',
      });
      return { success: false };
    }
  },
}));

if (import.meta.env.DEV) {
  mountStoreDevtool('FollowStore', useFollowStore);
}
