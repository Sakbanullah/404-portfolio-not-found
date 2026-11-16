import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Canvas from './Canvas.jsx';
import LayerPanel from './LayerPanel.jsx';
import PropsPanel from './PropsPanel.jsx';
import { ColorField, NumberField } from './ui.jsx';
import { MAX_BLOCKS, createBlock } from '../lib/blocks.js';
import { addBlock, duplicateBlock, moveZ, removeBlock, updateBlock, updateProps } from '../lib/layoutOps.js';

const NO_ASSETS = {};
const ADD_BUTTONS = [
  ['text', 'T', 'Teks'],
  ['shape', '◆', 'Bentuk'],
  ['project', '▤', 'Kartu proyek'],
  ['button', '◉', 'Tombol'],
  ['terminal', '>_', 'Terminal'],
];

/**
 * Editor kanvas yang dipakai dua kali:
 *  - mode="admin": penuh (upload asset, kunci-remix, simpan/publish lewat slot topRight)
 *  - mode="remix": pengunjung, blok bertanda lockRemix tidak bisa diubah
 */
const Editor = forwardRef(function Editor(
  { mode, history, assets, extraAssets = NO_ASSETS, topLeft, topRight, assetPanelExtra, onDeleteAsset },
  ref
) {
  const { layout, apply, undo, redo, canUndo, canRedo } = history;
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('props');
  const [zoom, setZoom] = useState(null);
  const [snap, setSnap] = useState(false);
  // Pratinjau animasi hanya untuk editor; tidak ikut tersimpan. Mode remix animasi langsung menyala.
  const [category, setCategory] = useState('all');
  const [wrapWidth, setWrapWidth] = useState(900);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);

  // Mode remix: animasi dimatikan sementara selama export PNG (transform sedang diambil).
  useImperativeHandle(
    ref,
    () => ({
      getStage: () => stageRef.current,
    }),
    []
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWrapWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fit = Math.min(1, Math.max(0.1, wrapWidth / layout.canvas.width));
  const scale = zoom ?? fit;

  const assetsById = useMemo(() => {
    const map = { ...extraAssets };
    for (const a of assets) map[a.id] = a;
    return map;
  }, [assets, extraAssets]);

  const selected = layout.blocks.find((b) => b.id === selectedId) || null;
  const editable = (b) => !!b && !b.locked && !(mode === 'remix' && b.lockRemix);
  const categories = useMemo(() => ['all', ...new Set(assets.map((a) => a.category))], [assets]);
  const shownAssets = category === 'all' ? assets : assets.filter((a) => a.category === category);

  // ---------------------------------------------------------------- aksi
  function spawnPos() {
    const wrap = wrapRef.current;
    return {
      x: Math.round((wrap ? wrap.scrollLeft : 0) / scale + 80),
      y: Math.round((wrap ? wrap.scrollTop : 0) / scale + 80),
    };
  }

  function insert(block, { toBack = false } = {}) {
    if (layout.blocks.length >= MAX_BLOCKS) {
      window.alert(`Maksimal ${MAX_BLOCKS} blok per halaman.`);
      return;
    }
    apply((l) => {
      const next = addBlock(l, block);
      return toBack ? moveZ(next, block.id, 'back') : next;
    });
    setSelectedId(block.id);
    setTab('props');
  }

  const addType = (type) => insert(createBlock(type, spawnPos()));

  function addImage(asset) {
    if (asset.category === 'background') {
      insert(
        createBlock('image', {
          x: 0,
          y: 0,
          width: layout.canvas.width,
          height: Math.min(900, layout.canvas.height),
          name: asset.name,
          props: { assetId: asset.id, fit: 'cover' },
        }),
        { toBack: true }
      );
    } else {
      insert(createBlock('image', { ...spawnPos(), name: asset.name, props: { assetId: asset.id } }));
    }
  }

  const patch = (id, p, key) => apply((l) => updateBlock(l, id, p), { key: key ? `${id}:${key}` : undefined });
  const patchProps = (id, p, key) => apply((l) => updateProps(l, id, p), { key: key ? `${id}:p:${key}` : undefined });

  function duplicateSelected() {
    if (!selected || !editable(selected)) return;
    if (layout.blocks.length >= MAX_BLOCKS) {
      window.alert(`Maksimal ${MAX_BLOCKS} blok per halaman.`);
      return;
    }
    const { layout: next, newId } = duplicateBlock(layout, selected.id);
    apply(() => next);
    setSelectedId(newId);
  }

  function removeSelected() {
    if (!selected || !editable(selected)) return;
    const id = selected.id;
    apply((l) => removeBlock(l, id));
    setSelectedId(null);
  }

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (!selected) return;

      if (mod && k === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (delta && editable(selected)) {
        e.preventDefault();
        apply(
          (l) => {
            const b = l.blocks.find((x) => x.id === selected.id);
            return b ? updateBlock(l, b.id, { x: b.x + delta[0], y: b.y + delta[1] }) : l;
          },
          { key: `nudge-${selected.id}`, ttl: 600 }
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setCanvas = (p, key) => apply((l) => ({ ...l, canvas: { ...l.canvas, ...p } }), { key: `canvas:${key}` });

  return (
    <div className="editor">
      <header className="topbar">
        <div className="topbar-group">
          {topLeft}
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            ↶
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            ↷
          </button>
          <span className="sep" />
          <button type="button" onClick={() => setZoom(Math.max(0.2, +(scale - 0.1).toFixed(2)))} title="Perkecil">
            −
          </button>
          <span className="zoom">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setZoom(Math.min(2, +(scale + 0.1).toFixed(2)))} title="Perbesar">
            +
          </button>
          <button type="button" className={zoom === null ? 'on' : ''} onClick={() => setZoom(null)}>
            Fit
          </button>
          <label className="check inline">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            <span>Snap</span>
          </label>
        </div>
        <div className="topbar-group">{topRight}</div>
      </header>

      <div className="editor-body">
        <aside className="panel panel-left">
          <section>
            <h4>Tambah blok</h4>
            <div className="add-grid">
              {ADD_BUTTONS.map(([type, icon, label]) => (
                <button key={type} type="button" onClick={() => addType(type)}>
                  <b>{icon}</b>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>{mode === 'remix' ? 'Library asset' : 'Asset'}</h4>
            {assetPanelExtra}
            <div className="chips">
              {categories.map((c) => (
                <button key={c} type="button" className={c === category ? 'on' : ''} onClick={() => setCategory(c)}>
                  {c === 'all' ? 'Semua' : c}
                </button>
              ))}
            </div>
            <div className="assets-grid">
              {shownAssets.map((a) => (
                <div key={a.id} className="asset">
                  <button type="button" onClick={() => addImage(a)} title={`Tambahkan: ${a.name}`}>
                    <img src={a.url} alt={a.name} draggable={false} />
                  </button>
                  {onDeleteAsset && (
                    <button type="button" className="asset-del" title="Hapus asset" onClick={() => onDeleteAsset(a)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              {shownAssets.length === 0 && <p className="hint">Belum ada asset.</p>}
            </div>
          </section>

          <p className="hint small">
            Seret blok untuk memindah, tarik titik untuk mengubah ukuran. Panah = geser 1px (Shift = 10px),
            Ctrl+D = duplikat, Delete = hapus.
          </p>
        </aside>

        <main
          className="canvas-wrap"
          ref={wrapRef}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <Canvas
            layout={layout}
            assetsById={assetsById}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id) setTab((t) => (t === 'canvas' ? 'props' : t));
            }}
            apply={apply}
            scale={scale}
            snap={snap}
            mode={mode}
            stageRef={stageRef}
          />
        </main>

        <aside className="panel panel-right">
          <div className="tabs">
            {[
              ['props', 'Properti'],
              ['layers', 'Layer'],
              ['canvas', 'Kanvas'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'props' && (
            <PropsPanel
              block={selected}
              mode={mode}
              assets={assets}
              assetsById={assetsById}
              onPatch={(p, key) => selected && patch(selected.id, p, key)}
              onPatchProps={(p, key) => selected && patchProps(selected.id, p, key)}
              onDuplicate={duplicateSelected}
              onRemove={removeSelected}
            />
          )}

          {tab === 'layers' && (
            <LayerPanel layout={layout} selectedId={selectedId} onSelect={setSelectedId} apply={apply} mode={mode} />
          )}

          {tab === 'canvas' && (
            <div className="props">
              <h4>Ukuran &amp; latar kanvas</h4>
              <div className="grid2">
                <NumberField label="Lebar" value={layout.canvas.width} min={480} max={3000} onChange={(v) => setCanvas({ width: v }, 'w')} />
                <NumberField label="Tinggi" value={layout.canvas.height} min={300} max={12000} onChange={(v) => setCanvas({ height: v }, 'h')} />
              </div>
              <ColorField label="Warna latar" value={layout.canvas.background} onChange={(v) => setCanvas({ background: v }, 'bg')} />
              <p className="hint small">
                Di layar kecil seluruh kanvas diperkecil proporsional, jadi pilih lebar desain yang konsisten
                (bawaan 1440px).
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
});

export default Editor;
