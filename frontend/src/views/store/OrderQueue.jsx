// src/utils/orderQueue.js
import apiInstance from "../../utils/axios";

const ORDER_STORAGE_KEY = 'pending_orders';

export function saveOrderOffline(orderData) {
  const existing = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY)) || [];
  existing.push({ id: Date.now(), data: orderData });
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(existing));
}

export async function syncOrdersIfOnline() {
  const pendingOrders = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY)) || [];
  const successfullySent = [];
  const stillPending = [];

  for (const order of pendingOrders) {
    try {
      // 🧠 Vérifie stock avant d'envoyer
      const res = await apiInstance.get(`products/${order.data.product_id}/`);
      const product = res.data;

      if (product.stock_qty >= order.data.qty) {
        const formData = new FormData();
        Object.entries(order.data).forEach(([key, value]) => {
          formData.append(key, value);
        });

        await apiInstance.post('create-order/', formData);
        successfullySent.push(order.id);

        // Optionnel : feedback visuel
        alert(`Commande synchronisée pour ${product.title}`);
      } else {
        // ❌ Stock insuffisant : commande ignorée
        alert(`❌ Le produit "${product.title}" est épuisé ou stock insuffisant.`);
        stillPending.push(order); // on peut décider de le garder ou pas
      }
    } catch (err) {
      console.error(`Échec de la synchronisation de la commande ${order.id}`, err);
      stillPending.push(order);
    }
  }

  const newQueue = stillPending.filter(o => !successfullySent.includes(o.id));
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(newQueue));
}
