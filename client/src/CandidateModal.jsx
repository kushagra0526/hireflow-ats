import { useEffect, useRef, useState } from 'react';
import { api, shortDate, stamp } from './api.js';
import { Monogram, Pips, StageMark } from './ui.jsx';

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
  const reached = new Set(saved?.history.map((h) => h.stage));
  const moving = saved && form.stage !== saved.stage;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = { ...form, experience: Number(form.experience) || 0, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      await api(isNew ? '/candidates' : `/candidates/${id}`, { method: isNew ? 'POST' : 'PATCH', body });
      onSaved(isNew ? `Added ${body.name}.` : moving ? `Moved ${body.name} to ${form.stage}.` : `Saved ${body.name}.`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${saved.name}? This cannot be undone.`)) return;
    try {
      await api(`/candidates/${id}`, { method: 'DELETE' });
      onSaved(`Deleted ${saved.name}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <dialog ref={dialog} className="drawer" onClose={onClose} onClick={(e) => e.target === dialog.current && close()} aria-labelledby="drawer-title">
      {!form ? (
        <div className="drawer-loading">{error ? <p className="error" role="alert">{error}</p> : <p className="loading">Opening…</p>}</div>
      ) : (
        <form onSubmit={save} className="drawer-form">
          <header className="drawer-head">
            {!isNew && <Monogram name={saved.name} large />}
            <div className="drawer-id">
              <p className="kicker">{isNew ? 'New candidate' : `Applied ${shortDate(saved.appliedAt)} · via ${saved.source}`}</p>
              <h2 id="drawer-title">{isNew ? 'Add someone to the pipeline' : saved.name}</h2>
              {!isNew && (
                <p className="contact">
                  <a href={`mailto:${saved.email}`}>{saved.email}</a>
                  {saved.phone && <a href={`tel:${saved.phone.replace(/\s/g, '')}`}>{saved.phone}</a>}
                  {saved.resumeUrl && <a href={saved.resumeUrl} target="_blank" rel="noreferrer">Résumé ↗</a>}
                </p>
              )}
            </div>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close">×</button>
          </header>

          <div className="drawer-body">
            <fieldset className="stepper">
              <legend className="section-title">Stage</legend>
              <div className="stepper-track">
                {meta.stages.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={`step stage-${s}${form.stage === s ? ' current' : ''}${reached.has(s) ? ' reached' : ''}`}
                    aria-pressed={form.stage === s}
                    onClick={() => setForm({ ...form, stage: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {moving && <p className="hint">Saving will move {saved.name.split(' ')[0]} from {saved.stage} to {form.stage}.</p>}
            </fieldset>

            <div className="field-grid">
              <label className="field">Full name<input {...field('name')} required maxLength={100} autoFocus={isNew} /></label>
              <label className="field">Email<input type="email" {...field('email')} required /></label>
              <label className="field">Role applied for<input list="positions" {...field('position')} required maxLength={100} /></label>
              <datalist id="positions">{meta.positions.map((p) => <option key={p} value={p} />)}</datalist>
              <label className="field">Phone<input type="tel" {...field('phone')} maxLength={30} /></label>
              <label className="field">Experience, years<input type="number" min="0" max="50" {...field('experience')} /></label>
              <label className="field">Source<select {...field('source')}>{meta.sources.map((s) => <option key={s}>{s}</option>)}</select></label>
              <div className="field wide">Rating<Pips value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></div>
              <label className="field wide">Skills, comma separated<input {...field('skills')} placeholder="React, Node.js, SQL" /></label>
              <label className="field wide">Résumé link<input type="url" {...field('resumeUrl')} placeholder="https://" /></label>
              <label className="field wide">Notes<textarea rows="4" {...field('notes')} maxLength={2000} placeholder="Interview notes, availability, salary expectations…" /></label>
            </div>

            {!isNew && (
              <section className="history">
                <h3 className="section-title">History</h3>
                <ol>
                  {[...saved.history].reverse().map((h, i) => (
                    <li key={i}><time className="num" dateTime={h.at}>{stamp(h.at)}</time><StageMark stage={h.stage} /></li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <footer className="drawer-foot">
            {error && <p className="error" role="alert">{error}</p>}
            <div className="drawer-actions">
              {!isNew && <button type="button" className="btn-text danger" onClick={remove}>Delete</button>}
              <span className="spacer" />
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add candidate' : moving ? `Save and move to ${form.stage}` : 'Save changes'}</button>
            </div>
          </footer>
        </form>
      )}
    </dialog>
  );
}
