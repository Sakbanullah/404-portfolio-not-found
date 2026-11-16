import { useEffect, useRef } from 'react';
import BlockContent from './BlockContent.jsx';
import { ENTRANCE, blockProps } from '../lib/blocks.js';
import { useViewportScale } from '../lib/hooks.js';
import { sortedByZ } from '../lib/layoutOps.js';

// Tampilan baca-saja untuk halaman publik. Kanvas diskalakan mengikuti lebar layar.
// Animasi entrance (fade-in/slide-up/zoom-in) baru dijalankan setelah blok masuk layar.
// Blok diberi data-anim-in; class "is-in" dipasang sekali. Blok yang sudah terlihat saat load
// (mis. di atas lipatan) tetap dianimasikan karena observer hanya menambahkan class.
function useRevealOnScreen(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    el.querySelectorAll('[data-anim-in]').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

export default function Viewer({ layout, assetsById }) {
  const { canvas } = layout;
  const stageRef = useRef(null);
  useRevealOnScreen(stageRef);
  const scale = useViewportScale(canvas.width);
  const blocks = sortedByZ(layout.blocks).filter((b) => b.visible !== false);

  return (
    <div style={{ width: canvas.width * scale, height: canvas.height * scale, margin: '0 auto' }}>
      <div
        ref={stageRef}
        className="stage anim-on"
        style={{
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {blocks.map((b) => (
          <div key={b.id} {...blockProps(b)} data-anim-in={ENTRANCE.includes(b.animation) ? '' : undefined}>
            <div className="anim">
              <BlockContent block={b} assetsById={assetsById} interactive />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
