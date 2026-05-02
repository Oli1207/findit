import { BASE_URL } from './constants';
import Cookies from 'js-cookie';

export async function subscribeUserToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: "BKLIarmloT9mLrNRftuwdF58E9NehmhCKVmOm3Fb-UZBByOryPy4pjLuJ4oBSdMhohNNeBC2j2fyAPDAthDNcYc",
    });

    // Utilise BASE_URL (résolu via .env.production en build) pour éviter
    // tout Mixed Content en production
    const access = Cookies.get('access_token') || localStorage.getItem('access');

    const res = await fetch(`${BASE_URL}save-subscription/`, {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "Content-Type": "application/json",
        ...(access ? { "Authorization": `Bearer ${access}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Push subscription enregistrée", data);
    }
  } catch (err) {
    // Silencieux — les push ne sont pas critiques
    console.warn("Push subscription échouée (non bloquant):", err.message);
  }
}


//Private Key:KRXTHGjfSv7r1gYfyvyGyu8IqqJTeeDlttY00TrBFbs
