import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Badge, Stars } from './ui.jsx';

const EMPTY = { name: '', email: '', phone: '', position: '', experience: 0, skills: '', source: 'LinkedIn', stage: 'Applied', rating: 0, resumeUrl: '', notes: '' };

export default function CandidateModal({ id, meta, onClose, onSaved }) {
  const isNew = id === 'new';
  const dialog = useRef(null);
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [saved, setSaved] = useState(null); // the candidate as stored on the server
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => dialog.current.showModal(), []);
  useEffect(() => {
    if (isNew) return;
    api(`/candidates/${id}`)
      .then((c) => { setSaved(c); setForm({ ...EMPTY, ...c, skills: c.skills.join(', ') }); })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const close = () => dialog.current.close();
  const field = (key) => ({ value: form[key] ?? '', onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = { ...form, experience: Number(form.experience) || 0, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      await api(isNew ? '/candidates' : `/candidates/${id}`, { method: isNew ? 'POST' : 'PATCH', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${saved.name}? This cannot be undone.`)) return;
    try {
      await api(`/candidates/${id}`, { method: 'DELETE' });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} onClick={(e) => e.target === dialog.current && close()} aria-labelledby="modal-title">
      {!form ? (
        <div className="modal-loading">{error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading…</p>}</div>
      ) : (
        <form onSubmit={save}>
          <header className="modal-head">
            <div>
              <h2 id="modal-title">{isNew ? 'Add candidate' : saved.name}</h2>
              {!isNew && <span className="muted small">{saved.position} · applied {new Date(saved.appliedAt).toLocaleDateString()}</span>}
            </div>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close">×</button>
          </header>

          <div className={`modal-grid${isNew ? ' single' : ''}`}>
            <div className="fields">
              <label>Full name *<input {...field('name')} required maxLength={100} autoFocus={isNew} /></label>
              <label>Email *<input type="email" {...field('email')} required /></label>
              <label>Phone<input type="tel" {...field('phone')} maxLength={30} /></label>
              <label>
                Position *
                <input list="positions" {...field('position')} required maxLength={100} />
                <datalist id="positions">{meta.positions.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
              <label>Experience (years)<input type="number" min="0" max="50" {...field('experience')} /></label>
              <label>Source<select {...field('source')}>{meta.sources.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label>Stage<select {...field('stage')}>{meta.stages.map((s) => <option key={s}>{s}</option>)}</select></label>
              <div className="label">Rating<Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></div>
              <label className="wide">Skills (comma separated)<input {...field('skills')} placeholder="React, Node.js, SQL" /></label>
              <label className="wide">Resume link<input type="url" {...field('resumeUrl')} placeholder="https://…" /></label>
              <label className="wide">Notes<textarea rows="3" {...field('notes')} maxLength={2000} /></label>
            </div>

            {!isNew && (
              <aside className="timeline">
                <h3>Stage history</h3>
                <ol>
                  {[...saved.history].reverse().map((h, i) => (
                    <li key={i} className={`stage-${h.stage}`}>
                      <Badge stage={h.stage} />
                      <span className="muted small">{new Date(h.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </li>
                  ))}
                </ol>
                {saved.resumeUrl && <a className="resume" href={saved.resumeUrl} target="_blank" rel="noreferrer">Open resume ↗</a>}
              </aside>
            )}
          </div>

          {error && <p className="error modal-error" role="alert">{error}</p>}
          <footer className="modal-foot">
            {!isNew && <button type="button" className="btn danger" onClick={remove}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="btn" onClick={close}>Cancel</button>
            <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add candidate' : 'Save changes'}</button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
