import { useEffect, useState } from 'react';
import { api, ago, plural } from './api.js';
import { PageHead, StageMark } from './ui.jsx';

// the report's headline reads the numbers back as a sentence
function headline(s) {
  if (!s.total) return 'No candidates yet. Add the first one to start your pipeline.';
  const hires = s.hired ? `${s.hired} hired, ${s.avgDaysToHire} days on average.` : 'No hires yet.';
  return `${plural(s.total, 'candidate')}, ${s.active} still in process. ${hires}`;
}

export default function Dashboard({ version, onOpen }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/stats').then(setS).catch((e) => setError(e.message));
  }, [version]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!s) return <p className="loading">Loading the report…</p>;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const funnel = Object.entries(s.funnel);
  const roles = Object.entries(s.byPosition).sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
  const sources = Object.entries(s.bySource).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHead kicker={`${today} · Hiring report`} title={headline(s)} />

      <dl className="stat-strip">
        <div><dt>Candidates</dt><dd><strong>{s.total}</strong><span>{s.newThisWeek} new this week</span></dd></div>
        <div><dt>In process</dt><dd><strong>{s.active}</strong><span>not hired or rejected</span></dd></div>
        <div><dt>Hired</dt><dd><strong>{s.hired}</strong><span>{s.hireRate}% of all applicants</span></dd></div>
        <div><dt>Rejected</dt><dd><strong>{s.rejected}</strong><span>{s.total ? Math.round((s.rejected / s.total) * 100) : 0}% of all applicants</span></dd></div>
        <div><dt>Time to hire</dt><dd><strong>{s.avgDaysToHire ?? '—'}{s.avgDaysToHire != null && <small>days</small>}</strong><span>application to hire, average</span></dd></div>
      </dl>

      <div className="report">
        <div className="report-main">
          <section>
            <h2 className="section-title">Funnel</h2>
            <p className="section-note">How many people ever reached each stage. The right column is the share of the stage before who moved on.</p>
            <ol className="funnel">
              {funnel.map(([stage, n], i) => {
                const prev = i ? funnel[i - 1][1] : 0;
                return (
                  <li key={stage} className={`stage-${stage}`}>
                    <span>{stage}</span>
                    <span className="bar" aria-hidden="true"><i style={{ width: `${s.funnel.Applied ? (n / s.funnel.Applied) * 100 : 0}%` }} /></span>
                    <span className="num">{n}</span>
                    <span className="num rate">{i === 0 ? '' : prev ? `${Math.round((n / prev) * 100)}%` : '—'}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <h2 className="section-title">Where everyone is now</h2>
            <div className="split-bar" role="img" aria-label={Object.entries(s.byStage).map(([k, v]) => `${k}: ${v}`).join(', ')}>
              {Object.entries(s.byStage).map(([stage, n]) => n > 0 && <span key={stage} className={`stage-${stage}`} style={{ flexGrow: n }} title={`${stage}: ${n}`} />)}
            </div>
            <ul className="split-legend">
              {Object.entries(s.byStage).map(([stage, n]) => <li key={stage}><StageMark stage={stage} /><span className="num">{n}</span></li>)}
            </ul>
          </section>

          <section>
            <h2 className="section-title">By role</h2>
            <table className="mini-table">
              <thead><tr><th scope="col">Role</th><th scope="col">In process</th><th scope="col">Hired</th><th scope="col">Total</th></tr></thead>
              <tbody>
                {roles.map(([role, r]) => (
                  <tr key={role}><th scope="row">{role}</th><td>{r.active}</td><td>{r.hired || '—'}</td><td>{r.total}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="report-side">
          <section>
            <h2 className="section-title">Latest moves</h2>
            <ol className="log">
              {s.recent.map((r) => (
                <li key={`${r.id}-${r.stage}-${r.at}`}>
                  <button onClick={() => onOpen(r.id)}>
                    <time dateTime={r.at}>{ago(r.at)}</time>
                    <span>
                      <strong>{r.name}</strong> {r.stage === 'Applied' ? <>applied for {r.position}</> : <>moved to <StageMark stage={r.stage} /></>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="section-title">Sources</h2>
            <ul className="sources">
              {sources.map(([src, n]) => (
                <li key={src}>
                  <span>{src}</span>
                  <span className="bar" aria-hidden="true"><i style={{ width: `${(n / sources[0][1]) * 100}%` }} /></span>
                  <span className="num">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
