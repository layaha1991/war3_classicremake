import { describe, expect, it } from "vitest";
import { MemorySessionStore } from "./memory-session-store.js";
import { TokenService } from "./token-service.js";

describe("TokenService", () => {
  const service = new TokenService({
    secret: "test-secret-at-least-32-characters-long",
    accessTtlSec: 15 * 60,
    refreshTtlSec: 7 * 24 * 3600,
  });

  it("issues a short-lived access token bound to the guest id", async () => {
    const tokens = await service.issue({ sub: "guest-1", nickname: "拓海" }, new MemorySessionStore());
    const access = await service.verifyAccess(tokens.accessToken);
    expect(access.sub).toBe("guest-1");
    expect(access.nickname).toBe("拓海");
  });

  it("rotates refresh tokens and rejects the previous one", async () => {
    const sessions = new MemorySessionStore();
    const first = await service.issue({ sub: "guest-1", nickname: "拓海" }, sessions);
    const rotated = await service.rotateRefresh(first.refreshToken, sessions);

    await expect(service.rotateRefresh(first.refreshToken, sessions)).rejects.toThrow(/refresh/i);
    const access = await service.verifyAccess(rotated.accessToken);
    expect(access.sub).toBe("guest-1");
  });
});
