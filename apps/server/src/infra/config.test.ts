import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("config", () => {
  it("reads secrets from the environment, never from code defaults in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://war3:war3@db/war3",
        REDIS_URL: "redis://redis:6379",
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it("keeps access tokens short-lived", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      JWT_SECRET: "dev-secret",
      DATABASE_URL: "postgres://war3:war3@localhost/war3",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(config.jwtAccessTtlSec).toBe(15 * 60);
    expect(config.databaseUrl).toContain("postgres://");
    expect(config.redisUrl).toContain("redis://");
  });
});
