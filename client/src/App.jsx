import { useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Pipeline from './Pipeline.jsx';
import Candidates from './Candidates.jsx';
import CandidateModal from './CandidateModal.jsx';

const PAGES = { dashboard: ['Dashboard', Dashboard], pipeline: ['Pipeline', Pipeline], candidates: ['Candidates', Candidates] };
const pageFromHash = () => (Object.hasOwn(PAGES, location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');

export default function App() {
  const [token, setTok] = useState(getToken);
  const [page, setPage] = useState(pageFromHash);
  const [meta, setMeta] = useState({ stages: [], sources: [], positions: [] });
  const [openId, setOpenId] = useState(null); // candidate id, 'new', or null
  const [version, setVersion] = useState(0); // bumped after every save so the open page refetches
  const [notice, setNotice] = useState('');
  const timer = useRef(null);

  const notify = (message) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 3500);
  };

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (token) api('/meta').then(setMeta).catch(console.error);
  }, [token, version]);

  useEffect(() => {
    document.title = token ? `${PAGES[page][0]} · HireFlow` : 'Sign in · HireFlow';
  }, [token, page]);

  if (!token) return <Login onLogin={(t) => { setToken(t); setTok(t); }} />;

  const Page = PAGES[page][1];
  return (
    <>
      <header className="masthead">
        <a href="#dashboard" className="wordmark">HireFlow</a>
        <nav aria-label="Main">
          {Object.entries(PAGES).map(([key, [label]]) => (
            <a key={key} href={`#${key}`} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
        <div className="masthead-actions">
          <button className="btn primary" onClick={() => setOpenId('new')}>Add candidate</button>
          <button className="btn-text" onClick={() => { setToken(null); setTok(null); }}>Log out</button>
        </div>
      </header>

      <main className="page">
        <Page meta={meta} version={version} onOpen={setOpenId} notify={notify} />
      </main>

      <div className="notice" role="status" aria-live="polite">{notice && <span key={notice}>{notice}</span>}</div>

      {openId && (
        <CandidateModal
          key={openId}
          id={openId}
          meta={meta}
          onClose={() => setOpenId(null)}
          onSaved={(message) => { setOpenId(null); setVersion((v) => v + 1); notify(message); }}
        />
      )}
    </>
  );
}
