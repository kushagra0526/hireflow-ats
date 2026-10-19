import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { app } from '../app.js';
import Candidate from '../models/Candidate.js';
import { buildSeed } from '../seed.js';

let mongo, server, base, token;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Candidate.init(); // builds the unique email index before the duplicate test
  await Candidate.insertMany(buildSeed());
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
});

async function call(path, { method = 'GET', body, auth = token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

test('login rejects bad credentials and returns a token for the admin', async () => {
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'admin@hireflow.dev', password: 'nope' } })).status, 401);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: ['x'], password: { $ne: 1 } } })).status, 401);
  const ok = await call('/auth/login', { method: 'POST', body: { email: ' Admin@HireFlow.dev ', password: 'admin123' } });
  assert.equal(ok.status, 200);
  token = ok.body.token;
});

test('API routes need a valid token', async () => {
  assert.equal((await call('/candidates', { auth: false })).status, 401);
  assert.equal((await call('/stats', { auth: 'garbage' })).status, 401);
});

let created;
test('creating a candidate validates input and starts the stage history', async () => {
  const missing = await call('/candidates', { method: 'POST', body: { email: 'a@b.co' } });
  assert.equal(missing.status, 400);
  assert.match(missing.body.error, /Name is required/);

  const badLink = await call('/candidates', { method: 'POST', body: { name: 'X', email: 'x@y.co', position: 'QA', resumeUrl: 'javascript:alert(1)' } });
  assert.equal(badLink.status, 400);

  const res = await call('/candidates', {
    method: 'POST',
    body: { name: 'Test Person', email: 'Test@Example.org', position: 'QA Engineer', skills: ['Playwright'], history: [{ stage: 'Hired' }] },
  });
  assert.equal(res.status, 201);
  created = res.body;
  assert.equal(created.stage, 'Applied');
  assert.equal(created.email, 'test@example.org');
  assert.deepEqual(created.history.map((h) => h.stage), ['Applied']); // client-sent history is ignored

  assert.equal((await call('/candidates', { method: 'POST', body: { name: 'Dup', email: 'TEST@example.org', position: 'QA' } })).status, 409);
});

test('changing stage appends to history, same stage does not', async () => {
  const moved = await call(`/candidates/${created._id}`, { method: 'PATCH', body: { stage: 'Interview' } });
  assert.equal(moved.status, 200);
  assert.deepEqual(moved.body.history.map((h) => h.stage), ['Applied', 'Interview']);

  const same = await call(`/candidates/${created._id}`, { method: 'PATCH', body: { stage: 'Interview', rating: 4 } });
  assert.equal(same.body.history.length, 2);
  assert.equal(same.body.rating, 4);

  assert.equal((await call(`/candidates/${created._id}`, { method: 'PATCH', body: { stage: 'Ghosted' } })).status, 400);
});

test('search matches name, email, position and skills; filters and sort work', async () => {
  const figma = await call('/candidates?q=figma');
  assert.deepEqual(figma.body.map((c) => c.name).sort(), ['Ananya Iyer', 'Ishita Banerjee', 'Neha Choudhary']);

  assert.equal((await call('/candidates?q=priya')).body[0].name, 'Priya Nair');
  assert.equal((await call('/candidates?q=playwright')).body[0].name, 'Test Person');
  assert.deepEqual((await call('/candidates?q=c%2B%2B(')).body, []); // regex characters are treated literally

  const hired = await call('/candidates?stage=Hired');
  assert.ok(hired.body.length > 0 && hired.body.every((c) => c.stage === 'Hired'));

  const both = await call('/candidates?stage=Interview&position=Frontend%20Engineer');
  assert.deepEqual(both.body.map((c) => c.name), ['Aarav Sharma']);

  const names = (await call('/candidates?sort=name')).body.map((c) => c.name);
  assert.deepEqual(names, [...names].sort());
  assert.equal((await call('/candidates?sort=constructor')).status, 200);
});

test('stats add up', async () => {
  const { body: s } = await call('/stats');
  const total = await Candidate.countDocuments();
  assert.equal(s.total, total);
  assert.equal(Object.values(s.byStage).reduce((a, b) => a + b, 0), total);
  assert.equal(s.funnel.Applied, total);
  assert.equal(s.hired, s.byStage.Hired);
  assert.equal(s.active, total - s.hired - s.rejected);
  assert.equal(s.hireRate, Math.round((s.hired / total) * 100));
  assert.ok(s.avgDaysToHire > 0);
  const roles = Object.values(s.byPosition);
  assert.equal(roles.reduce((a, r) => a + r.total, 0), total);
  assert.equal(roles.reduce((a, r) => a + r.hired, 0), s.hired);
  assert.equal(roles.reduce((a, r) => a + r.active, 0), s.active);
  assert.equal(s.recent.length, 8);
  assert.ok(new Date(s.recent[0].at) >= new Date(s.recent[7].at));
});

test('delete removes the candidate; bad ids and unknown routes are handled', async () => {
  assert.equal((await call(`/candidates/${created._id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await call(`/candidates/${created._id}`)).status, 404);
  assert.equal((await call('/candidates/not-an-id')).status, 400);
  assert.equal((await call('/nope')).status, 404);
});
