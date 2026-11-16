import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, clearToken, getToken } from '../api.js';
import Editor from '../components/Editor.jsx';
import { normalizeLayout } from '../lib/blocks.js';
import { useLayoutState } from '../lib/useLayoutState.js';
import Login from './Login.jsx';

export default function AdminPage() {
  const [token, setTokenState] = useState(() => getToken());

  if (!token) return <Login onLoggedIn={() => setTokenState(getToken())} />;
  return (
    <AdminLoader
      onLogout={() => {
        clearToken();
        setTokenState(null);
      }}
    />
  );
}

function AdminLoader({ onLogout }) {
  const [data, setData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([api.adminGetPage(), api.adminGetAssets()])
      .then(([page, list]) => {
        if (!alive) return;
        setData(page);
        setAssets(list);
      })
      .catch((err) => {
        if (!alive) return;
        if (err.status === 401) onLogout();
        else setError(err.message);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="center-msg">Gagal memuat: {error}</div>;
  if (!data) return <div className="center-msg">Memuat dashboard…</div>;
  return <AdminEditor initial={data} assets={assets} setAssets={setAssets} onLogout={onLogout} />;
}

function Uploader({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('icon');
  const [inLibrary, setInLibrary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name);
      form.append('category', category);
      form.append('inLibrary', String(inLibrary));
      const asset = await api.adminUploadAsset(form);
      onUploaded(asset);
      setFile(null);
      setName('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="uploader" onSubmit={submit}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input type="text" placeholder="Nama asset" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {['shape', 'icon', 'background', 'photo', 'misc'].map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="check">
        <input type="checkbox" checked={inLibrary} onChange={(e) => setInLibrary(e.target.checked)} />
        <span>Tampil di library remix</span>
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!file || busy}>
        {busy ? 'Mengunggah…' : 'Upload asset'}
      </button>
    </form>
  );
}

function AdminEditor({ initial, assets, setAssets, onLogout }) {
  const history = useLayoutState(normalizeLayout(initial.layout));
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(normalizeLayout(initial.layout)));
  const [unpublished, setUnpublished] = useState(initial.unpublished);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  
  const dirty = useMemo(() => JSON.stringify(history.layout) !== savedJson, [history.layout, savedJson]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleError(err) {
    if (err.status === 401) {
      onLogout();
      return;
    }
    setToast(`⚠ ${err.message}`);
  }

  async function save() {
    setBusy('save');
    try {
      const snapshot = history.layout;
      const result = await api.adminSavePage(snapshot);
      setSavedJson(JSON.stringify(snapshot));
      setUnpublished(result.unpublished);
      setToast('Draft tersimpan');
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setBusy('');
    }
  }

  // Terapkan template: server hanya menimpa draft, lalu muat ke editor lewat history.reset
  // (langkah ini masuk riwayat undo, jadi Ctrl+Z bisa mengembalikan layout sebelumnya).

  async function publish() {
    if (dirty && !(await save())) return;
    setBusy('publish');
    try {
      await api.adminPublish();
      setUnpublished(false);
      setToast('Dipublish ✓');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy('');
    }
  }

  // Ctrl/Cmd+S menyimpan draft; peringatan bila menutup tab dengan perubahan belum tersimpan.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  async function deleteAsset(asset) {
    if (!window.confirm(`Hapus asset "${asset.name}"?`)) return;
    try {
      await api.adminDeleteAsset(asset.id);
      setAssets((list) => list.filter((a) => a.id !== asset.id));
    } catch (err) {
      handleError(err);
    }
  }

  const status = dirty ? 'Perubahan belum disimpan' : unpublished ? 'Draft belum dipublish' : 'Sudah dipublish';

  return (
    <>
      <Editor
        mode="admin"
        history={history}
        assets={assets}
        onDeleteAsset={deleteAsset}
        assetPanelExtra={<Uploader onUploaded={(asset) => setAssets((list) => [...list, asset])} />}
        topLeft={<strong className="brand">Admin</strong>}
        topRight={
          <>
            {toast && <span className="toast">{toast}</span>}
            <span className={`status ${dirty || unpublished ? 'warn' : 'ok'}`}>{status}</span>
            <Link to="/" className="btn-link" target="_blank" rel="noopener">
              Lihat situs ↗
            </Link>
            <button type="button" onClick={save} disabled={!dirty || !!busy} title="Ctrl+S">
              {busy === 'save' ? 'Menyimpan…' : 'Simpan draft'}
            </button>
            <button type="button" className="primary" onClick={publish} disabled={(!dirty && !unpublished) || !!busy}>
              {busy === 'publish' ? 'Mempublish…' : 'Publish'}
            </button>
            <button type="button" onClick={onLogout}>
              Keluar
            </button>
          </>
        }
      />
    </>
  );
}
