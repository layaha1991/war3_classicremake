import type { SessionStore } from "./types.js";

export class MemorySessionStore implements SessionStore {
  private readonly refresh = new Map<string, string>();

  async saveRefresh(jti: string, userId: string): Promise<void> {
    this.refresh.set(jti, userId);
  }

  async consumeRefresh(jti: string): Promise<string | undefined> {
    const userId = this.refresh.get(jti);
    this.refresh.delete(jti);
    return userId;
  }
}
