import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from './pages/AdminPage.jsx';
import PublicPage from './pages/PublicPage.jsx';
import RemixPage from './pages/RemixPage.jsx';
import { API_BASE } from './config.js';
import './styles.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/remix" element={<RemixPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

// Build production tanpa VITE_API_URL tidak boleh diam-diam menembak origin yang salah.
if (API_BASE === null) root.render(<AppConfigError />);

function AppConfigError() {
  console.error('[config] VITE_API_URL kosong pada build production. Set VITE_API_URL lalu build ulang.');
  return (
    <div role="alert" className="app-fatal">
      <h1>Konfigurasi server belum diisi</h1>
      <p>
        Build ini tidak punya alamat API. Set <code>VITE_API_URL</code> (contoh:{' '}
        <code>https://api.example.com</code>) lalu jalankan <code>npm run build</code> lagi.
      </p>
    </div>
  );
}
