import { useState } from 'react';
import { api } from './api.js';

export default function Login({ onLogin }) {
  // prefilled with the demo account so reviewers can sign in with one click
  const [email, setEmail] = useState('admin@hireflow.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin((await api('/auth/login', { method: 'POST', body: { email, password } })).token);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand big"><span className="logo">H</span> HireFlow</div>
        <p className="muted">Sign in to manage candidates and your hiring pipeline.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint">Demo account: admin@hireflow.dev / admin123</p>
      </form>
    </div>
  );
}
