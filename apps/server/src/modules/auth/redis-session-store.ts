import type Redis from "ioredis";
import type { SessionStore } from "./types.js";

export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: Redis) {}

  async saveRefresh(jti: string, userId: string, ttlSec: number): Promise<void> {
    await this.redis.set(`refresh:${jti}`, userId, "EX", ttlSec);
  }

  async consumeRefresh(jti: string): Promise<string | undefined> {
    const userId = await this.redis.getdel(`refresh:${jti}`);
    return userId ?? undefined;
  }
}
