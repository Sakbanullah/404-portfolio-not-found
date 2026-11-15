// Fungsi murni untuk mengubah layout. Semuanya mengembalikan objek baru (immutable)
// supaya undo/redo cukup menyimpan snapshot.

import { uid } from './blocks.js';

export const sortedByZ = (blocks) => [...blocks].sort((a, b) => a.zIndex - b.zIndex);

const topZ = (blocks) => blocks.reduce((max, b) => Math.max(max, b.zIndex), 0);

// Menyusun ulang zIndex menjadi 1..n tanpa celah atau angka kembar.
function withOrder(layout, orderedLowToHigh) {
  const z = new Map(orderedLowToHigh.map((b, i) => [b.id, i + 1]));
  return { ...layout, blocks: layout.blocks.map((b) => ({ ...b, zIndex: z.get(b.id) ?? b.zIndex })) };
}

export const updateBlock = (layout, id, patch) => ({
  ...layout,
  blocks: layout.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
});

export const updateProps = (layout, id, propsPatch) => ({
  ...layout,
  blocks: layout.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...propsPatch } } : b)),
});

export const addBlock = (layout, block) => ({
  ...layout,
  blocks: [...layout.blocks, { ...block, zIndex: topZ(layout.blocks) + 1 }],
});

export const removeBlock = (layout, id) => {
  const remaining = { ...layout, blocks: layout.blocks.filter((b) => b.id !== id) };
  return withOrder(remaining, sortedByZ(remaining.blocks));
};

export function duplicateBlock(layout, id) {
  const src = layout.blocks.find((b) => b.id === id);
  if (!src) return { layout, newId: null };
  const copy = {
    ...src,
    id: uid(),
    x: src.x + 24,
    y: src.y + 24,
    locked: false,
    name: src.name ? `${src.name} (salinan)` : '',
    props: { ...src.props, tags: src.props.tags ? [...src.props.tags] : undefined },
  };
  if (copy.props.tags === undefined) delete copy.props.tags;
  return { layout: addBlock(layout, copy), newId: copy.id };
}

// dir: 'front' | 'back' | 'up' | 'down'
export function moveZ(layout, id, dir) {
  const ordered = sortedByZ(layout.blocks);
  const i = ordered.findIndex((b) => b.id === id);
  if (i < 0) return layout;
  const [item] = ordered.splice(i, 1);
  let target = i;
  if (dir === 'front') target = ordered.length;
  else if (dir === 'back') target = 0;
  else if (dir === 'up') target = Math.min(ordered.length, i + 1);
  else if (dir === 'down') target = Math.max(0, i - 1);
  ordered.splice(target, 0, item);
  return withOrder(layout, ordered);
}

// Drag di panel layer: pindahkan blok `dragId` ke posisi blok `targetId`.
export function reorderTo(layout, dragId, targetId) {
  const topFirst = sortedByZ(layout.blocks).reverse();
  const from = topFirst.findIndex((b) => b.id === dragId);
  const to = topFirst.findIndex((b) => b.id === targetId);
  if (from < 0 || to < 0 || from === to) return layout;
  const [item] = topFirst.splice(from, 1);
  topFirst.splice(to, 0, item);
  return withOrder(layout, topFirst.reverse());
}
