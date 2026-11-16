import { useState } from 'react';
import { TYPE_LABEL } from '../lib/blocks.js';
import { moveZ, reorderTo, sortedByZ, updateBlock } from '../lib/layoutOps.js';

function layerLabel(b) {
  if (b.name) return b.name;
  if (b.type === 'text') return (b.props.content || '').split('\n')[0].slice(0, 28) || 'Teks';
  if (b.type === 'project') return b.props.title || 'Kartu proyek';
  return TYPE_LABEL[b.type];
}

const ICON = { text: 'T', image: '▣', shape: '◆', project: '▤', button: '◉', terminal: '>_' };

export default function LayerPanel({ layout, selectedId, onSelect, apply, mode }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const topFirst = sortedByZ(layout.blocks).reverse();
  const selected = layout.blocks.find((b) => b.id === selectedId) || null;
  const locked = (b) => mode === 'remix' && b.lockRemix;
  const canMove = selected && !locked(selected);
  const move = (dir) => apply((l) => moveZ(l, selectedId, dir));

  return (
    <div className="layers">
      <div className="layer-tools">
        <button type="button" disabled={!canMove} onClick={() => move('front')} title="Pindah ke paling depan">
          ⇈ Depan
        </button>
        <button type="button" disabled={!canMove} onClick={() => move('up')} title="Naik satu layer">
          ↑
        </button>
        <button type="button" disabled={!canMove} onClick={() => move('down')} title="Turun satu layer">
          ↓
        </button>
        <button type="button" disabled={!canMove} onClick={() => move('back')} title="Pindah ke paling belakang">
          ⇊ Belakang
        </button>
      </div>

      {topFirst.length === 0 && <p className="hint">Belum ada blok. Tambahkan dari panel kiri.</p>}

      <ul>
        {topFirst.map((b) => (
          <li
            key={b.id}
            className={[
              'layer',
              b.id === selectedId ? 'selected' : '',
              b.id === overId && dragId && b.id !== dragId ? 'drop-target' : '',
              b.visible === false ? 'is-hidden' : '',
            ].join(' ')}
            draggable={!locked(b)}
            onClick={() => onSelect(b.id)}
            onDragStart={(e) => {
              setDragId(b.id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', b.id);
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverId(b.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== b.id) apply((l) => reorderTo(l, dragId, b.id));
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            <span className="layer-icon">{ICON[b.type]}</span>
            <span className="layer-name">
              {locked(b) && '🔒 '}
              {layerLabel(b)}
            </span>
            <button
              type="button"
              className="layer-btn"
              title={b.visible === false ? 'Tampilkan' : 'Sembunyikan'}
              disabled={locked(b)}
              onClick={(e) => {
                e.stopPropagation();
                apply((l) => updateBlock(l, b.id, { visible: b.visible === false }));
              }}
            >
              {b.visible === false ? '🚫' : '👁'}
            </button>
            <button
              type="button"
              className="layer-btn"
              title={b.locked ? 'Buka kunci' : 'Kunci posisi'}
              disabled={locked(b)}
              onClick={(e) => {
                e.stopPropagation();
                apply((l) => updateBlock(l, b.id, { locked: !b.locked }));
              }}
            >
              {b.locked ? '🔐' : '🔓'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
