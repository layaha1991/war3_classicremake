export interface AppConfig {
  nodeEnv: string;
  port: number;
  publicWebOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtAccessTtlSec: number;
  jwtRefreshTtlSec: number;
  cookieSecure: boolean;
  accessCookieName: string;
  refreshCookieName: string;
}

export function loadConfig(env: NodeJS.Dict<string> = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const jwtSecret = env.JWT_SECRET;
  if (nodeEnv === "production" && (!jwtSecret || jwtSecret === "change-me-to-a-long-random-string")) {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }

  return {
    nodeEnv,
    port: Number(env.PORT ?? 2567),
    publicWebOrigin: env.PUBLIC_WEB_ORIGIN ?? "http://localhost:5173",
    databaseUrl: env.DATABASE_URL ?? "postgres://war3:war3@localhost:5432/war3",
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379",
    jwtSecret: jwtSecret ?? "dev-only-change-me",
    jwtAccessTtlSec: 15 * 60,
    jwtRefreshTtlSec: 7 * 24 * 3600,
    cookieSecure: env.COOKIE_SECURE === "true" || nodeEnv === "production",
    accessCookieName: "war3_access",
    refreshCookieName: "war3_refresh",
  };
}
