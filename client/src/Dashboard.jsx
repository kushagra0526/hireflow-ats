import { useEffect, useState } from 'react';
import { api, ago } from './api.js';
import { Avatar, Badge } from './ui.jsx';

const Bar = ({ label, value, max, note, className = '' }) => (
  <div className={`bar-row ${className}`}>
    <span>{label}</span>
    <div className="track"><div className="fill" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
    <span className="num">{value}{note && <span className="muted"> · {note}</span>}</span>
  </div>
);

const sorted = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

export default function Dashboard({ version, onOpen }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/stats').then(setS).catch((e) => setError(e.message));
  }, [version]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!s) return <p className="muted">Loading…</p>;

  const tiles = [
    ['Total candidates', s.total, `${s.newThisWeek} new this week`],
    ['In pipeline', s.active, 'not yet hired or rejected'],
    ['Hired', s.hired, `${s.hireRate}% of all applicants`],
    ['Avg. time to hire', s.avgDaysToHire == null ? '—' : `${s.avgDaysToHire}d`, 'from application to hire'],
  ];
  const sources = sorted(s.bySource);
  const positions = sorted(s.byPosition);

  return (
    <>
      <div className="tiles">
        {tiles.map(([label, value, sub]) => (
          <div className="card tile" key={label}>
            <div className="tile-label">{label}</div>
            <div className="tile-value">{value}</div>
            <div className="muted small">{sub}</div>
          </div>
        ))}
      </div>

      <section className="card panel">
        <h2>Pipeline right now</h2>
        <div className="stack" role="img" aria-label={Object.entries(s.byStage).map(([k, v]) => `${k} ${v}`).join(', ')}>
          {Object.entries(s.byStage).map(([stage, n]) => n > 0 && <span key={stage} className={`stage-${stage}`} style={{ flex: n }} title={`${stage}: ${n}`} />)}
        </div>
        <div className="legend">
          {Object.entries(s.byStage).map(([stage, n]) => (
            <span key={stage} className={`stage-${stage}`}><i className="dot" /> {stage} <b>{n}</b></span>
          ))}
        </div>
      </section>

      <div className="grid2">
        <section className="card panel">
          <h2>Hiring funnel</h2>
          <div className="bars">
            {Object.entries(s.funnel).map(([stage, n]) => (
              <Bar key={stage} className={`stage-${stage}`} label={stage} value={n} max={s.funnel.Applied} note={`${s.funnel.Applied ? Math.round((n / s.funnel.Applied) * 100) : 0}%`} />
            ))}
          </div>
          <p className="muted small foot">Candidates who ever reached each stage, as a share of all applicants.</p>
        </section>

        <section className="card panel">
          <h2>Recent activity</h2>
          <ul className="activity">
            {s.recent.map((r) => (
              <li key={`${r.id}-${r.stage}-${r.at}`}>
                <button onClick={() => onOpen(r.id)}>
                  <Avatar name={r.name} />
                  <span className="grow">
                    <strong>{r.name}</strong> {r.stage === 'Applied' ? 'applied' : 'moved to'} {r.stage !== 'Applied' && <Badge stage={r.stage} />}
                    <span className="muted small">{r.position}</span>
                  </span>
                  <span className="muted small">{ago(r.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card panel">
          <h2>Candidates by source</h2>
          <div className="bars">
            {sources.map(([src, n]) => <Bar key={src} label={src} value={n} max={sources[0][1]} />)}
          </div>
        </section>

        <section className="card panel">
          <h2>Candidates by position</h2>
          <div className="bars">
            {positions.map(([pos, n]) => <Bar key={pos} label={pos} value={n} max={positions[0][1]} />)}
          </div>
        </section>
      </div>
    </>
  );
}
