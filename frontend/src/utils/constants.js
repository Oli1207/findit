// LOCAL  → frontend/.env.local  (jamais committé)
// PROD   → fallback hardcodé ci-dessous
export const BASE_URL =
  import.meta.env.VITE_API_URL ?? 'https://backend.findit.deals/api/v1/'

export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? 'https://backend.findit.deals/'
