import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './db.js';

import authRouter from './routes/auth.js';
import dungeonsRouter from './routes/dungeons.js';
import runsRouter from './routes/runs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/dungeons', dungeonsRouter);
app.use('/api/runs', runsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isDbConnected ? 'ok' : 'degraded',
    service: 'study-dungeon-api',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Study Dungeon API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
