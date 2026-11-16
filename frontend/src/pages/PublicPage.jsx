import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Viewer from '../components/Viewer.jsx';

export default function PublicPage() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    api
      .getPage()
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((err) => alive && setState({ status: 'error', message: err.message }));
    return () => {
      alive = false;
    };
  }, []);

  // Samakan warna latar halaman dengan kanvas supaya sisi kiri/kanan menyatu di layar lebar.
  useEffect(() => {
    if (state.status !== 'ready') return undefined;
    const previous = document.body.style.background;
    document.body.style.background = state.data.layout.canvas.background;
    return () => {
      document.body.style.background = previous;
    };
  }, [state]);

  if (state.status === 'loading') return <div className="center-msg">Memuat…</div>;
  if (state.status === 'error') return <div className="center-msg">Gagal memuat halaman: {state.message}</div>;

  const { layout, assets, remixCount } = state.data;
  return (
    <>
      <Viewer layout={layout} assetsById={assets} />
      <Link to="/remix" className="remix-fab">
        ✨ Remix halaman ini
        {remixCount > 0 && <small>{remixCount} remix</small>}
      </Link>
    </>
  );
}
