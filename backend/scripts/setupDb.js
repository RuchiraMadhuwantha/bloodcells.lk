/**
 * Idempotent database bootstrap / migration runner.
 *
 *   cd backend && npm run db:setup
 *
 * It NEVER drops, truncates or recreates the database. It only:
 *   1. creates the database named in DB_NAME when it is missing,
 *   2. runs every statement in database/schema.sql (all CREATE TABLE IF NOT EXISTS),
 *   3. adds columns that were introduced after a table was first created
 *      (MySQL has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so we check
 *      information_schema first).
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'nbts';

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

// Columns added after the original release. `{ table, column, definition }`.
const ADDED_COLUMNS = [
  {
    table: 'hospitals',
    column: 'rejection_reason',
    definition: 'VARCHAR(500) NULL',
  },
  {
    table: 'hospitals',
    column: 'reviewed_at',
    definition: 'DATETIME NULL',
  },
  {
    table: 'hospitals',
    column: 'reviewed_by_user_id',
    definition: 'INT UNSIGNED NULL',
  },
];

const splitStatements = (sql) =>
  sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  return Number(rows[0].cnt) > 0;
};

async function main() {
  const bootstrap = await mysql.createConnection(connectionConfig);

  console.log(`[db:setup] ensuring database \`${DB_NAME}\` exists…`);
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  const conn = await mysql.createConnection({ ...connectionConfig, database: DB_NAME });

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log(`[db:setup] applying ${schemaPath}…`);
  for (const statement of splitStatements(schema)) {
    if (/^USE\s/i.test(statement)) continue; // never switch away from DB_NAME
    try {
      await conn.query(statement);
    } catch (error) {
      console.error(`[db:setup] statement failed:\n${statement}\n  -> ${error.message}`);
      throw error;
    }
  }

  for (const { table, column, definition } of ADDED_COLUMNS) {
    const exists = await columnExists(conn, table, column);
    if (exists) continue;
    console.log(`[db:setup] adding column ${table}.${column}…`);
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`[db:setup] done. tables in ${DB_NAME}: ${tables.map((t) => Object.values(t)[0]).join(', ')}`);

  await conn.end();
}

main().catch((error) => {
  console.error('[db:setup] FAILED:', error.message);
  process.exit(1);
});
