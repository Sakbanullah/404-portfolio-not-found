// Konstanta + helper murni per tipe blok. Posisi/animasi wrapper ada di blockSkin.js.
import { normalizeAnimation } from './blockSkin.js';

export const ANIMATIONS = ['none', 'float', 'spin', 'pulse', 'wiggle', 'fade-in', 'slide-up', 'zoom-in'];
export const ANIM_LABEL = {
  none: 'Tidak ada',
  float: 'Melayang',
  spin: 'Berputar',
  pulse: 'Berdenyut',
  wiggle: 'Bergoyang',
  'fade-in': 'Muncul (fade)',
  'slide-up': 'Naik (slide-up)',
  'zoom-in': 'Membesar (zoom)',
};

export const TYPE_LABEL = {
  text: 'Teks',
  image: 'Gambar',
  shape: 'Bentuk',
  project: 'Kartu proyek',
  button: 'Tombol',
  terminal: 'Terminal',
};

export const uid = () => `b${Math.random().toString(36).slice(2, 10)}`;

// Hanya http, https, dan mailto yang boleh jadi link (mencegah javascript: URL).
// Aturan harus sama dengan backend/src/validate.js: backslash/kontrol ditolak, dan HTML
// berenkode (%3c/%3e) tidak boleh lolos — nilai ini berasal dari server.
export function safeUrl(value) {
  if (!value) return null;
  if (/[\\<>`\s\u0000-\u001f]|%3[ce]/i.test(value)) return null;
  try {
    const parsed = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? value : null;
  } catch {
    return null;
  }
}

export function fontStack(name) {
  switch (name) {
    case 'JetBrains Mono':
      return `"${name}", ui-monospace, monospace`;
    case 'Playfair Display':
      return `"${name}", Georgia, serif`;
    case 'Caveat':
      return `"${name}", cursive`;
    default:
      return `"${name}", system-ui, sans-serif`;
  }
}

// Bentuk yang dikirim ke server: absolut, seperti backend/src/validate.js menyimpannya.
export function normalizeUrl(value) {
  const safe = safeUrl(value);
  if (!safe) return '';
  try {
    return new URL(safe, window.location.origin).href;
  } catch {
    return '';
  }
}

// Tipe blok yang punya props.url (lihat PropsPanel).
const URL_TYPES = new Set(['project', 'button']);
const withSafeUrls = (b) =>
  URL_TYPES.has(b.type) && b.props ? { ...b, props: { ...b.props, url: normalizeUrl(b.props.url) } } : b;

export const FONTS = ['Space Grotesk', 'Inter', 'JetBrains Mono', 'Playfair Display', 'Caveat'];
export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'difference', 'soft-light'];
export const MAX_BLOCKS = 150;

// Didefinisikan di blockSkin.js (dipakai Canvas/Viewer bersama posisi blok).
export { ENTRANCE, blockProps, normalizeAnimation } from './blockSkin.js';

// Harus sama dengan whitelist di server/src/validate.js.
export function normalizeLayout(layout) {
  return {
    ...layout,
    blocks: (layout.blocks || []).map((b) => withSafeUrls({ ...b, ...normalizeAnimation(b) })),
  };
}

const TEMPLATES = {
  text: {
    width: 360,
    height: 100,
    props: {
      content: 'Teks baru',
      fontSize: 32,
      fontFamily: 'Space Grotesk',
      fontWeight: 600,
      color: '#e6edf3',
      align: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
    },
  },
  image: { width: 200, height: 200, props: { assetId: null, fit: 'contain', radius: 0 } },
  shape: {
    width: 240,
    height: 240,
    props: {
      shape: 'rect',
      fill: '#3ddc97',
      fill2: '',
      angle: 135,
      borderColor: '#ffffff',
      borderWidth: 0,
      radius: 24,
      blur: 0,
    },
  },
  project: {
    width: 373,
    height: 290,
    props: {
      title: 'Judul proyek',
      description: 'Ceritakan singkat masalah yang kamu selesaikan dan hasilnya.',
      tags: ['Node.js', 'PostgreSQL'],
      url: '',
      accent: '#3ddc97',
      bg: '#10161d',
      textColor: '#e6edf3',
    },
  },
  button: {
    width: 180,
    height: 52,
    props: { label: 'Tombol', url: '', bg: '#3ddc97', color: '#06120c', radius: 999, fontSize: 16 },
  },
  terminal: {
    width: 440,
    height: 240,
    props: { title: 'bash', lines: '$ whoami\nbackend-dev\n$ _', fontSize: 15, accent: '#3ddc97' },
  },
};

export function createBlock(type, { x = 100, y = 100, props = {}, ...rest } = {}) {
  const t = TEMPLATES[type];
  const block = {
    id: uid(),
    type,
    name: '',
    x,
    y,
    width: t.width,
    height: t.height,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    blend: 'normal',
    locked: false,
    visible: true,
    lockRemix: false,
    animation: 'none',
    animSpeed: 1,
    animDelay: 0,
    ...rest,
    props: { ...t.props, ...props },
  };
  return withSafeUrls(block);
}
