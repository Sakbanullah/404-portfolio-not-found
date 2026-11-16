// Posisi + animasi wrapper blok, dipisah dari blocks.js supaya editor (Canvas) dan
// halaman publik bisa memakainya tanpa impor melingkar lewat blocks.js.
// CSS hanya menjalankan animasi saat stage punya class "anim-on".
export const ANIMATIONS = ['none', 'float', 'spin', 'pulse', 'wiggle', 'fade-in', 'slide-up', 'zoom-in'];
export const ENTRANCE = ['fade-in', 'slide-up', 'zoom-in'];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Nilai animasi yang hilang/asing (misal blok lama atau localStorage lama) dinormalkan ke default.
export function normalizeAnimation(b) {
  const speed = Number(b.animSpeed);
  const delay = Number(b.animDelay);
  return {
    animation: ANIMATIONS.includes(b.animation) ? b.animation : 'none',
    animSpeed: Number.isFinite(speed) ? clamp(speed, 0.5, 3) : 1,
    animDelay: Number.isFinite(delay) ? clamp(delay, 0, 5) : 0,
  };
}

// Kelas wrapper blok (animasi). Jangan ditaruh di dalam objek style: react-dom mengabaikan
// `className` yang terselip di style, jadi nilainya dipisah dan digabung oleh blockProps().
export function animClass(b) {
  const { animation } = normalizeAnimation(b);
  return animation === 'none' ? undefined : `anim-block anim-${animation}`;
}

// Gaya posisi yang sama dipakai editor dan halaman publik.
export function blockStyle(b) {
  const anim = normalizeAnimation(b);
  return {
    position: 'absolute',
    left: b.x,
    top: b.y,
    width: b.width,
    height: b.height,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    opacity: b.opacity,
    mixBlendMode: b.blend,
    zIndex: b.zIndex,
    '--anim-speed': anim.animSpeed,
    '--anim-delay': `${anim.animDelay}s`,
  };
}

// Atribut wrapper blok siap pakai: {...blockProps(b)} di <div> pembungkus.
export function blockProps(b) {
  return { className: animClass(b), style: blockStyle(b) };
}
