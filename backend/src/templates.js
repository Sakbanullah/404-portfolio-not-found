// Template awal untuk memulai layout. Setiap template hanya merujuk asset STARTER_ASSETS
// (assetIds = { key: id }) dan WAJIB lolos validateLayout sebelum dipakai (lihat seed.js & index.js).

import { buildDefaultLayout } from './defaultLayout.js';

const block = (id, type, x, y, width, height, props, extra = {}) => ({
  id,
  type,
  x,
  y,
  width,
  height,
  props,
  ...extra,
});

const text = (content, fontSize, overrides = {}) => ({
  content,
  fontSize,
  fontFamily: 'Space Grotesk',
  fontWeight: 600,
  color: '#111111',
  align: 'left',
  lineHeight: 1.15,
  letterSpacing: 0,
  ...overrides,
});

const shape = (fill, overrides = {}) => ({
  shape: 'rect',
  fill,
  fill2: '',
  angle: 135,
  borderColor: '#ffffff',
  borderWidth: 0,
  radius: 24,
  blur: 0,
  ...overrides,
});

const project = (title, description, tags, accent, bg, textColor) => ({
  title,
  description,
  tags,
  url: '',
  accent,
  bg,
  textColor,
});

const button = (label, url, bg, color) => ({ label, url, bg, color, radius: 999, fontSize: 16 });

// Menggabungkan field animasi dengan posisi/layer, supaya template mudah dibaca.
const anim = (animation, animSpeed = 1, animDelay = 0) => ({ animation, animSpeed, animDelay });

const asLayout = (canvas, blocks) => ({
  version: 1,
  canvas,
  blocks: blocks.map((b, i) => ({
    name: '',
    rotation: 0,
    opacity: 1,
    blend: 'normal',
    locked: false,
    visible: true,
    lockRemix: false,
    ...anim('none'),
    ...b,
    zIndex: i + 1,
  })),
});

// ---------------------------------------------------------------- terminal-gelap
// Versi gelap bertema developer. Isinya layout bawaan ditambah beberapa animasi halus.
function buildTerminalGelap(assetIds) {
  const base = buildDefaultLayout(assetIds);
  const tweaks = {
    'hero-title': anim('slide-up', 1, 0.1),
    'hero-sub': anim('slide-up', 1, 0.25),
    'btn-github': anim('fade-in', 1, 0.4),
    'btn-contact': anim('fade-in', 1, 0.5),
    'terminal': anim('slide-up', 1, 0.3),
    'stk-server': anim('float', 1, 0),
    'stk-api': anim('float', 1.3, 0.6),
    'stk-sparkle': anim('pulse', 1.2, 0),
    'orb-green': anim('pulse', 0.6, 0),
    'orb-purple': anim('pulse', 0.5, 1),
    'blob-footer': anim('float', 0.8, 0.5),
    'card-1': anim('fade-in', 1, 0),
    'card-2': anim('fade-in', 1, 0.15),
    'card-3': anim('fade-in', 1, 0.3),
    'footer-note': anim('slide-up', 1, 0),
  };
  return { ...base, blocks: base.blocks.map((b) => ({ ...b, ...(tweaks[b.id] || {}) })) };
}

// ---------------------------------------------------------------- minimalis
// Tipografi besar, putih bersih, ruang kosong luas, satu aksen gelap.
function buildMinimalis(assetIds) {
  const INK = '#111111';
  const MUTED = '#6b6b6b';
  const LINE = '#e4e4e4';

  return asLayout({ width: 1440, height: 1500, background: '#faf9f6' }, [
    // Blok shape tipis sebagai pemisah (bukan asset, jadi tidak butuh assetIds).
    block('rule-top', 'shape', 120, 110, 1200, 2, shape(LINE, { radius: 0, blur: 0 }), { name: 'Garis atas' }),

    block('label', 'text', 120, 140, 600, 30,
      text('PORTOFOLIO · 2026', 13, { fontFamily: 'JetBrains Mono', fontWeight: 500, color: MUTED, letterSpacing: 6 }),
      { name: 'Label', ...anim('fade-in', 1, 0) }),

    block('title', 'text', 120, 190, 1000, 250,
      text('Nama\nKamu.', 120, { fontWeight: 500, lineHeight: 0.95, letterSpacing: -4, color: INK }),
      { name: 'Judul', ...anim('slide-up', 1, 0.1) }),

    block('intro', 'text', 120, 470, 560, 120,
      text('Backend developer. Saya membangun API yang rapi, tahan lama, dan mudah dirawat.', 22, {
        fontFamily: 'Inter', fontWeight: 400, color: MUTED, lineHeight: 1.5,
      }),
      { name: 'Perkenalan', ...anim('fade-in', 1, 0.35) }),

    block('cta', 'button', 120, 610, 200, 56, button('Hubungi aku', 'mailto:halo@example.com', INK, '#faf9f6'),
      { name: 'Tombol kontak', ...anim('fade-in', 1, 0.5) }),

    block('sparkle', 'image', 1180, 200, 120, 120,
      { assetId: assetIds.sparkle, fit: 'contain', radius: 0 }, { name: 'Kilau', ...anim('float', 0.6, 0) }),
    block('ring', 'image', 1020, 420, 220, 220,
      { assetId: assetIds.ring, fit: 'contain', radius: 0 }, { name: 'Cincin', opacity: 0.6, ...anim('spin', 0.4, 0) }),

    block('rule-mid', 'shape', 120, 780, 1200, 2, shape(LINE, { radius: 0, blur: 0 }), { name: 'Garis tengah' }),

    block('works-label', 'text', 120, 820, 600, 30,
      text('01 — PROYEK', 13, { fontFamily: 'JetBrains Mono', fontWeight: 500, color: MUTED, letterSpacing: 6 }),
      { name: 'Label proyek' }),

    block('work-1', 'text', 120, 870, 800, 150,
      text('REST API Toko Online', 48, { fontWeight: 500, letterSpacing: -1 }),
      { name: 'Proyek 1', ...anim('fade-in', 1, 0) }),
    block('work-1-desc', 'text', 120, 1010, 520, 60,
      text('Pesanan, stok, dan pembayaran dengan JWT.', 18, { fontFamily: 'Inter', fontWeight: 400, color: MUTED, lineHeight: 1.5 }),
      { name: 'Deskripsi proyek 1' }),

    block('work-2', 'text', 120, 1110, 800, 150,
      text('Realtime Chat Service', 48, { fontWeight: 500, letterSpacing: -1 }),
      { name: 'Proyek 2', ...anim('fade-in', 1, 0.15) }),
    block('work-2-desc', 'text', 120, 1250, 520, 60,
      text('WebSocket multi-room dengan riwayat pesan.', 18, { fontFamily: 'Inter', fontWeight: 400, color: MUTED, lineHeight: 1.5 }),
      { name: 'Deskripsi proyek 2' }),

    block('rule-bottom', 'shape', 120, 1390, 1200, 2, shape(LINE, { radius: 0, blur: 0 }), { name: 'Garis bawah' }),
    block('footer', 'text', 120, 1410, 900, 40,
      text('halo@example.com · github.com/namakamu', 14, { fontFamily: 'JetBrains Mono', fontWeight: 400, color: MUTED }),
      { name: 'Kontak bawah' }),
  ]);
}

// ---------------------------------------------------------------- playful
// Warna cerah, blob dan stiker bertumpuk, sapuan kuas Caveat.
function buildPlayful(assetIds) {
  const INK = '#2b1a4f';
  const img = (key, extra = {}) => ({ assetId: assetIds[key], fit: 'contain', radius: 0, ...extra });

  return asLayout({ width: 1440, height: 1500, background: '#fff7e6' }, [
    block('blob-yellow', 'image', 940, -160, 640, 640, img('blob-yellow'), { opacity: 0.9, rotation: 15, name: 'Blob kuning', ...anim('float', 0.5, 0) }),
    block('blob-pink', 'image', -180, 260, 520, 520, img('blob-pink'), { opacity: 0.85, rotation: -20, name: 'Blob pink', ...anim('float', 0.7, 0.4) }),
    block('blob-blue', 'image', 1080, 900, 560, 560, img('blob-blue'), { opacity: 0.8, rotation: 30, name: 'Blob biru', ...anim('pulse', 0.4, 0) }),

    block('title', 'text', 150, 190, 820, 300,
      text('Hai, aku Nama Kamu!', 104, { fontFamily: 'Caveat', fontWeight: 700, color: INK, lineHeight: 0.98, letterSpacing: -1 }),
      { name: 'Judul', ...anim('zoom-in', 1, 0) }),
    block('sub', 'text', 150, 490, 560, 90,
      text('Suka bikin web, main warna, dan hal-hal yang bikin senyum.', 24, { fontFamily: 'Inter', fontWeight: 500, color: INK, lineHeight: 1.4 }),
      { name: 'Subjudul', ...anim('slide-up', 1, 0.2) }),

    block('btn-say', 'button', 150, 600, 170, 56, button('Sapa aku', 'mailto:halo@example.com', '#ffd23f', INK),
      { name: 'Tombol sapa', ...anim('fade-in', 1, 0.35) }),
    block('btn-work', 'button', 336, 600, 200, 56, button('Lihat proyek ↓', '#b79cff', INK),
      { name: 'Tombol proyek', ...anim('fade-in', 1, 0.45) }),

    block('heart', 'image', 1200, 100, 140, 140, img('heart'), { rotation: -12, name: 'Hati', ...anim('pulse', 1.4, 0) }),
    block('star', 'image', 860, 520, 110, 110, img('star'), { rotation: 10, name: 'Bintang', ...anim('spin', 1.5, 0) }),
    block('star-2', 'image', 120, 100, 90, 90, img('star'), { rotation: -8, name: 'Bintang kecil', ...anim('wiggle', 1.2, 0.3) }),
    block('zigzag', 'image', 990, 60, 320, 128, img('zigzag'), { name: 'Zigzag', ...anim('wiggle', 0.8, 0) }),
    block('sparkle', 'image', 760, 300, 80, 80, img('sparkle'), { rotation: 20, name: 'Kilau', ...anim('pulse', 1, 0.6) }),

    block('work-label', 'text', 150, 780, 500, 60,
      text('Proyek ~', 56, { fontFamily: 'Caveat', fontWeight: 700, color: INK }),
      { name: 'Label proyek' }),

    block('card-1', 'project', 150, 860, 360, 300,
      project('REST API Toko Online', 'Keranjang, pesanan, dan pembayaran dengan JWT.', ['Node.js', 'SQL'], '#ff6b9a', '#ffffff', INK),
      { name: 'Kartu 1', rotation: -2, ...anim('fade-in', 1, 0) }),
    block('card-2', 'project', 545, 880, 360, 300,
      project('Realtime Chat', 'Chat langsung dengan WebSocket dan Redis.', ['WebSocket', 'Redis'], '#7ad7ff', '#ffffff', INK),
      { name: 'Kartu 2', rotation: 2, ...anim('fade-in', 1, 0.15) }),
    block('card-3', 'project', 940, 860, 360, 300,
      project('Portfolio Canvas', 'Editor kanvas tempat kamu sedang membaca ini.', ['React', 'Express'], '#ffd23f', '#ffffff', INK),
      { name: 'Kartu 3', rotation: -1, ...anim('fade-in', 1, 0.3) }),

    block('footer', 'text', 150, 1240, 900, 90,
      text('Terima kasih sudah mampir! Ada yang mau kamu remix? ⭐', 44, { fontFamily: 'Caveat', fontWeight: 700, color: INK }),
      { name: 'Penutup', ...anim('slide-up', 1, 0) }),
  ]);
}

export const TEMPLATES = [
  {
    id: 'terminal-gelap',
    name: 'Terminal gelap',
    description: 'Gaya developer: latar gelap, terminal hidup, glow hijau & ungu, stiker teknis yang melayang.',
    build: buildTerminalGelap,
  },
  {
    id: 'minimalis',
    name: 'Minimalis',
    description: 'Tipografi tipis yang besar, sedikit warna, dan ruang kosong yang lega.',
    build: buildMinimalis,
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Warna cerah, blob dan stiker bertumpuk, sapuan tulisan tangan Caveat.',
    build: buildPlayful,
  },
];

export const findTemplate = (id) => TEMPLATES.find((t) => t.id === id) || null;
