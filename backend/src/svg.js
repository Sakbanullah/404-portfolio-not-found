// Sanitasi SVG saat upload. SVG di sini hanya ilustrasi statis: script, handler on*,
// isi aktif (foreignObject, <iframe>, <use href> ke luar) dan referensi eksternal
// (http/https di atribut href/src atau di CSS) ditolak, bukan dibersihkan diam-diam.

const MAX_SVG_BYTES = 1024 * 1024;
const FORBIDDEN = [
  [/<\s*script[\s>]/i, 'script'],
  [/<\s*(iframe|object|embed|foreignObject|animate|set|handler)[\s>]/i, 'elemen aktif'],
  [/<!DOCTYPE|<!ENTITY/i, 'DTD/entity'],
  [/\son[a-z]+\s*=/i, 'event handler'],
  [/javascript:/i, 'javascript: URL'],
  [/(href|src|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|data:)/i, 'referensi eksternal'],
  [/(?:@import|url\s*\(\s*["']?\s*(?:https?:|\/\/))/i, 'CSS eksternal'],
  [/<\?xml-stylesheet/i, 'xml-stylesheet'],
];

export function svgSafe(buf) {
  if (buf.length > MAX_SVG_BYTES) return { ok: false, reason: 'SVG terlalu besar' };
  const text = buf.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) return { ok: false, reason: 'Bukan SVG' };
  for (const [re, label] of FORBIDDEN) {
    if (re.test(text)) return { ok: false, reason: `SVG berisi ${label} yang tidak diizinkan` };
  }
  return { ok: true };
}
