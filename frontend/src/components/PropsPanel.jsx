import { BLENDS, FONTS, TYPE_LABEL } from '../lib/blocks.js';
import {
  AreaField,
  CheckField,
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  TextField,
} from './ui.jsx';

const fontOptions = FONTS.map((f) => ({ value: f, label: f }));
const blendOptions = BLENDS.map((b) => ({ value: b, label: b }));
const weightOptions = [300, 400, 500, 600, 700, 800].map((w) => ({ value: w, label: String(w) }));
const alignOptions = [
  { value: 'left', label: 'Kiri' },
  { value: 'center', label: 'Tengah' },
  { value: 'right', label: 'Kanan' },
];

export default function PropsPanel({
  block,
  mode,
  assets,
  assetsById,
  onPatch,
  onPatchProps,
  onDuplicate,
  onRemove,
}) {
  if (!block) {
    return <p className="hint">Pilih blok di kanvas atau di panel Layer untuk mengubah propertinya.</p>;
  }

  const remix = mode === 'remix';
  if (remix && block.lockRemix) {
    return (
      <p className="hint">
        🔒 Blok ini dikunci oleh pemilik portofolio, jadi tidak bisa diubah di mode remix. Kamu tetap bisa
        menumpuk blok lain di atasnya.
      </p>
    );
  }

  const p = block.props;
  const setP = (patch, key) => onPatchProps(patch, key);
  const textMax = remix ? 500 : 2000;

  const imageOptions = [{ value: null, label: '(belum dipilih)' }, ...assets.map((a) => ({ value: a.id, label: a.name }))];
  if (block.type === 'image' && p.assetId != null && !assets.some((a) => a.id === p.assetId)) {
    imageOptions.push({ value: p.assetId, label: assetsById[p.assetId]?.name || `Asset #${p.assetId}` });
  }

  return (
    <div className="props">
      <h4>{TYPE_LABEL[block.type]}</h4>

      {block.type === 'text' && (
        <>
          <AreaField label="Isi teks" value={p.content} maxLength={textMax} onChange={(v) => setP({ content: v }, 'content')} />
          <div className="grid2">
            <NumberField label="Ukuran" value={p.fontSize} min={8} max={300} onChange={(v) => setP({ fontSize: v }, 'fontSize')} />
            <SelectField label="Ketebalan" value={p.fontWeight} options={weightOptions} onChange={(v) => setP({ fontWeight: v })} />
          </div>
          <SelectField label="Font" value={p.fontFamily} options={fontOptions} onChange={(v) => setP({ fontFamily: v })} />
          <div className="grid2">
            <ColorField label="Warna" value={p.color} onChange={(v) => setP({ color: v }, 'color')} />
            <SelectField label="Rata" value={p.align} options={alignOptions} onChange={(v) => setP({ align: v })} />
          </div>
          <div className="grid2">
            <NumberField label="Tinggi baris" value={p.lineHeight} min={0.8} max={3} step={0.1} onChange={(v) => setP({ lineHeight: v }, 'lineHeight')} />
            <NumberField label="Jarak huruf" value={p.letterSpacing} min={-5} max={30} step={0.5} onChange={(v) => setP({ letterSpacing: v }, 'letterSpacing')} />
          </div>
        </>
      )}

      {block.type === 'image' && (
        <>
          <SelectField label="Gambar" value={p.assetId} options={imageOptions} onChange={(v) => setP({ assetId: v })} />
          <div className="grid2">
            <SelectField
              label="Penyesuaian"
              value={p.fit}
              options={[
                { value: 'contain', label: 'Muat (contain)' },
                { value: 'cover', label: 'Penuhi (cover)' },
              ]}
              onChange={(v) => setP({ fit: v })}
            />
            <NumberField label="Sudut bulat" value={p.radius} min={0} max={500} onChange={(v) => setP({ radius: v }, 'radius')} />
          </div>
        </>
      )}

      {block.type === 'shape' && (
        <>
          <SelectField
            label="Bentuk"
            value={p.shape}
            options={[
              { value: 'rect', label: 'Persegi' },
              { value: 'circle', label: 'Lingkaran' },
            ]}
            onChange={(v) => setP({ shape: v })}
          />
          <div className="grid2">
            <ColorField label="Warna" value={p.fill} onChange={(v) => setP({ fill: v }, 'fill')} />
            {p.fill2 ? (
              <ColorField label="Warna 2" value={p.fill2} onChange={(v) => setP({ fill2: v }, 'fill2')} />
            ) : (
              <div />
            )}
          </div>
          <CheckField
            label="Gradasi"
            checked={!!p.fill2}
            onChange={(on) => setP({ fill2: on ? '#a78bfa' : '' })}
          />
          {p.fill2 && (
            <NumberField label="Sudut gradasi" value={p.angle} min={0} max={360} onChange={(v) => setP({ angle: v }, 'angle')} />
          )}
          <div className="grid2">
            <NumberField label="Sudut bulat" value={p.radius} min={0} max={500} onChange={(v) => setP({ radius: v }, 'radius')} />
            <NumberField label="Blur (glow)" value={p.blur} min={0} max={200} onChange={(v) => setP({ blur: v }, 'blur')} />
          </div>
          <div className="grid2">
            <NumberField label="Garis tepi" value={p.borderWidth} min={0} max={40} onChange={(v) => setP({ borderWidth: v }, 'borderWidth')} />
            <ColorField label="Warna tepi" value={p.borderColor} onChange={(v) => setP({ borderColor: v }, 'borderColor')} />
          </div>
        </>
      )}

      {block.type === 'project' && (
        <>
          <TextField label="Judul" value={p.title} maxLength={80} onChange={(v) => setP({ title: v }, 'title')} />
          <AreaField label="Deskripsi" value={p.description} maxLength={400} rows={4} onChange={(v) => setP({ description: v }, 'description')} />
          <label className="field">
            <span>Tag (pisahkan dengan koma)</span>
            <input
              key={`${block.id}:${(p.tags || []).join('|')}`}
              type="text"
              defaultValue={(p.tags || []).join(', ')}
              onBlur={(e) =>
                setP({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim().slice(0, 24))
                    .filter(Boolean)
                    .slice(0, 8),
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
          </label>
          <TextField label="Link (http/https/mailto)" value={p.url} maxLength={500} onChange={(v) => setP({ url: v }, 'url')} />
          <div className="grid3">
            <ColorField label="Aksen" value={p.accent} onChange={(v) => setP({ accent: v }, 'accent')} />
            <ColorField label="Latar" value={p.bg} onChange={(v) => setP({ bg: v }, 'bg')} />
            <ColorField label="Teks" value={p.textColor} onChange={(v) => setP({ textColor: v }, 'textColor')} />
          </div>
        </>
      )}

      {block.type === 'button' && (
        <>
          <TextField label="Label" value={p.label} maxLength={60} onChange={(v) => setP({ label: v }, 'label')} />
          <TextField label="Link (http/https/mailto)" value={p.url} maxLength={500} onChange={(v) => setP({ url: v }, 'url')} />
          <div className="grid2">
            <ColorField label="Latar" value={p.bg} onChange={(v) => setP({ bg: v }, 'bg')} />
            <ColorField label="Teks" value={p.color} onChange={(v) => setP({ color: v }, 'color')} />
          </div>
          <div className="grid2">
            <NumberField label="Sudut bulat" value={p.radius} min={0} max={999} onChange={(v) => setP({ radius: v }, 'radius')} />
            <NumberField label="Ukuran teks" value={p.fontSize} min={8} max={80} onChange={(v) => setP({ fontSize: v }, 'fontSize')} />
          </div>
        </>
      )}

      {block.type === 'terminal' && (
        <>
          <TextField label="Judul jendela" value={p.title} maxLength={60} onChange={(v) => setP({ title: v }, 'title')} />
          <AreaField
            label="Baris (awali perintah dengan $)"
            value={p.lines}
            maxLength={remix ? 800 : 3000}
            rows={7}
            mono
            onChange={(v) => setP({ lines: v }, 'lines')}
          />
          <div className="grid2">
            <NumberField label="Ukuran teks" value={p.fontSize} min={10} max={40} onChange={(v) => setP({ fontSize: v }, 'fontSize')} />
            <ColorField label="Aksen" value={p.accent} onChange={(v) => setP({ accent: v }, 'accent')} />
          </div>
        </>
      )}

      <hr />
      <h4>Posisi &amp; tampilan</h4>
      <div className="grid2">
        <NumberField label="X" value={block.x} min={-3000} max={6000} onChange={(v) => onPatch({ x: v }, 'x')} />
        <NumberField label="Y" value={block.y} min={-3000} max={12000} onChange={(v) => onPatch({ y: v }, 'y')} />
        <NumberField label="Lebar" value={block.width} min={10} max={4000} onChange={(v) => onPatch({ width: v }, 'width')} />
        <NumberField label="Tinggi" value={block.height} min={10} max={4000} onChange={(v) => onPatch({ height: v }, 'height')} />
        <NumberField label="Rotasi (°)" value={block.rotation} min={-360} max={360} onChange={(v) => onPatch({ rotation: v }, 'rotation')} />
        <SelectField label="Blend" value={block.blend} options={blendOptions} onChange={(v) => onPatch({ blend: v })} />
      </div>
      <RangeField label="Opacity" value={block.opacity} onChange={(v) => onPatch({ opacity: v }, 'opacity')} />
      <hr />
      <TextField label="Nama layer" value={block.name} maxLength={60} onChange={(v) => onPatch({ name: v }, 'name')} />
      {!remix && (
        <CheckField
          label="Kunci dari remix (pengunjung tidak bisa mengubah blok ini)"
          checked={!!block.lockRemix}
          onChange={(v) => onPatch({ lockRemix: v })}
        />
      )}

      <div className="row-actions">
        <button type="button" onClick={onDuplicate}>
          Duplikat
        </button>
        <button type="button" className="danger" onClick={onRemove}>
          Hapus
        </button>
      </div>
    </div>
  );
}
