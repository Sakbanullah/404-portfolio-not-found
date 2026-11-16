import { config } from './config.js';

const ALLOW_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOW_HEADERS = 'Content-Type, Authorization';

// Preflight dibalas di sini, sebelum rate limiter, supaya editing admin tidak
// menghabiskan kuota. Origin asing: tanpa header ACAO (bukan ditolak 403).
export function cors(req, res, next) {
  const origin = req.headers.origin;
  const allowed = origin && config.corsOrigins.includes(origin);
  res.setHeader('Vary', 'Origin');
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  if (req.method === 'OPTIONS') {
    // Preflight hanya untuk path yang dikenal; path lain diperlakukan sebagai 404 biasa.
    const known = req.path === '/' || req.path === '/uploads' || req.path.startsWith('/api/');
    if (!known) return next();
    if (allowed) {
      res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
      res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
      res.setHeader('Access-Control-Max-Age', '600');
    }
    return res.status(204).end();
  }
  next();
}
