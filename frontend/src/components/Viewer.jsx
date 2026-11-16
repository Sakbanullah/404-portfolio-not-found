import { useRef } from 'react';
import BlockContent from './BlockContent.jsx';
import { blockProps } from '../lib/blocks.js';
import { useViewportScale } from '../lib/hooks.js';
import { sortedByZ } from '../lib/layoutOps.js';

// Tampilan baca-saja untuk halaman publik. Kanvas diskalakan mengikuti lebar layar.
// Animasi entrance (fade-in/slide-up/zoom-in) baru dijalankan setelah blok masuk layar.
export default function Viewer({ layout, assetsById }) {
  const { canvas } = layout;
  const stageRef = useRef(null);
  const scale = useViewportScale(canvas.width);
  const blocks = sortedByZ(layout.blocks).filter((b) => b.visible !== false);

  return (
    <div style={{ width: canvas.width * scale, height: canvas.height * scale, margin: '0 auto' }}>
      <div
        ref={stageRef}
        className="stage"
        style={{
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {blocks.map((b) => (
          <div key={b.id} {...blockProps(b)}>
            <div className="anim">
              <BlockContent block={b} assetsById={assetsById} interactive />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
