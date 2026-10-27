import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'study_user',
  password: process.env.DB_PASSWORD || 'study_pass',
  database: process.env.DB_NAME || 'study_dungeon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

/**
 * Initialize database schema if tables do not exist
 */
export async function initDatabase() {
  try {
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      const connection = await pool.getConnection();
      try {
        await connection.query(sql);
        console.log('Database schema successfully initialized.');
      } finally {
        connection.release();
      }
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err.message);
    throw err;
  }
}

/**
 * Safe parameterized query execution helper
 */
export async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}
