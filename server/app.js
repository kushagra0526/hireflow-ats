import express from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import Candidate, { STAGES, SOURCES } from './models/Candidate.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production');
const { JWT_SECRET = 'dev-secret', ADMIN_EMAIL = 'admin@hireflow.dev', ADMIN_PASSWORD = 'admin123' } = process.env;

const DAY = 86_400_000;
const FIELDS = ['name', 'email', 'phone', 'position', 'experience', 'skills', 'source', 'rating', 'resumeUrl', 'notes', 'stage', 'appliedAt'];
const SORTS = { newest: { appliedAt: -1 }, oldest: { appliedAt: 1 }, name: { name: 1 }, rating: { rating: -1, appliedAt: -1 } };

// whitelist body fields so clients cannot write history/_id/timestamps directly
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => Object.hasOwn(body ?? {}, k)).map((k) => [k, body[k]]));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
};
const tally = (list, key) => list.reduce((m, c) => ({ ...m, [c[key]]: (m[c[key]] ?? 0) + 1 }), {});

export const app = express();
app.use(express.json({ limit: '100kb' }));

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!safeEqual(String(email ?? '').trim().toLowerCase(), ADMIN_EMAIL.toLowerCase()) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: jwt.sign({ email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: '8h' }), email: ADMIN_EMAIL });
});

// everything below needs a valid token
app.use('/api', (req, res, next) => {
  try {
    req.user = jwt.verify(req.get('authorization')?.replace(/^Bearer /, '') ?? '', JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in again' });
  }
});

app.get('/api/meta', async (req, res) => {
  res.json({ stages: STAGES, sources: SOURCES, positions: (await Candidate.distinct('position')).sort() });
});

app.get('/api/candidates', async (req, res) => {
  const { q, stage, position, sort } = req.query;
  const filter = {};
  if (typeof q === 'string' && q.trim()) {
    const re = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ name: re }, { email: re }, { position: re }, { skills: re }];
  }
  if (STAGES.includes(stage)) filter.stage = stage;
  if (typeof position === 'string' && position) filter.position = position;
  res.json(await Candidate.find(filter).sort(Object.hasOwn(SORTS, sort) ? SORTS[sort] : SORTS.newest).lean());
});

app.post('/api/candidates', async (req, res) => {
  const data = pick(req.body);
  const candidate = await Candidate.create({ ...data, history: [{ stage: data.stage || 'Applied', at: data.appliedAt || new Date() }] });
  res.status(201).json(candidate);
});

app.get('/api/candidates/:id', async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  candidate ? res.json(candidate) : res.status(404).json({ error: 'Candidate not found' });
});

app.patch('/api/candidates/:id', async (req, res) => {
  const candidate = await Candidate.findById(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  const data = pick(req.body);
  if (data.stage && data.stage !== candidate.stage) candidate.history.push({ stage: data.stage });
  candidate.set(data);
  res.json(await candidate.save());
});

app.delete('/api/candidates/:id', async (req, res) => {
  const candidate = await Candidate.findByIdAndDelete(req.params.id);
  candidate ? res.status(204).end() : res.status(404).json({ error: 'Candidate not found' });
});

app.get('/api/stats', async (req, res) => {
  // shortcut: computes metrics in JS over every candidate, move to a Mongo aggregation past ~10k candidates
  const all = await Candidate.find().lean();
  const now = Date.now();
  const hired = all.filter((c) => c.stage === 'Hired');
  const hireDays = hired.map((c) => (new Date(c.history.findLast((h) => h.stage === 'Hired')?.at ?? c.updatedAt) - new Date(c.appliedAt)) / DAY);

  res.json({
    total: all.length,
    active: all.filter((c) => !['Hired', 'Rejected'].includes(c.stage)).length,
    hired: hired.length,
    rejected: all.filter((c) => c.stage === 'Rejected').length,
    newThisWeek: all.filter((c) => now - new Date(c.appliedAt) <= 7 * DAY).length,
    hireRate: all.length ? Math.round((hired.length / all.length) * 100) : 0,
    avgDaysToHire: hireDays.length ? Math.round((hireDays.reduce((a, b) => a + b, 0) / hireDays.length) * 10) / 10 : null,
    byStage: Object.fromEntries(STAGES.map((s) => [s, all.filter((c) => c.stage === s).length])),
    // funnel: how many candidates ever reached each stage
    funnel: Object.fromEntries(STAGES.slice(0, 5).map((s) => [s, all.filter((c) => c.history.some((h) => h.stage === s)).length])),
    bySource: tally(all, 'source'),
    byPosition: tally(all, 'position'),
    recent: all
      .flatMap((c) => c.history.map((h) => ({ id: c._id, name: c.name, position: c.position, stage: h.stage, at: h.at })))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8),
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ error: 'A candidate with this email already exists' });
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});
