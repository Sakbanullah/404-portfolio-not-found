import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');
const isProd = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Environment variable ${name} wajib diisi di production`);
  console.warn(`[config] ${name} belum diisi, memakai nilai bawaan untuk development (jangan dipakai di production)`);
  return devFallback;
}

// Daftar origin frontend yang boleh memanggil API. Tanpa "*" dan tanpa cookie.
function corsOrigins() {
  const raw = required('CORS_ORIGIN', 'http://localhost:5173');
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const dataDir = path.resolve(serverRoot, process.env.DATA_DIR || 'data');

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  dataDir,
  dbPath: path.join(dataDir, 'portfolio.db'),
  uploadDir: path.join(dataDir, 'uploads'),
  corsOrigins: corsOrigins(),
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: required('ADMIN_PASSWORD', 'admin123'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
};

if (isProd && config.adminPassword.length < 8) {
  throw new Error('ADMIN_PASSWORD minimal 8 karakter');
}
