import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../infra/config.js";
import type { TokenService } from "./token-service.js";
import type { SessionStore, UserStore } from "./types.js";

function parseNickname(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const nickname = input.trim();
  if (nickname.length < 1 || nickname.length > 16) {
    return undefined;
  }
  return nickname;
}

export function registerGuestRoutes(
  app: FastifyInstance,
  deps: {
    config: AppConfig;
    users: UserStore;
    sessions: SessionStore;
    tokens: TokenService;
  },
): void {
  const cookieBase = {
    httpOnly: true,
    secure: deps.config.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };

  const setAuthCookies = async (
    reply: { setCookie: (name: string, value: string, opts: object) => unknown },
    identity: { id: string; nickname: string },
  ) => {
    const pair = await deps.tokens.issue({ sub: identity.id, nickname: identity.nickname }, deps.sessions);
    reply.setCookie(deps.config.accessCookieName, pair.accessToken, {
      ...cookieBase,
      maxAge: deps.config.jwtAccessTtlSec,
    });
    reply.setCookie(deps.config.refreshCookieName, pair.refreshToken, {
      ...cookieBase,
      maxAge: deps.config.jwtRefreshTtlSec,
    });
  };

  app.post("/api/auth/guest", async (request, reply) => {
    const body = request.body as { nickname?: unknown };
    const nickname = parseNickname(body?.nickname);
    if (!nickname) {
      return reply.code(400).send({ error: "invalid nickname" });
    }
    const user = await deps.users.create(nickname);
    await setAuthCookies(reply, user);
    return reply.code(204).send();
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const refresh = request.cookies[deps.config.refreshCookieName];
    if (!refresh) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    try {
      const pair = await deps.tokens.rotateRefresh(refresh, deps.sessions);
      reply.setCookie(deps.config.accessCookieName, pair.accessToken, {
        ...cookieBase,
        maxAge: deps.config.jwtAccessTtlSec,
      });
      reply.setCookie(deps.config.refreshCookieName, pair.refreshToken, {
        ...cookieBase,
        maxAge: deps.config.jwtRefreshTtlSec,
      });
      return reply.code(204).send();
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });
}
