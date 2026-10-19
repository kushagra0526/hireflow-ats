import { useEffect, useState } from 'react';
import { api, daysSince } from './api.js';
import { Highlight, PageHead, Pips } from './ui.jsx';

const STALE_DAYS = 7; // people waiting this long in an open stage get flagged

export default function Pipeline({ meta, version, onOpen, notify }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('');
  const [over, setOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/candidates').then(setList).catch((e) => setError(e.message));
  }, [version]);

  // a keyboard move re-mounts the card in another lane; keep focus on it
  useEffect(() => {
    if (!focusId) return;
    document.querySelector(`[data-id="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [list, focusId]);

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
      notify(`Moved ${card.name} to ${stage}.`);
    } catch (e) {
      setList(before);
      setError(e.message);
    }
  }

  function onCardKey(e, c) {
    if (e.key === 'Enter') return onOpen(c._id);
    const step = e.shiftKey && { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    const next = step && meta.stages[meta.stages.indexOf(c.stage) + step];
    if (!next) return;
    e.preventDefault();
    setFocusId(c._id);
    move(c._id, next);
  }

  const q = filter.trim().toLowerCase();
  const shown = !list ? [] : q ? list.filter((c) => [c.name, c.position, ...c.skills].some((v) => v.toLowerCase().includes(q))) : list;

  return (
    <>
      <PageHead title="Pipeline">Everyone who is still in play, by stage. Drag a card to move it, or focus a card and press Shift with ← or →.</PageHead>

      <div className="board-tools">
        <input type="search" placeholder="Filter by name, role or skill" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter the board" />
        <span className="legend-note"><i className="stale-dot" aria-hidden="true" /> Waiting {STALE_DAYS}+ days in an open stage</span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {!list ? (
        <p className="loading">Loading the board…</p>
      ) : (
        <div className="board">
          {meta.stages.map((stage) => {
            const cards = shown.filter((c) => c.stage === stage);
            const open = stage !== 'Hired' && stage !== 'Rejected';
            return (
              <section
                key={stage}
                className={`lane stage-${stage}${over === stage ? ' over' : ''}`}
                aria-label={`${stage}, ${cards.length}`}
                onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setOver(null)}
                onDrop={(e) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData('text/plain'), stage); }}
              >
                <header className="lane-head">
                  <h2>{stage}</h2>
                  <span className="num">{cards.length}</span>
                </header>
                <div className="lane-body">
                  {cards.map((c) => {
                    const days = daysSince(c.history.at(-1)?.at ?? c.appliedAt);
                    const stale = open && days >= STALE_DAYS;
                    return (
                      <article
                        key={c._id}
                        data-id={c._id}
                        className={`card-item${dragging === c._id ? ' dragging' : ''}`}
                        draggable
                        tabIndex={0}
                        role="button"
                        aria-label={`${c.name}, ${c.position}, ${days} days in ${stage}${stale ? ', waiting long' : ''}`}
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', c._id); e.dataTransfer.effectAllowed = 'move'; setDragging(c._id); }}
                        onDragEnd={() => { setDragging(null); setOver(null); }}
                        onClick={() => onOpen(c._id)}
                        onKeyDown={(e) => onCardKey(e, c)}
                      >
                        <div className="ci-name"><Highlight text={c.name} q={filter} /></div>
                        <div className="ci-role"><Highlight text={c.position} q={filter} /></div>
                        {c.skills.length > 0 && <div className="ci-skills"><Highlight text={c.skills.slice(0, 3).join(' · ')} q={filter} /></div>}
                        <div className="ci-foot">
                          <Pips value={c.rating} />
                          <span className={`ci-age num${stale ? ' stale' : ''}`}>{stale && <i className="stale-dot" aria-hidden="true" />}{days}d</span>
                        </div>
                      </article>
                    );
                  })}
                  {!cards.length && <p className="lane-empty">{q ? 'No matches' : 'Nobody here yet'}</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
