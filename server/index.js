import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';
import { seedIfEmpty } from './seed.js';

const prod = process.env.NODE_ENV === 'production';
const clientDir = fileURLToPath(new URL('../client', import.meta.url));

let uri = process.env.MONGODB_URI;
if (!uri) {
  if (prod) throw new Error('MONGODB_URI is required in production');
  const { MongoMemoryServer } = await import('mongodb-memory-server-core');
  uri = (await MongoMemoryServer.create()).getUri();
  console.log('No MONGODB_URI set: using a throwaway in-memory MongoDB (data resets on restart)');
}
await mongoose.connect(uri);
await seedIfEmpty();

if (prod) {
  app.use(express.static(`${clientDir}/dist`));
} else {
  const { createServer } = await import('vite');
  app.use((await createServer({ root: clientDir, server: { middlewareMode: true }, appType: 'spa' })).middlewares);
}

const port = process.env.PORT || 5000;
app.listen(port, (err) => {
  if (err) throw err; // e.g. EADDRINUSE: Express 5 reports listen errors here, not as an event
  console.log(`HireFlow ATS running on http://localhost:${port}`);
});
