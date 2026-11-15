// Layout bawaan yang muncul saat pertama kali dijalankan.
// Urutan array = urutan layer dari belakang ke depan.

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
  color: '#e6edf3',
  align: 'left',
  lineHeight: 1.2,
  letterSpacing: 0,
  ...overrides,
});

const project = (title, description, tags, accent) => ({
  title,
  description,
  tags,
  url: '',
  accent,
  bg: '#10161d',
  textColor: '#e6edf3',
});

export function buildDefaultLayout(assetIds) {
  const img = (key, extra = {}) => ({ assetId: assetIds[key], fit: 'contain', radius: 0, ...extra });

  const blocks = [
    block('orb-green', 'shape', -220, -240, 720, 720, {
      shape: 'circle', fill: '#3ddc97', fill2: '', angle: 135, borderColor: '#ffffff', borderWidth: 0, radius: 0, blur: 140,
    }, { opacity: 0.35, name: 'Cahaya hijau' }),
    block('orb-purple', 'shape', 900, 60, 640, 640, {
      shape: 'circle', fill: '#a78bfa', fill2: '', angle: 135, borderColor: '#ffffff', borderWidth: 0, radius: 0, blur: 150,
    }, { opacity: 0.3, name: 'Cahaya ungu' }),
    block('bg-grid', 'image', 0, 0, 1440, 900, img('bg-grid', { fit: 'cover' }), { name: 'Latar grid' }),

    block('hero-title', 'text', 120, 150, 820, 230,
      text('Halo, aku\nNama Kamu.', 92, { fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }),
      { name: 'Judul utama' }),
    block('hero-sub', 'text', 120, 400, 600, 110,
      text('Backend developer yang suka membangun API, sistem, dan hal-hal kecil yang unik.', 24, {
        fontFamily: 'Inter', fontWeight: 400, color: '#9aa4b2', lineHeight: 1.5,
      }),
      { name: 'Subjudul' }),
    block('btn-github', 'button', 120, 540, 170, 56,
      { label: 'GitHub ↗', url: 'https://github.com', bg: '#3ddc97', color: '#06120c', radius: 999, fontSize: 16 },
      { name: 'Tombol GitHub' }),
    block('btn-contact', 'button', 306, 540, 190, 56,
      { label: 'Hubungi aku', url: 'mailto:halo@example.com', bg: '#151c25', color: '#e6edf3', radius: 999, fontSize: 16 },
      { name: 'Tombol kontak (terkunci dari remix)', lockRemix: true }),

    block('terminal', 'terminal', 860, 170, 470, 290, {
      title: '~/portfolio — bash',
      lines: '$ whoami\nnama-kamu · backend developer\n$ curl /api/skills\n{ "node": 90, "sql": 80, "docker": 70 }\n$ _',
      fontSize: 15,
      accent: '#3ddc97',
    }, { name: 'Terminal' }),

    block('stk-server', 'image', 770, 96, 96, 96, img('icon-server'), { rotation: -12, name: 'Stiker server' }),
    block('stk-db', 'image', 1290, 420, 110, 110, img('icon-database'), { rotation: 10, name: 'Stiker database' }),
    block('stk-api', 'image', 1330, 100, 84, 84, img('icon-api'), { rotation: 8, name: 'Stiker API' }),
    block('stk-sparkle', 'image', 690, 500, 64, 64, img('sparkle'), { rotation: 0, name: 'Kilau' }),

    block('sec-label', 'text', 120, 740, 500, 30,
      text('// PROYEK PILIHAN', 14, { fontFamily: 'JetBrains Mono', fontWeight: 500, color: '#3ddc97', letterSpacing: 4 }),
      { name: 'Label bagian' }),
    block('sec-title', 'text', 120, 774, 900, 64,
      text('Hal-hal yang pernah kubangun', 40, { fontWeight: 700 }),
      { name: 'Judul bagian' }),

    block('blob-footer', 'image', 1150, 1090, 260, 260, img('blob-pink'), { opacity: 0.5, rotation: 20, name: 'Blob dekorasi' }),

    block('card-1', 'project', 120, 860, 373, 290,
      project('REST API Toko Online', 'Layanan pesanan, stok, dan pembayaran dengan autentikasi JWT dan dokumentasi OpenAPI.', ['Node.js', 'PostgreSQL', 'Docker'], '#3ddc97'),
      { name: 'Kartu proyek 1' }),
    block('card-2', 'project', 533, 860, 373, 290,
      project('Realtime Chat Service', 'Chat multi-room dengan WebSocket, antrean pesan, dan penyimpanan riwayat percakapan.', ['WebSocket', 'Redis', 'Express'], '#22d3ee'),
      { name: 'Kartu proyek 2' }),
    block('card-3', 'project', 946, 860, 373, 290,
      project('Portfolio Canvas', 'Situs ini sendiri: editor kanvas dengan layer, dashboard admin, dan fitur remix untuk pengunjung.', ['React', 'Express', 'SQLite'], '#a78bfa'),
      { name: 'Kartu proyek 3' }),

    block('footer-note', 'text', 120, 1230, 860, 70,
      text('Coba tombol Remix di pojok kanan bawah: geser, tumpuk, dan ubah halaman ini sesukamu.', 30, {
        fontFamily: 'Caveat', fontWeight: 500, color: '#9aa4b2', lineHeight: 1.3,
      }),
      { name: 'Catatan bawah' }),
  ];

  return {
    version: 1,
    canvas: { width: 1440, height: 1400, background: '#0b0f14' },
    blocks: blocks.map((b, i) => ({ ...b, zIndex: i + 1 })),
  };
}
