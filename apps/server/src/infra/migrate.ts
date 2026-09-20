import type { Pool } from "pg";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      map_id TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      player_count INT NOT NULL DEFAULT 0
    );
  `);
}
