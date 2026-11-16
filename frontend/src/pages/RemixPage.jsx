import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Editor from '../components/Editor.jsx';
import { MAX_BLOCKS, normalizeLayout } from '../lib/blocks.js';
import { useLayoutState } from '../lib/useLayoutState.js';

const STORAGE_KEY = 'pc_remix_v1';

function countOnce() {
  try {
    if (sessionStorage.getItem('pc_remix_counted')) return;
    sessionStorage.setItem('pc_remix_counted', '1');
  } catch {
    return;
  }
  api.countRemix().catch(() => {});
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const layout = saved?.layout;
    if (layout && Array.isArray(layout.blocks) && layout.blocks.length <= MAX_BLOCKS && layout.canvas) return layout;
  } catch {
    /* data rusak: abaikan */
  }
  return null;
}

export default function RemixPage() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    Promise.all([api.getPage(), api.getAssets()])
      .then(([page, assets]) => {
        if (!alive) return;
        countOnce();
        setState({ status: 'ready', page, assets });
      })
      .catch((err) => alive && setState({ status: 'error', message: err.message }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === 'loading') return <div className="center-msg">Menyiapkan editor remix…</div>;
  if (state.status === 'error') return <div className="center-msg">Gagal memuat: {state.message}</div>;
  return <RemixEditor page={state.page} assets={state.assets} />;
}

function RemixEditor({ page, assets }) {
  const initial = useMemo(() => normalizeLayout(loadSaved() ?? page.layout), [page]);
  const history = useLayoutState(initial);
  const editorRef = useRef(null);
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);

  // Simpan otomatis ke browser pengunjung (tidak pernah dikirim ke server).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ publishedAt: page.publishedAt, layout: history.layout }));
      } catch {
        /* kuota penuh atau penyimpanan diblokir */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [history.layout, page.publishedAt]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function reset() {
    if (!window.confirm('Kembalikan ke versi asli? Perubahanmu akan hilang.')) return;
    history.reset(page.layout);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* abaikan */
    }
    setToast('Dikembalikan ke versi asli');
  }

  async function exportPng() {
    const node = editorRef.current?.getStage();
    if (!node) return;
    setExporting(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 1.5,
        width: history.layout.canvas.width,
        height: history.layout.canvas.height,
        style: { transform: 'none', transformOrigin: 'top left' },
        // Sembunyikan kotak seleksi dan blok yang disembunyikan dari hasil ekspor.
        filter: (el) => !(el.dataset && (el.dataset.ui === '1' || el.dataset.hidden === '1')),
      });
      const link = document.createElement('a');
      link.download = 'remix-portfolio.png';
      link.href = dataUrl;
      link.click();
      setToast('PNG diunduh');
    } catch (err) {
      console.error(err);
      setToast('Gagal membuat PNG, coba lagi');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Editor
      ref={editorRef}
      mode="remix"
      history={history}
      assets={assets}
      extraAssets={page.assets}
      topLeft={
        <>
          <Link to="/" className="btn-link">
            ← Kembali
          </Link>
          <strong className="brand">Mode Remix</strong>
        </>
      }
      topRight={
        <>
          {toast && <span className="toast">{toast}</span>}
          <span className="muted small">Tersimpan otomatis di browser kamu</span>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" className="primary" onClick={exportPng} disabled={exporting}>
            {exporting ? 'Membuat…' : 'Export PNG'}
          </button>
        </>
      }
    />
  );
}
