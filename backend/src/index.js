import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { cors } from './cors.js';
import { checkImage } from './files.js';
import { svgSafe } from './svg.js';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { config } from './config.js';
import { db, getMeta } from './db.js';
import { ensureSeed } from './seed.js';
import { TEMPLATES, findTemplate } from './templates.js';
import { collectAssetIds, validateLayout } from './validate.js';

fs.mkdirSync(config.uploadDir, { recursive: true });
ensureSeed();

const app = express();
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(
  helmet({
    // Backend hanya melayani API dan /uploads; tidak ada halaman frontend di sini.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        fontSrc: ["'none'"],
        imgSrc: ["'none'"],
        connectSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);
app.use(cors);
app.use(express.json({ limit: '600kb' }));

// ---------------------------------------------------------------- rate limits
const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
    ...extra,
  });

app.use('/api', limiter(15 * 60 * 1000, 600, 'Terlalu banyak permintaan, coba lagi nanti'));
// Login GAGAL dihitung per IP DAN per username (hitungan di handler, bukan middleware,
// agar dibalas 401 biasa). Keberhasilan tidak dihitung sehingga admin tidak terkunci sendiri.
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX = 10;
const loginAttempts = new Map(); // key -> { count, reset }
const loginKey = (prefix, value) => `${prefix}:${String(value).toLowerCase().slice(0, 80)}`;

function takeAttempt(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.reset) {
    if (loginAttempts.size > 5000) loginAttempts.clear();
    loginAttempts.set(key, { count: 1, reset: now + LOGIN_WINDOW });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX;
}

// Satu key bisa sudah dihitung lalu kena tolak oleh key kedua; serahkan kembali jatahnya
// supaya IP bermasalah tidak menghabiskan kuota username lain.
function refundAttempt(key) {
  const entry = loginAttempts.get(key);
  if (entry && entry.count > 0) entry.count -= 1;
}
const remixLimiter = limiter(60 * 60 * 1000, 30, 'Terlalu banyak permintaan');

// ---------------------------------------------------------------- helpers
const assetUrl = (filename) => `/uploads/${filename}`;
const assetExists = (id) => !!db.prepare('SELECT 1 FROM assets WHERE id = ?').get(id);
const getPageRow = () => db.prepare("SELECT * FROM pages WHERE slug = 'home'").get();

function assetMap(ids) {
  if (!ids.length) return {};
  const rows = db
    .prepare(`SELECT id, name, filename FROM assets WHERE id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
  return Object.fromEntries(rows.map((r) => [r.id, { id: r.id, name: r.name, url: assetUrl(r.filename) }]));
}

const publicAsset = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  url: assetUrl(r.filename),
  inLibrary: !!r.in_library,
});

// ---------------------------------------------------------------- auth
const adminHash = bcrypt.hashSync(config.adminPassword, 10);

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }
  // bcrypt selalu dijalankan supaya waktu respons tidak membocorkan apakah username benar.
  // Login dengan password benar TIDAK dihitung, jadi admin tidak bisa terkunci sendiri.
  const passwordOk = await bcrypt.compare(password, adminHash);
  const userOk = username === config.adminUser;
  if (passwordOk && userOk) {
    loginAttempts.delete(loginKey('user', username));
    const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '2h' });
    return res.json({ token });
  }

  // Hanya percobaan GAGAL yang dihitung: per IP dan per username, dinaikkan sebelum
  // respons sehingga tebakan paralel tidak bisa melewati batas. Dibalas 401 (bukan 429)
  // supaya status tidak membocorkan apakah akun ada.
  const ipKey = loginKey('ip', req.ip);
  const userKey = loginKey('user', username);
  if (!takeAttempt(ipKey)) return res.status(401).json({ error: 'Username atau password salah' });
  if (!takeAttempt(userKey)) {
    refundAttempt(ipKey);
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  return res.status(401).json({ error: 'Username atau password salah' });
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Perlu login' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') throw new Error('bukan admin');
    next();
  } catch {
    res.status(401).json({ error: 'Sesi berakhir, silakan login lagi' });
  }
}

// ---------------------------------------------------------------- public API
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/page', (_req, res) => {
  const row = getPageRow();
  if (!row?.published_json) return res.status(404).json({ error: 'Halaman belum dipublish' });
  const layout = JSON.parse(row.published_json);
  res.json({
    layout,
    assets: assetMap(collectAssetIds(layout)),
    publishedAt: row.published_at,
    remixCount: Number(getMeta('remix_count') || 0),
  });
});

app.get('/api/assets', (_req, res) => {
  const rows = db.prepare('SELECT * FROM assets WHERE in_library = 1 ORDER BY category, id').all();
  res.json(rows.map(publicAsset));
});

app.post('/api/remix', remixLimiter, (_req, res) => {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('remix_count', '1')
     ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1`
  ).run();
  res.json({ remixCount: Number(getMeta('remix_count')) });
});

// ---------------------------------------------------------------- admin API
const admin = express.Router();
admin.use(requireAdmin);

function pageState(row) {
  return {
    layout: JSON.parse(row.draft_json),
    unpublished: row.draft_json !== row.published_json,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

admin.get('/page', (_req, res) => res.json(pageState(getPageRow())));

admin.put('/page', (req, res) => {
  const result = validateLayout(req.body?.layout, { assetExists });
  if (!result.ok) return res.status(400).json({ error: result.error });
  const now = new Date().toISOString();
  db.prepare("UPDATE pages SET draft_json = ?, updated_at = ? WHERE slug = 'home'").run(
    JSON.stringify(result.layout),
    now
  );
  res.json(pageState(getPageRow()));
});

admin.post('/publish', (_req, res) => {
  const row = getPageRow();
  const result = validateLayout(JSON.parse(row.draft_json), { assetExists });
  if (!result.ok) return res.status(400).json({ error: result.error });
  const now = new Date().toISOString();
  const json = JSON.stringify(result.layout);
  db.prepare(
    "UPDATE pages SET draft_json = ?, published_json = ?, published_at = ?, updated_at = ? WHERE slug = 'home'"
  ).run(json, json, now, now);
  res.json(pageState(getPageRow()));
});

// ---- template awal (hanya menimpa draft; versi published aman sampai Publish)
admin.get('/templates', (_req, res) => {
  res.json(TEMPLATES.map(({ id, name, description }) => ({ id, name, description })));
});

admin.post('/templates/:id/apply', (req, res) => {
  const template = findTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template tidak dikenal' });

  const ids = {};
  for (const row of db.prepare('SELECT id, filename FROM assets').all()) {
    const m = /^starter-(.+)\.svg$/.exec(row.filename);
    if (m) ids[m[1]] = row.id;
  }
  // Template boleh merujuk asset starter apa pun; yang belum ada hanya bisa muncul bila seed
  // dijalankan versi lama. Validasi tetap menjadi penjaga terakhir.
  const result = validateLayout(template.build(ids), { assetExists });
  if (!result.ok) return res.status(500).json({ error: `Template tidak valid: ${result.error}` });

  db.prepare("UPDATE pages SET draft_json = ?, updated_at = ? WHERE slug = 'home'").run(
    JSON.stringify(result.layout),
    new Date().toISOString()
  );
  res.json(pageState(getPageRow()));
});

// ---- assets
const ALLOWED_CATEGORIES = ['shape', 'icon', 'background', 'photo', 'misc'];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

admin.get('/assets', (_req, res) => {
  const rows = db.prepare('SELECT * FROM assets ORDER BY category, id').all();
  res.json(rows.map(publicAsset));
});

admin.post(
  '/assets',
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (!err) return next();
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'File terlalu besar (maks 2 MB)' : 'Upload gagal' });
    }),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File wajib diunggah' });

    // Tipe file ditentukan dari isi file, bukan dari nama/mimetype kiriman klien.
    const kind = checkImage(req.file.buffer);
    if (kind.error) return res.status(400).json({ error: kind.error });
    if (kind.ext === 'svg') {
      const safe = svgSafe(req.file.buffer);
      if (!safe.ok) return res.status(400).json({ error: safe.reason });
    }

    const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const fallback = path.parse(req.file.originalname || 'asset').name;
    const name = (rawName || fallback).slice(0, 60) || 'asset';
    const category = ALLOWED_CATEGORIES.includes(req.body.category) ? req.body.category : 'misc';
    const inLibrary = req.body.inLibrary === 'false' || req.body.inLibrary === '0' ? 0 : 1;

    const filename = `${crypto.randomUUID()}.${kind.ext}`;
    fs.writeFileSync(path.join(config.uploadDir, filename), req.file.buffer);
    const info = db
      .prepare('INSERT INTO assets (name, category, filename, mime, in_library) VALUES (?, ?, ?, ?, ?)')
      .run(name, category, filename, kind.mime, inLibrary);
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(publicAsset(row));
  }
);

admin.patch('/assets/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Asset tidak ditemukan' });

  const { name, category, inLibrary } = req.body ?? {};
  const next = {
    name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : row.name,
    category: ALLOWED_CATEGORIES.includes(category) ? category : row.category,
    in_library: typeof inLibrary === 'boolean' ? Number(inLibrary) : row.in_library,
  };
  db.prepare('UPDATE assets SET name = ?, category = ?, in_library = ? WHERE id = ?').run(
    next.name,
    next.category,
    next.in_library,
    id
  );
  res.json(publicAsset(db.prepare('SELECT * FROM assets WHERE id = ?').get(id)));
});

admin.delete('/assets/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Asset tidak ditemukan' });

  const page = getPageRow();
  const used = [page.draft_json, page.published_json]
    .filter(Boolean)
    .some((json) => collectAssetIds(JSON.parse(json)).includes(id));
  if (used) {
    return res.status(409).json({ error: 'Asset masih dipakai di draft atau halaman publik. Lepas dulu dari layout.' });
  }

  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  fs.rmSync(path.join(config.uploadDir, row.filename), { force: true });
  res.json({ ok: true });
});

app.use('/api/admin', admin);

// ---------------------------------------------------------------- files
// Nama file acak, jadi aman di-cache lama. CSP sandbox mencegah SVG berisi script
// dieksekusi bila dibuka langsung di browser. Hanya rute ini yang boleh dibaca
// lintas origin (gambar di frontend + Export PNG html-to-image); header CORS
// dipasang ulang karena express.static hanya mengirim header dari config sendiri.
const uploadHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // SVG starter tidak memakai <style>/style=; upload dibatasi svgSafe() sehingga
  // tidak perlu melonggarkan style-src di sini.
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'none'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Vary', 'Origin');
  const origin = res.req?.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
};
app.use(
  '/uploads',
  express.static(config.uploadDir, {
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders: uploadHeaders,
  })
);
// Respons 304 bisa dibuat dari cache internal tanpa memanggil setHeaders.
app.use('/uploads', (_req, res) => res.status(404).json({ error: 'File tidak ditemukan' }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
app.get('/', (_req, res) => res.json({ ok: true, service: 'portfolio-canvas-api' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON tidak valid' });
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan di server' });
});

app.listen(config.port, () => {
  console.log(`API berjalan di http://localhost:${config.port}`);
});
