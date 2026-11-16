import BlockContent from './BlockContent.jsx';
import { blockProps } from '../lib/blocks.js';
import { sortedByZ, updateBlock } from '../lib/layoutOps.js';

// hx/hy: arah handle (-1, 0, 1) terhadap sumbu lokal blok.
const HANDLES = [
  { id: 'nw', hx: -1, hy: -1, cursor: 'nwse-resize' },
  { id: 'n', hx: 0, hy: -1, cursor: 'ns-resize' },
  { id: 'ne', hx: 1, hy: -1, cursor: 'nesw-resize' },
  { id: 'e', hx: 1, hy: 0, cursor: 'ew-resize' },
  { id: 'se', hx: 1, hy: 1, cursor: 'nwse-resize' },
  { id: 's', hx: 0, hy: 1, cursor: 'ns-resize' },
  { id: 'sw', hx: -1, hy: 1, cursor: 'nesw-resize' },
  { id: 'w', hx: -1, hy: 0, cursor: 'ew-resize' },
];

const GRID = 10;
const snapTo = (v) => Math.round(v / GRID) * GRID;

export default function Canvas({ layout, assetsById, selectedId, onSelect, apply, scale, snap, mode, stageRef, animOn = false }) {
  const { canvas } = layout;
  const blocks = sortedByZ(layout.blocks);
  const selected = layout.blocks.find((b) => b.id === selectedId) || null;
  const canEdit = (b) => !!b && b.visible !== false && !b.locked && !(mode === 'remix' && b.lockRemix);

  function startGesture(e, block, kind, handle) {
    e.preventDefault();
    const key = `gesture-${Date.now()}`;
    const start = {
      px: e.clientX,
      py: e.clientY,
      x: block.x,
      y: block.y,
      w: block.width,
      h: block.height,
      rot: block.rotation || 0,
    };

    const onMove = (ev) => {
      const dx = (ev.clientX - start.px) / scale;
      const dy = (ev.clientY - start.py) / scale;

      if (kind === 'move') {
        let x = start.x + dx;
        let y = start.y + dy;
        if (snap) {
          x = snapTo(x);
          y = snapTo(y);
        }
        apply((l) => updateBlock(l, block.id, { x: Math.round(x), y: Math.round(y) }), { key, ttl: 60000 });
        return;
      }

      // Resize: ubah delta pointer ke sumbu lokal blok (berlawanan rotasi), lalu geser pusat
      // supaya sisi yang berlawanan dengan handle tetap diam.
      const theta = (start.rot * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const ldx = dx * cos + dy * sin;
      const ldy = -dx * sin + dy * cos;

      let w = Math.max(20, start.w + handle.hx * ldx);
      let h = Math.max(20, start.h + handle.hy * ldy);
      if (snap && !start.rot) {
        w = Math.max(20, snapTo(w));
        h = Math.max(20, snapTo(h));
      }
      const dw = w - start.w;
      const dh = h - start.h;
      const lx = (handle.hx * dw) / 2;
      const ly = (handle.hy * dh) / 2;
      const cx = start.x + start.w / 2 + lx * cos - ly * sin;
      const cy = start.y + start.h / 2 + lx * sin + ly * cos;

      apply(
        (l) =>
          updateBlock(l, block.id, {
            width: Math.round(w),
            height: Math.round(h),
            x: Math.round(cx - w / 2),
            y: Math.round(cy - h / 2),
          }),
        { key, ttl: 60000 }
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function onBlockDown(e, block) {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(block.id);
    if (canEdit(block)) startGesture(e, block, 'move');
  }

  const hiddenStyle = { opacity: 0.12, pointerEvents: 'none' };

  return (
    <div style={{ width: canvas.width * scale, height: canvas.height * scale, margin: '0 auto' }}>
      <div
        ref={stageRef}
        className={`stage editing${animOn ? ' anim-on' : ''}`}
        style={{
          width: canvas.width,
          height: canvas.height,
          background: canvas.background,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
      >
        {blocks.map((b) => {
          const hidden = b.visible === false;
          return (
            <div
              key={b.id}
              data-hidden={hidden ? '1' : undefined}
              {...blockProps(b)}
              style={{
                ...blockStyle(b),
                cursor: canEdit(b) ? 'move' : 'default',
                ...(hidden ? hiddenStyle : null),
              }}
              onPointerDown={(e) => onBlockDown(e, b)}
            >
              <div className="anim">
                <BlockContent block={b} assetsById={assetsById} interactive={false} />
              </div>
            </div>
          );
        })}

        {selected && selected.visible !== false && (
          <div
            className={`selection${canEdit(selected) ? '' : ' locked'}`}
            data-ui="1"
            style={{
              left: selected.x,
              top: selected.y,
              width: selected.width,
              height: selected.height,
              transform: selected.rotation ? `rotate(${selected.rotation}deg)` : undefined,
              outlineWidth: 1.5 / scale,
            }}
          >
            {canEdit(selected) &&
              HANDLES.map((h) => (
                <div
                  key={h.id}
                  className="handle"
                  style={{
                    left: `${(h.hx + 1) * 50}%`,
                    top: `${(h.hy + 1) * 50}%`,
                    width: 11 / scale,
                    height: 11 / scale,
                    borderWidth: 1.5 / scale,
                    cursor: h.cursor,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startGesture(e, selected, 'resize', h);
                  }}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
