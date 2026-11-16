// Satu-satunya tempat alamat backend ditentukan. Frontend dan backend di-deploy terpisah.
// API_BASE === null berarti build production tanpa VITE_API_URL (dilaporkan di main.jsx).
export const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : null;

export function fileUrl(url) {
  if (!url || !API_BASE) return url;
  return url.startsWith('/') ? API_BASE + url : url;
}
