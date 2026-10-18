import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Pipeline from './Pipeline.jsx';
import Candidates from './Candidates.jsx';
import CandidateModal from './CandidateModal.jsx';

const icon = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    {children}
  </svg>
);

const PAGES = {
  dashboard: ['Dashboard', Dashboard, icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>)],
  pipeline: ['Pipeline', Pipeline, icon(<><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></>)],
  candidates: ['Candidates', Candidates, icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2" /></>)],
};
const pageFromHash = () => (Object.hasOwn(PAGES, location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');

export default function App() {
  const [token, setTok] = useState(getToken);
  const [page, setPage] = useState(pageFromHash);
  const [meta, setMeta] = useState({ stages: [], sources: [], positions: [] });
  const [openId, setOpenId] = useState(null); // candidate id, 'new', or null
  const [version, setVersion] = useState(0); // bumped after every save so the open page refetches

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (token) api('/meta').then(setMeta).catch(console.error);
  }, [token, version]);

  if (!token) return <Login onLogin={(t) => { setToken(t); setTok(t); }} />;

  const [title, Page] = PAGES[page];
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="logo">H</span> HireFlow</div>
        <nav aria-label="Main">
          {Object.entries(PAGES).map(([key, [label, , svg]]) => (
            <a key={key} href={`#${key}`} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined}>
              {svg} {label}
            </a>
          ))}
        </nav>
        <button className="link logout" onClick={() => { setToken(null); setTok(null); }}>Log out</button>
      </aside>
      <main>
        <header className="topbar">
          <h1>{title}</h1>
          <button className="btn primary" onClick={() => setOpenId('new')}>+ Add candidate</button>
        </header>
        <Page meta={meta} version={version} onOpen={setOpenId} />
      </main>
      {openId && (
        <CandidateModal key={openId} id={openId} meta={meta} onClose={() => setOpenId(null)} onSaved={() => { setOpenId(null); setVersion((v) => v + 1); }} />
      )}
    </div>
  );
}
