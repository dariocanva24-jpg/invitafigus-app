const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FILE_PATH = path.join(__dirname, '..', 'data', 'panels.json');
const usePostgres = process.env.STORE !== 'file' && Boolean(process.env.DATABASE_URL);

let pool = null;
if (usePostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
  });
}

async function ensureSchema() {
  if (!usePostgres) {
    await fs.promises.mkdir(path.dirname(FILE_PATH), { recursive: true });
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panels (
      code TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

const newKey = () => crypto.randomBytes(9).toString('base64url');

async function readFile() {
  try { return JSON.parse(await fs.promises.readFile(FILE_PATH, 'utf8')); }
  catch { return []; }
}

async function writeFile(rows) {
  await fs.promises.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.promises.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), 'utf8');
}

// Devuelve siempre la misma clave para el mismo código (idempotente).
async function issue(code) {
  if (!/^[a-z0-9-]{3,120}$/i.test(String(code || ''))) throw new Error('Código inválido');
  if (usePostgres) {
    const found = await pool.query('SELECT key FROM panels WHERE code=$1', [code]);
    if (found.rows.length) return { code, key: found.rows[0].key };
    const key = newKey();
    await pool.query('INSERT INTO panels (code, key) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING', [code, key]);
    const again = await pool.query('SELECT key FROM panels WHERE code=$1', [code]);
    return { code, key: again.rows[0].key };
  }
  const rows = await readFile();
  const existing = rows.find((row) => row.code === code);
  if (existing) return { code, key: existing.key };
  const key = newKey();
  rows.push({ code, key, createdAt: new Date().toISOString() });
  await writeFile(rows);
  return { code, key };
}

async function verify(code, key) {
  if (!code || !key) return false;
  const stored = usePostgres
    ? (await pool.query('SELECT key FROM panels WHERE code=$1', [code])).rows[0]?.key
    : (await readFile()).find((row) => row.code === code)?.key;
  if (!stored) return false;
  const a = Buffer.from(String(key));
  const b = Buffer.from(String(stored));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { ensureSchema, issue, verify };
