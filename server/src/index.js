import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, pool } from './db.js';

import authRouter from './routes/auth.js';
import dungeonsRouter from './routes/dungeons.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/dungeons', dungeonsRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as is_alive');
    res.json({
      status: 'ok',
      service: 'study-dungeon-api',
      timestamp: new Date().toISOString(),
      database: rows[0].is_alive === 1 ? 'connected' : 'unknown',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database health check failed',
      error: err.message,
    });
  }
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
    await initDatabase();
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
