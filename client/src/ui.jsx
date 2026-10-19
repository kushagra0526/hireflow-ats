import { initials } from './api.js';

export const PageHead = ({ kicker, title, children }) => (
  <header className="page-head">
    {kicker && <p className="kicker">{kicker}</p>}
    <h1>{title}</h1>
    {children && <p className="lede">{children}</p>}
  </header>
);

export const StageMark = ({ stage }) => <span className={`stage-mark stage-${stage}`}>{stage}</span>;

export const Monogram = ({ name, large }) => (
  <span className={`monogram${large ? ' lg' : ''}`} aria-hidden="true">{initials(name)}</span>
);

export function Pips({ value = 0, onChange }) {
  if (!onChange) {
    return (
      <span className="pips" role="img" aria-label={value ? `Rated ${value} of 5` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? 'on' : ''} />)}
      </span>
    );
  }
  return (
    <span className="pips edit" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} aria-label={`${n} of 5`} aria-pressed={n === value} onClick={() => onChange(n === value ? 0 : n)} />
      ))}
      <span className="pips-label">{value ? `${value}/5` : 'Not rated'}</span>
    </span>
  );
}

// wraps every case-insensitive match of q in <mark>; split() with a capture group puts matches at odd indexes
export function Highlight({ text = '', q = '' }) {
  const needle = q.trim();
  if (!needle) return text;
  return text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}
