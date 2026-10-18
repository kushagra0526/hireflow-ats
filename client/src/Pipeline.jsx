import { useEffect, useState } from 'react';
import { api, daysSince } from './api.js';
import { Avatar, Stars } from './ui.jsx';

export default function Pipeline({ meta, version, onOpen }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('');
  const [over, setOver] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/candidates').then(setList).catch((e) => setError(e.message));
  }, [version]);

  async function move(id, stage) {
    const before = list;
    const card = list.find((c) => c._id === id);
    if (!card || card.stage === stage) return;
    // optimistic: move the card now, roll back if the save fails
    setList(list.map((c) => (c._id === id ? { ...c, stage, history: [...c.history, { stage, at: new Date().toISOString() }] } : c)));
    setError('');
    try {
      const saved = await api(`/candidates/${id}`, { method: 'PATCH', body: { stage } });
      setList((l) => l.map((c) => (c._id === id ? saved : c)));
    } catch (e) {
      setList(before);
      setError(e.message);
    }
  }

  if (!list) return error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading…</p>;

  const q = filter.trim().toLowerCase();
  const shown = q ? list.filter((c) => [c.name, c.position, ...c.skills].some((v) => v.toLowerCase().includes(q))) : list;

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Filter by name, role or skill…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter the board" />
        <span className="muted">Drag a card to another column to change its stage.</span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="board">
        {meta.stages.map((stage) => {
          const cards = shown.filter((c) => c.stage === stage);
          return (
            <section
              key={stage}
              className={`column stage-${stage}${over === stage ? ' over' : ''}`}
              aria-label={`${stage} column`}
              onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData('text/plain'), stage); }}
            >
              <h2><i className="dot" /> {stage} <span className="count">{cards.length}</span></h2>
              {cards.map((c) => (
                <article
                  key={c._id}
                  className="kcard"
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.name}, ${c.position}. Open details`}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', c._id)}
                  onClick={() => onOpen(c._id)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(c._id)}
                >
                  <div className="kcard-top">
                    <Avatar name={c.name} />
                    <div>
                      <strong>{c.name}</strong>
                      <span className="muted small">{c.position}</span>
                    </div>
                  </div>
                  <div className="chips">{c.skills.slice(0, 2).map((s) => <span key={s}>{s}</span>)}</div>
                  <div className="kcard-bottom">
                    <Stars value={c.rating} />
                    <span className="muted small">{daysSince(c.history.at(-1)?.at ?? c.appliedAt)}d in stage</span>
                  </div>
                </article>
              ))}
              {!cards.length && <p className="empty">Drop a candidate here</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
