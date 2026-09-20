import { randomUUID } from "node:crypto";
import type { UserRecord, UserStore } from "./types.js";

export class MemoryUserStore implements UserStore {
  private readonly users = new Map<string, UserRecord>();

  async create(nickname: string): Promise<UserRecord> {
    const user = { id: randomUUID(), nickname };
    this.users.set(user.id, user);
    return user;
  }

  async get(id: string): Promise<UserRecord | undefined> {
    return this.users.get(id);
  }
}
