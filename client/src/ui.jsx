import { initials } from './api.js';

const hue = (name) => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

export const Badge = ({ stage }) => <span className={`badge stage-${stage}`}>{stage}</span>;

export const Avatar = ({ name }) => (
  <span className="avatar" aria-hidden="true" style={{ '--h': hue(name) }}>
    {initials(name)}
  </span>
);

export function Stars({ value = 0, onChange }) {
  if (!onChange) {
    return (
      <span className="stars" role="img" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? 'on' : ''}>★</span>)}
      </span>
    );
  }
  return (
    <span className="stars edit" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} aria-label={`${n} out of 5`} aria-pressed={n <= value} onClick={() => onChange(n === value ? 0 : n)}>
          ★
        </button>
      ))}
    </span>
  );
}
