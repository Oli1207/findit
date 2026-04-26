// src/utils/axios.js
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { BASE_URL } from './constants';

const apiInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 1000000,
  headers: {
    Accept: 'application/json',
  },
});

function isTokenExpired(token) {
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// Endpoints GET publics (pas d’auth requise)
const PUBLIC_GET = [
  // AUTH PUBLIC
  /^user\/token\/?$/i,
  /^user\/token\/refresh\/?$/i,
  /^user\/register\/?$/i,

  // CATEGORY
  /^category\/?$/i,
  /^category\/\d+\/?$/i,

  // PRODUCTS
  /^products\/?$/i,
  /^products-soldes\/?$/i,
  /^products\/[^\/]+\/?$/i, // slug ex: shoes-nike

  // PRESENTATIONS
  /^presentations\/?$/i,
  /^popular-products\/?$/i,

  // VENDOR PUBLIC DATA
  /^vendor-content\/\d+\/?$/i,
  /^vendor-presentations\/\d+\/?$/i,
  /^vendor-products\/\d+\/?$/i,

  // REVIEWS PUBLIC
  /^reviews\/\d+\/?$/i,

  // SEARCH
  /^image-search\/?$/i,
  /^search_by_text\/?$/i,
  /^search_by_image\/?$/i,
  /^search\/?$/i,

  // SHOPS
  /^shop\/[^\/]+\/?$/i,
  /^vendor\/products\/[^\/]+\/?$/i,
  /^vendor\/products\/\d+\/?$/i,
];


// -------- Request interceptor --------
apiInstance.interceptors.request.use((config) => {
  // Assure un Content-Type correct si non précisé
  if (config.data instanceof FormData) {
    if (config.headers && config.headers['Content-Type']) {
      delete config.headers['Content-Type'];
    }
  } else if (!config.headers['Content-Type']) {
    // fallback raisonnable
    config.headers['Content-Type'] = (config.method || 'get').toLowerCase() === 'post'
      ? 'multipart/form-data'
      : 'application/json';
  }

  const token = Cookies.get('access_token');
  const url = (config.url || '').replace(/^\//, '');
  const method = (config.method || 'get').toLowerCase();
  const isPublicGet = method === 'get' && PUBLIC_GET.some((p) => p.test(url));

  if (!token) {
    // pas de token -> requête publique
    if (isPublicGet && config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const expired = isTokenExpired(token);
  if (!expired) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (isPublicGet && config.headers?.Authorization) {
    // ne JAMAIS envoyer un token expiré sur un endpoint public
    delete config.headers.Authorization;
  }

  return config;
});

// -------- Refresh (single-flight) + retry --------
let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = Cookies.get('refresh_token');
  if (!refresh) throw new Error('No refresh token');
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}user/token/refresh/`, { refresh })
      .then(({ data }) => {
        const access = data?.access;
        if (!access) throw new Error('No access in refresh response');
        Cookies.set('access_token', access, { expires: 1, secure: false });
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error || {};
    if (!response) return Promise.reject(error);

    // Si 401, on tente un refresh UNE seule fois, puis on rejoue la requête
    if (response.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${newAccess}` };
        return apiInstance(config);
      } catch (e) {
        // Refresh KO -> on purge les cookies pour éviter des boucles 401
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
      }
    }

    return Promise.reject(error);
  }
);

export default apiInstance;
