import { useEffect, useRef, useState } from 'react';
import { api, plural, shortDate } from './api.js';
import { Highlight, Monogram, PageHead, Pips, StageMark } from './ui.jsx';

export default function Candidates({ meta, version, onOpen }) {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [position, setPosition] = useState('');
  const [sort, setSort] = useState('newest');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const search = useRef(null);

  useEffect(() => {
    let live = true; // ignore responses from searches the user has already typed past
    const timer = setTimeout(() => {
      api(`/candidates?${new URLSearchParams({ q, stage, position, sort })}`)
        .then((data) => live && (setList(data), setError('')))
        .catch((e) => live && setError(e.message));
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [q, stage, position, sort, version]);

  // "/" jumps to search, like most tools people already use
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        search.current.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const filtered = q.trim() || stage || position;

  return (
    <>
      <PageHead title="Candidates">Everyone who has applied. Search by name, email, role or skill, then narrow by stage or role.</PageHead>

      <div className="filters">
        <label className="search">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" strokeLinecap="round" /></svg>
          <input ref={search} type="search" placeholder="Search candidates" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" />
          {!q && <kbd aria-hidden="true">/</kbd>}
        </label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
          <option value="">Any stage</option>
          {meta.stages.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Role">
          <option value="">Any role</option>
          {meta.positions.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {!list ? (
        <p className="loading">Loading candidates…</p>
      ) : (
        <>
          <p className="result-line" aria-live="polite">
            {plural(list.length, 'candidate')}{q.trim() && <> matching “{q.trim()}”</>}
            {filtered && <button className="btn-text" onClick={() => { setQ(''); setStage(''); setPosition(''); }}>Clear filters</button>}
          </p>
          {list.length ? (
            <div className="table-scroll">
              <table className="ledger">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col" className="col-role">Role</th>
                    <th scope="col">Stage</th>
                    <th scope="col" className="col-source">Source</th>
                    <th scope="col" className="col-rating">Rating</th>
                    <th scope="col" className="col-applied">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c._id} tabIndex={0} onClick={() => onOpen(c._id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(c._id)}>
                      <td>
                        <div className="who">
                          <Monogram name={c.name} />
                          <div>
                            <strong><Highlight text={c.name} q={q} /></strong>
                            <span className="sub"><Highlight text={c.email} q={q} /></span>
                            <span className="sub role-inline"><Highlight text={c.position} q={q} /></span>
                          </div>
                        </div>
                      </td>
                      <td className="col-role">
                        <Highlight text={c.position} q={q} />
                        <span className="sub">{c.experience} {c.experience === 1 ? 'yr' : 'yrs'} · <Highlight text={c.skills.slice(0, 3).join(', ')} q={q} /></span>
                      </td>
                      <td><StageMark stage={c.stage} /></td>
                      <td className="col-source">{c.source}</td>
                      <td className="col-rating"><Pips value={c.rating} /></td>
                      <td className="col-applied"><time className="num" dateTime={c.appliedAt}>{shortDate(c.appliedAt)}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-note">Nobody matches that. Try a skill like “React” or “SQL”, or clear the filters.</p>
          )}
        </>
      )}
    </>
  );
}
