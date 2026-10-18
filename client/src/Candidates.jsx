import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Avatar, Badge, Stars } from './ui.jsx';

export default function Candidates({ meta, version, onOpen }) {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [position, setPosition] = useState('');
  const [sort, setSort] = useState('newest');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true; // ignore responses from searches the user has already typed past
    const timer = setTimeout(() => {
      api(`/candidates?${new URLSearchParams({ q, stage, position, sort })}`)
        .then((data) => live && (setList(data), setError('')))
        .catch((e) => live && setError(e.message));
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [q, stage, position, sort, version]);

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Search name, email, role or skill…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" />
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by stage">
          <option value="">All stages</option>
          {meta.stages.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Filter by position">
          <option value="">All positions</option>
          {meta.positions.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!list ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <p className="muted small results">{list.length} {list.length === 1 ? 'candidate' : 'candidates'}</p>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr><th>Candidate</th><th>Position</th><th>Stage</th><th>Source</th><th>Rating</th><th>Applied</th></tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c._id} tabIndex={0} onClick={() => onOpen(c._id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(c._id)}>
                    <td>
                      <div className="who">
                        <Avatar name={c.name} />
                        <div><strong>{c.name}</strong><span className="muted small">{c.email}</span></div>
                      </div>
                    </td>
                    <td>{c.position}<span className="muted small">{c.experience} yrs · {c.skills.slice(0, 3).join(', ')}</span></td>
                    <td><Badge stage={c.stage} /></td>
                    <td>{c.source}</td>
                    <td><Stars value={c.rating} /></td>
                    <td className="nowrap">{new Date(c.appliedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && <p className="empty-table">No candidates match these filters.</p>}
          </div>
        </>
      )}
    </>
  );
}
