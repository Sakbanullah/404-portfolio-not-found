import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);
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
const loginLimiter = limiter(15 * 60 * 1000, 10, 'Terlalu banyak percobaan login, coba lagi 15 menit lagi', {
  skipSuccessfulRequests: true,
});
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

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }
  // Selalu jalankan bcrypt supaya waktu respons tidak membocorkan apakah username benar.
  const passwordOk = await bcrypt.compare(password, adminHash);
  const userOk = username === config.adminUser;
  if (!passwordOk || !userOk) return res.status(401).json({ error: 'Username atau password salah' });

  const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '12h' });
  res.json({ token });
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

function sniffImage(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (buf.length >= 6 && buf.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { ext: 'gif', mime: 'image/gif' };
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  const head = buf.subarray(0, 4096).toString('utf8').trimStart();
  if (head.startsWith('<') && /<svg[\s>]/i.test(head)) return { ext: 'svg', mime: 'image/svg+xml' };
  return null;
}

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
    const kind = sniffImage(req.file.buffer);
    if (!kind) return res.status(400).json({ error: 'Format tidak didukung (PNG, JPG, GIF, WebP, atau SVG)' });

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
// dieksekusi bila dibuka langsung di browser.
app.use(
  '/uploads',
  express.static(config.uploadDir, {
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    },
  })
);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

// Production: sajikan hasil build frontend.
if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
  app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(config.clientDist, 'index.html'));
  });
}

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
