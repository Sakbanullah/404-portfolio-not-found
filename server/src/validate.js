// Validasi + sanitasi layout. Server TIDAK pernah mempercayai JSON dari klien:
// hanya field yang dikenal yang diteruskan, semua angka dibatasi, warna harus hex,
// URL hanya http/https/mailto, dan gambar hanya boleh merujuk asset yang ada di database.

export const MAX_BLOCKS = 150;

const TYPES = new Set(['text', 'image', 'shape', 'project', 'button', 'terminal']);
const FONTS = ['Space Grotesk', 'Inter', 'JetBrains Mono', 'Playfair Display', 'Caveat'];
const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'difference', 'soft-light'];
const ALIGNS = ['left', 'center', 'right'];
const WEIGHTS = [300, 400, 500, 600, 700, 800];
// Preset animasi (CSS @keyframes di client). Nama lain ditolak, bukan diteruskan sebagai class bebas.
const ANIMATIONS = ['none', 'float', 'spin', 'pulse', 'wiggle', 'fade-in', 'slide-up', 'zoom-in'];
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

class ValidationError extends Error {}
const fail = (message) => {
  throw new ValidationError(message);
};

function num(v, min, max, def, label) {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${label} harus berupa angka`);
  return Math.min(max, Math.max(min, v));
}

function str(v, max, def, label) {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'string') fail(`${label} harus berupa teks`);
  if (v.length > max) fail(`${label} terlalu panjang (maks ${max} karakter)`);
  return v;
}

function color(v, def, label) {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'string' || !HEX6.test(v)) fail(`${label} harus berupa warna hex (#rrggbb)`);
  return v.toLowerCase();
}

function optColor(v, label) {
  if (v === undefined || v === null || v === '') return '';
  return color(v, '', label);
}

function oneOf(v, list, def, label) {
  if (v === undefined || v === null) return def;
  if (!list.includes(v)) fail(`${label} tidak valid`);
  return v;
}

function bool(v, def) {
  return v === undefined || v === null ? def : v === true;
}

function url(v, label) {
  if (v === undefined || v === null || v === '') return '';
  // Backslash diubah browser menjadi "/" (https:\evil.com → https://evil.com), jadi ditolak.
  if (typeof v !== 'string' || v.length > 500 || /[\\\s\u0000-\u001f]/.test(v) || v.includes('\\')) {
    fail(`${label} tidak valid`);
  }
  let parsed;
  try {
    parsed = new URL(v, 'http://placeholder.invalid');
  } catch {
    fail(`${label} tidak valid`);
  }
  if (!SAFE_PROTOCOLS.has(parsed.protocol)) fail(`${label} hanya boleh http, https, atau mailto`);
  // Yang disimpan adalah bentuk terurai, bukan string mentah, supaya HTML tidak bisa menyelinap
  // di query mailto (mis. ?body=<script>…</script>).
  const out = parsed.href;
  if (out.length > 500 || /[<>"`]|%3[ce]/i.test(out)) fail(`${label} tidak valid`);
  return out;
}

const cleanProps = {
  text: (p) => ({
    content: str(p.content, 2000, '', 'Isi teks'),
    fontSize: num(p.fontSize, 8, 300, 32, 'fontSize'),
    fontFamily: oneOf(p.fontFamily, FONTS, 'Space Grotesk', 'fontFamily'),
    fontWeight: oneOf(p.fontWeight, WEIGHTS, 600, 'fontWeight'),
    color: color(p.color, '#e6edf3', 'color'),
    align: oneOf(p.align, ALIGNS, 'left', 'align'),
    lineHeight: num(p.lineHeight, 0.8, 3, 1.2, 'lineHeight'),
    letterSpacing: num(p.letterSpacing, -5, 30, 0, 'letterSpacing'),
  }),

  image: (p, assetExists) => {
    const assetId = p.assetId ?? null;
    if (assetId !== null) {
      if (!Number.isInteger(assetId)) fail('assetId harus berupa bilangan bulat');
      if (!assetExists(assetId)) fail(`Asset #${assetId} tidak ditemukan`);
    }
    return {
      assetId,
      fit: oneOf(p.fit, ['cover', 'contain'], 'contain', 'fit'),
      radius: num(p.radius, 0, 500, 0, 'radius'),
    };
  },

  shape: (p) => ({
    shape: oneOf(p.shape, ['rect', 'circle'], 'rect', 'shape'),
    fill: color(p.fill, '#3ddc97', 'fill'),
    fill2: optColor(p.fill2, 'fill2'),
    angle: num(p.angle, 0, 360, 135, 'angle'),
    borderColor: color(p.borderColor, '#ffffff', 'borderColor'),
    borderWidth: num(p.borderWidth, 0, 40, 0, 'borderWidth'),
    radius: num(p.radius, 0, 500, 24, 'radius'),
    blur: num(p.blur, 0, 200, 0, 'blur'),
  }),

  project: (p) => {
    const rawTags = p.tags ?? [];
    if (!Array.isArray(rawTags) || rawTags.length > 8) fail('tags maksimal 8 item');
    const tags = rawTags
      .map((t) => {
        if (typeof t !== 'string' || t.length > 24) fail('Setiap tag harus teks maks 24 karakter');
        return t.trim();
      })
      .filter(Boolean);
    return {
      title: str(p.title, 80, '', 'title'),
      description: str(p.description, 400, '', 'description'),
      tags,
      url: url(p.url, 'URL proyek'),
      accent: color(p.accent, '#3ddc97', 'accent'),
      bg: color(p.bg, '#10161d', 'bg'),
      textColor: color(p.textColor, '#e6edf3', 'textColor'),
    };
  },

  button: (p) => ({
    label: str(p.label, 60, 'Tombol', 'label'),
    url: url(p.url, 'URL tombol'),
    bg: color(p.bg, '#3ddc97', 'bg'),
    color: color(p.color, '#06120c', 'color'),
    radius: num(p.radius, 0, 999, 999, 'radius'),
    fontSize: num(p.fontSize, 8, 80, 16, 'fontSize'),
  }),

  terminal: (p) => ({
    title: str(p.title, 60, 'bash', 'title'),
    lines: str(p.lines, 3000, '', 'lines'),
    fontSize: num(p.fontSize, 10, 40, 15, 'fontSize'),
    accent: color(p.accent, '#3ddc97', 'accent'),
  }),
};

function cleanBlock(b, assetExists, index) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) fail(`Blok #${index + 1} tidak valid`);
  if (!TYPES.has(b.type)) fail(`Tipe blok #${index + 1} tidak dikenal`);

  const id = str(b.id, 40, '', 'id blok');
  if (!/^[\w-]+$/.test(id)) fail(`id blok #${index + 1} tidak valid`);

  const props = b.props && typeof b.props === 'object' && !Array.isArray(b.props) ? b.props : {};

  return {
    id,
    type: b.type,
    name: str(b.name, 60, '', 'Nama layer'),
    x: Math.round(num(b.x, -3000, 6000, 0, 'x')),
    y: Math.round(num(b.y, -3000, 12000, 0, 'y')),
    width: Math.round(num(b.width, 10, 4000, 100, 'width')),
    height: Math.round(num(b.height, 10, 4000, 100, 'height')),
    rotation: num(b.rotation, -360, 360, 0, 'rotation'),
    zIndex: Math.round(num(b.zIndex, 0, 100000, 0, 'zIndex')),
    opacity: num(b.opacity, 0, 1, 1, 'opacity'),
    blend: oneOf(b.blend, BLENDS, 'normal', 'blend'),
    // Blok lama tanpa field animasi memakai default: tanpa animasi, kecepatan 1, tanpa jeda.
    animation: oneOf(b.animation, ANIMATIONS, 'none', 'animation'),
    animSpeed: Math.round(num(b.animSpeed, 0.5, 3, 1, 'animSpeed') * 100) / 100,
    animDelay: Math.round(num(b.animDelay, 0, 5, 0, 'animDelay') * 100) / 100,
    locked: bool(b.locked, false),
    visible: bool(b.visible, true),
    lockRemix: bool(b.lockRemix, false),
    props: cleanProps[b.type](props, assetExists),
  };
}

function clean(input, assetExists) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Layout tidak valid');
  if (!Array.isArray(input.blocks)) fail('Layout harus memiliki daftar blocks');
  if (input.blocks.length > MAX_BLOCKS) fail(`Maksimal ${MAX_BLOCKS} blok per halaman`);

  const canvasIn = input.canvas && typeof input.canvas === 'object' ? input.canvas : {};
  const canvas = {
    width: Math.round(num(canvasIn.width, 480, 3000, 1440, 'Lebar kanvas')),
    height: Math.round(num(canvasIn.height, 300, 12000, 1400, 'Tinggi kanvas')),
    background: color(canvasIn.background, '#0b0f14', 'Warna latar'),
  };

  const seen = new Set();
  const blocks = input.blocks.map((b, i) => {
    const cleaned = cleanBlock(b, assetExists, i);
    if (seen.has(cleaned.id)) fail(`id blok duplikat: ${cleaned.id}`);
    seen.add(cleaned.id);
    return cleaned;
  });

  // Normalisasi urutan layer menjadi 1..n tanpa celah atau bentrok.
  const order = [...blocks].sort((a, b) => a.zIndex - b.zIndex);
  order.forEach((b, i) => {
    b.zIndex = i + 1;
  });

  return { version: 1, canvas, blocks };
}

// Batas kedalaman struktur JSON (objek/array bersarang) supaya payload tidak menghabiskan stack.
export const MAX_DEPTH = 32;

function tooDeep(value, depth = 0) {
  if (value === null || typeof value !== 'object') return false;
  if (depth >= MAX_DEPTH) return true;
  for (const key of Object.keys(value)) {
    if (tooDeep(value[key], depth + 1)) return true;
  }
  return false;
}

export function validateLayout(input, { assetExists }) {
  try {
    if (tooDeep(input)) return { ok: false, error: `Struktur layout terlalu dalam (maks ${MAX_DEPTH} level)` };
    return { ok: true, layout: clean(input, assetExists) };
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: err.message };
    throw err;
  }
}

export function collectAssetIds(layout) {
  const ids = new Set();
  for (const b of layout.blocks || []) {
    if (b.type === 'image' && Number.isInteger(b.props?.assetId)) ids.add(b.props.assetId);
  }
  return [...ids];
}
