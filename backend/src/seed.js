import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db, getMeta, setMeta } from './db.js';
import { STARTER_ASSETS } from './starterAssets.js';
import { buildDefaultLayout } from './defaultLayout.js';
import { validateLayout } from './validate.js';


/**
 * Mengisi asset awal dan layout bawaan.
 * - Pertama kali dijalankan: otomatis.
 * - Setelah itu hanya jika force = true (`npm run seed -- --reset`), yang MENIMPA layout draft dan published.
 * Starter asset yang belum ada (mis. baru ditambah di versi berikutnya) tetap ditambahkan
 * meski database sudah pernah di-seed; layout tidak disentuh.
 */
export function ensureSeed({ force = false } = {}) {
  const seeded = !!getMeta('seeded');
  if (seeded && !force) return;

  fs.mkdirSync(config.uploadDir, { recursive: true });

  const findAsset = db.prepare('SELECT id FROM assets WHERE filename = ?');
  const insertAsset = db.prepare(
    'INSERT INTO assets (name, category, filename, mime, in_library) VALUES (?, ?, ?, ?, 1)'
  );

  const ids = {};
  for (const asset of STARTER_ASSETS) {
    const filename = `starter-${asset.key}.svg`;
    fs.writeFileSync(path.join(config.uploadDir, filename), asset.svg);
    let row = findAsset.get(filename);
    if (!row) {
      const info = insertAsset.run(asset.name, asset.category, filename, 'image/svg+xml');
      row = { id: Number(info.lastInsertRowid) };
    }
    ids[asset.key] = row.id;
  }

  if (seeded) return;

  const known = new Set(Object.values(ids));
  const checked = validateLayout(buildDefaultLayout(ids), { assetExists: (id) => known.has(id) });
  if (!checked.ok) throw new Error(`Layout bawaan tidak valid: ${checked.error}`);

  const json = JSON.stringify(checked.layout);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO pages (slug, draft_json, published_json, published_at, updated_at)
     VALUES ('home', ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       draft_json = excluded.draft_json,
       published_json = excluded.published_json,
       published_at = excluded.published_at,
       updated_at = excluded.updated_at`
  ).run(json, json, now, now);

  setMeta('seeded', '1');
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  ensureSeed({ force: process.argv.includes('--reset') });
  console.log('Seed selesai.');
}
