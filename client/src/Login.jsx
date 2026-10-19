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
      <section className="login-intro">
        <p className="wordmark">HireFlow</p>
        <h1>Every candidate, from first application to signed offer.</h1>
        <ul className="login-points">
          <li><strong>Six stages, one board.</strong> Drag people forward as they progress.</li>
          <li><strong>Find anyone fast.</strong> Search by name, email, role or skill.</li>
          <li><strong>A funnel that keeps score.</strong> Conversion and time to hire, updated as you go.</li>
        </ul>
      </section>

      <main className="login-main">
        <form className="login-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <label className="field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="demo-note">
            Demo account, already filled in
            <span><code>admin@hireflow.dev</code> <code>admin123</code></span>
          </p>
        </form>
      </main>
    </div>
  );
}
