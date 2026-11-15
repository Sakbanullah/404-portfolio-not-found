// Paket asset awal (SVG buatan sendiri) untuk library remix.
// Semua ilustrasi dibuat dari bentuk geometris sederhana, jadi aman dipakai bebas.

const svg = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>\n`;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Blob organik: titik acak di sekeliling lingkaran, dihaluskan dengan kurva Catmull-Rom.
function blob(seed, fill) {
  const rand = rng(seed);
  const n = 8;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const radius = 60 + rand() * 32;
    pts.push([100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius]);
  }
  const f = (v) => v.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return svg(200, 200, `<path d="${d}Z" fill="${fill}"/>`);
}

function burst(fill) {
  const points = [];
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? 92 : 66;
    points.push(`${(100 + Math.cos(angle) * radius).toFixed(1)},${(100 + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return svg(200, 200, `<polygon points="${points.join(' ')}" fill="${fill}"/>`);
}

function icon(color, inner) {
  return svg(
    100,
    100,
    `<g fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
  );
}

const GREEN = '#3ddc97';
const CYAN = '#22d3ee';
const PURPLE = '#a78bfa';
const AMBER = '#fbbf24';
const PINK = '#f472b6';
const YELLOW = '#fde047';
const BLUE = '#60a5fa';

export const STARTER_ASSETS = [
  // ---- Bentuk & stiker ----
  { key: 'blob-green', name: 'Blob hijau', category: 'shape', svg: blob(7, GREEN) },
  { key: 'blob-purple', name: 'Blob ungu', category: 'shape', svg: blob(21, PURPLE) },
  { key: 'blob-pink', name: 'Blob pink', category: 'shape', svg: blob(42, PINK) },
  { key: 'blob-yellow', name: 'Blob kuning', category: 'shape', svg: blob(77, YELLOW) },
  { key: 'blob-blue', name: 'Blob biru', category: 'shape', svg: blob(91, BLUE) },
  {
    key: 'heart',
    name: 'Hati',
    category: 'shape',
    svg: svg(
      200,
      200,
      `<path d="M100 172 C40 130 22 96 34 70 C46 44 84 40 100 70 C116 40 154 44 166 70 C178 96 160 130 100 172Z" fill="${PINK}"/>`
    ),
  },
  {
    key: 'star',
    name: 'Bintang',
    category: 'shape',
    svg: svg(
      200,
      200,
      `<polygon points="${Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 92 : 40;
        return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`;
      }).join(' ')}" fill="${YELLOW}"/>`
    ),
  },
  {
    key: 'zigzag',
    name: 'Garis zigzag',
    category: 'shape',
    svg: svg(
      200,
      80,
      `<path d="M10 60 L40 20 L70 60 L100 20 L130 60 L160 20 L190 60" fill="none" stroke="${BLUE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`
    ),
  },
  {
    key: 'ring',
    name: 'Cincin',
    category: 'shape',
    svg: svg(200, 200, `<circle cx="100" cy="100" r="82" fill="none" stroke="${CYAN}" stroke-width="14"/>`),
  },
  {
    key: 'squiggle',
    name: 'Garis bergelombang',
    category: 'shape',
    svg: svg(
      200,
      80,
      `<path d="M10 40 Q35 5 60 40 T110 40 T160 40 T190 40" fill="none" stroke="${AMBER}" stroke-width="10" stroke-linecap="round"/>`
    ),
  },
  { key: 'burst', name: 'Bintang ledak', category: 'shape', svg: burst(AMBER) },
  {
    key: 'sparkle',
    name: 'Kilau',
    category: 'shape',
    svg: svg(
      200,
      200,
      `<path d="M100 10 C105 70 130 95 190 100 C130 105 105 130 100 190 C95 130 70 105 10 100 C70 95 95 70 100 10Z" fill="${GREEN}"/>`
    ),
  },
  {
    key: 'orb',
    name: 'Bola cahaya',
    category: 'shape',
    svg: svg(
      200,
      200,
      `<defs><radialGradient id="g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".35" stop-color="${PURPLE}"/><stop offset="1" stop-color="#2b1b6b"/></radialGradient></defs><circle cx="100" cy="100" r="90" fill="url(#g)"/>`
    ),
  },
  {
    key: 'dots',
    name: 'Titik halftone',
    category: 'shape',
    svg: svg(
      200,
      200,
      `<defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="3" fill="#ffffff" fill-opacity=".55"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>`
    ),
  },

  // ---- Latar ----
  {
    key: 'bg-grid',
    name: 'Latar grid',
    category: 'background',
    svg: svg(
      1440,
      900,
      `<defs><pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".07"/></pattern><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b0f14" stop-opacity="1"/></linearGradient></defs><rect width="1440" height="900" fill="url(#g)"/><rect width="1440" height="900" fill="url(#f)"/>`
    ),
  },
  {
    key: 'bg-dots',
    name: 'Latar titik',
    category: 'background',
    svg: svg(
      1440,
      900,
      `<defs><pattern id="d" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#ffffff" fill-opacity=".14"/></pattern></defs><rect width="1440" height="900" fill="url(#d)"/>`
    ),
  },
  {
    key: 'bg-gradient',
    name: 'Latar gradasi',
    category: 'background',
    svg: svg(
      1440,
      900,
      `<defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2a2a"/><stop offset=".55" stop-color="#101a33"/><stop offset="1" stop-color="#2a1245"/></linearGradient></defs><rect width="1440" height="900" fill="url(#l)"/>`
    ),
  },

  // ---- Ikon backend ----
  {
    key: 'icon-server',
    name: 'Ikon server',
    category: 'icon',
    svg: icon(
      GREEN,
      '<rect x="14" y="14" width="72" height="30" rx="7"/><rect x="14" y="56" width="72" height="30" rx="7"/><circle cx="30" cy="29" r="3" fill="#3ddc97"/><circle cx="30" cy="71" r="3" fill="#3ddc97"/><path d="M50 29H70M50 71H70"/>'
    ),
  },
  {
    key: 'icon-database',
    name: 'Ikon database',
    category: 'icon',
    svg: icon(
      CYAN,
      '<ellipse cx="50" cy="24" rx="30" ry="12"/><path d="M20 24V76C20 83 33 88 50 88C67 88 80 83 80 76V24"/><path d="M20 50C20 57 33 62 50 62C67 62 80 57 80 50"/>'
    ),
  },
  {
    key: 'icon-cloud',
    name: 'Ikon cloud',
    category: 'icon',
    svg: icon(PURPLE, '<path d="M28 74H72A18 18 0 0 0 72 38A24 24 0 0 0 26 44A15 15 0 0 0 28 74Z"/>'),
  },
  {
    key: 'icon-lock',
    name: 'Ikon gembok',
    category: 'icon',
    svg: icon(AMBER, '<rect x="22" y="44" width="56" height="42" rx="8"/><path d="M34 44V32A16 16 0 0 1 66 32V44"/><path d="M50 60V70"/>'),
  },
  {
    key: 'icon-api',
    name: 'Ikon API { }',
    category: 'icon',
    svg: icon(
      PINK,
      '<path d="M38 18C26 18 30 38 30 44C30 48 26 50 20 50C26 50 30 52 30 56C30 62 26 82 38 82"/><path d="M62 18C74 18 70 38 70 44C70 48 74 50 80 50C74 50 70 52 70 56C70 62 74 82 62 82"/>'
    ),
  },
  {
    key: 'icon-terminal',
    name: 'Ikon terminal',
    category: 'icon',
    svg: icon(GREEN, '<rect x="10" y="18" width="80" height="64" rx="9"/><path d="M28 40L42 50L28 60"/><path d="M50 62H70"/>'),
  },
  {
    key: 'icon-git',
    name: 'Ikon git',
    category: 'icon',
    svg: icon(
      CYAN,
      '<circle cx="28" cy="24" r="8"/><circle cx="28" cy="76" r="8"/><circle cx="72" cy="40" r="8"/><path d="M28 32V68"/><path d="M72 48C72 64 28 52 28 68"/>'
    ),
  },
  {
    key: 'icon-rocket',
    name: 'Ikon roket',
    category: 'icon',
    svg: icon(
      PURPLE,
      '<path d="M50 10C70 25 72 55 62 72H38C28 55 30 25 50 10Z"/><circle cx="50" cy="40" r="7"/><path d="M38 72L28 88L42 80"/><path d="M62 72L72 88L58 80"/>'
    ),
  },
  {
    key: 'icon-shield',
    name: 'Ikon perisai',
    category: 'icon',
    svg: icon(AMBER, '<path d="M50 10L82 22V48C82 70 68 84 50 92C32 84 18 70 18 48V22Z"/><path d="M36 50L46 60L66 38"/>'),
  },
  {
    key: 'icon-cpu',
    name: 'Ikon CPU',
    category: 'icon',
    svg: icon(
      PINK,
      '<rect x="28" y="28" width="44" height="44" rx="6"/><rect x="40" y="40" width="20" height="20" rx="3"/><path d="M38 14V28M50 14V28M62 14V28M38 72V86M50 72V86M62 72V86M14 38H28M14 50H28M14 62H28M72 38H86M72 50H86M72 62H86"/>'
    ),
  },
];
