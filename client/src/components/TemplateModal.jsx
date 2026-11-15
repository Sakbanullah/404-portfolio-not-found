import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Thumbnail sederhana: kotak warna + garis teks tiruan, bukan render layout sebenarnya.
const THUMBS = {
  'terminal-gelap': {
    background: 'linear-gradient(135deg, #0b0f14, #10161d)',
    ink: '#3ddc97',
    soft: '#5d6b7a',
    accent: '#a78bfa',
    terminal: true,
  },
  minimalis: { background: '#faf9f6', ink: '#111111', soft: '#c9c5bc', accent: '#111111' },
  playful: {
    background: 'radial-gradient(circle at 80% 20%, #fde047 0 28%, transparent 29%), radial-gradient(circle at 15% 80%, #f472b6 0 25%, transparent 26%), #fff7e6',
    ink: '#2b1a4f',
    soft: '#b79cff',
    accent: '#ffd23f',
    caveat: true,
  },
};

function Thumb({ id }) {
  const t = THUMBS[id] || THUMBS.minimalis;
  const [a, b] = id === 'terminal-gelap' ? [38, 20] : id === 'playful' ? [52, 34] : [46, 26];
  return (
    <svg className="tpl-thumb" viewBox="0 0 200 150" style={{ background: t.background }} aria-hidden="true">
      <text x="14" y={a} fill={t.ink} fontSize="22" fontWeight="700" fontFamily={t.caveat ? 'Caveat, cursive' : 'Space Grotesk, sans-serif'}>
        {id === 'terminal-gelap' ? '~/portfolio' : id === 'playful' ? 'Hai!' : 'Nama Kamu'}
      </text>
      <rect x="14" y={a + 8} width="96" height="6" rx="3" fill={t.soft} />
      <rect x="14" y={a + 22} width="70" height="6" rx="3" fill={t.soft} opacity="0.7" />
      <rect x="14" y="112" width="52" height="18" rx="9" fill={t.accent} />
      {t.terminal && <rect x="120" y="40" width="66" height="52" rx="6" fill="#0a0e13" stroke={t.ink} strokeOpacity="0.5" />}
    </svg>
  );
}

/**
 * Modal pemilihan template awal. Langkah 1: pilih kartu. Langkah 2: konfirmasi bahwa draft
 * saat ini akan ditimpa (versi published tidak tersentuh sampai Publish).
 */
export default function TemplateModal({ onApply, onClose }) {
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .adminGetTemplates()
      .then((list) => alive && setTemplates(list))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  async function apply() {
    setBusy(true);
    setError('');
    try {
      await onApply(picked.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Pilih template">
        {!picked ? (
          <>
            <h3>Mulai dari template</h3>
            <p className="hint">Pilih gaya awal, lalu edit sesukamu. Template hanya mengganti draft.</p>
            {error && <p className="error">{error}</p>}
            {!templates && !error && <p className="hint">Memuat…</p>}
            <div className="tpl-grid">
              {(templates || []).map((t) => (
                <button key={t.id} type="button" className="tpl-card" onClick={() => setPicked(t)}>
                  <Thumb id={t.id} />
                  <strong>{t.name}</strong>
                  <p>{t.description}</p>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Batal
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>Timpa draft dengan “{picked.name}”?</h3>
            <div className="tpl-grid">
              <Thumb id={picked.id} />
            </div>
            <p className="hint">
              Layout draft saat ini (termasuk perubahan yang belum disimpan) akan <b>hilang dan diganti</b> oleh
              template ini. Undo (Ctrl+Z) masih bisa mengembalikannya selama halaman belum dimuat ulang. Versi yang sudah dipublish tetap aman dan baru berubah setelah kamu menekan
              <b> Publish</b>.
            </p>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setPicked(null)} disabled={busy}>
                ← Pilih template lain
              </button>
              <button type="button" className="danger" onClick={apply} disabled={busy}>
                {busy ? 'Menerapkan…' : 'Timpa draft'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
