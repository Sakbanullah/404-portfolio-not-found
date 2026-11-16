import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(username, password);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>Admin</h1>
        <p className="muted">Masuk untuk mengatur halaman portofolio.</p>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy || !username || !password}>
          {busy ? 'Masuk…' : 'Masuk'}
        </button>
        <Link to="/" className="muted small">
          ← Kembali ke situs
        </Link>
      </form>
    </div>
  );
}
