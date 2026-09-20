import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { UserRecord, UserStore } from "./types.js";

export class PostgresUserStore implements UserStore {
  constructor(private readonly pool: Pool) {}

  async create(nickname: string): Promise<UserRecord> {
    const user = { id: randomUUID(), nickname };
    await this.pool.query("INSERT INTO users (id, nickname) VALUES ($1, $2)", [user.id, user.nickname]);
    return user;
  }

  async get(id: string): Promise<UserRecord | undefined> {
    const result = await this.pool.query<{ id: string; nickname: string }>(
      "SELECT id, nickname FROM users WHERE id = $1",
      [id],
    );
    return result.rows[0];
  }
}
