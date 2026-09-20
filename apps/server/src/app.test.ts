import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./infra/config.js";
import { createLogger } from "./infra/logging.js";
import { MemoryRoomStore } from "./modules/lobby/memory-room-store.js";
import { MemorySessionStore } from "./modules/auth/memory-session-store.js";
import { MemoryUserStore } from "./modules/auth/memory-user-store.js";

const config = loadConfig({
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-at-least-32-characters-long",
  DATABASE_URL: "postgres://war3:war3@localhost/war3",
  REDIS_URL: "redis://localhost:6379",
});

function cookieHeader(app: FastifyInstance, response: { cookies: { name: string; value: string }[] }): string {
  return response.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function createGuestApp() {
  const app = await buildApp({
    config,
    logger: createLogger({ destination: { write() {} } }),
    stores: {
      users: new MemoryUserStore(),
      sessions: new MemorySessionStore(),
      rooms: new MemoryRoomStore(),
    },
  });
  return app;
}

describe("guest lobby API", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("rejects an empty nickname", async () => {
    app = await createGuestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "  " },
    });
    expect(response.statusCode).toBe(400);
  });

  it("sets httpOnly JWTs and never returns tokens in the body", async () => {
    app = await createGuestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "拓海" },
    });

    expect(response.statusCode).toBe(204);
    expect(response.json).toThrow;
    const names = response.cookies.map((cookie) => cookie.name);
    expect(names).toEqual(expect.arrayContaining([config.accessCookieName, config.refreshCookieName]));
    for (const cookie of response.cookies) {
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.value).not.toContain(" ");
    }
    expect(response.body).toBe("");
  });

  it("refuses room creation without a guest session", async () => {
    app = await createGuestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mapId: "shuagou" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("refuses unimplemented maps even for a signed-in guest", async () => {
    app = await createGuestApp();
    const guest = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "拓海" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/rooms",
      headers: { cookie: cookieHeader(app, guest) },
      payload: { mapId: "haoren-td" },
    });
    expect(response.statusCode).toBe(403);
  });

  it("creates a room owned by the cookie identity, not a client-supplied user id", async () => {
    app = await createGuestApp();
    const guest = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "拓海" },
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/rooms",
      headers: { cookie: cookieHeader(app, guest) },
      payload: { mapId: "shuagou", ownerId: "somebody-else" },
    });

    expect(created.statusCode).toBe(201);
    const { roomCode } = created.json();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    const lookedUp = await app.inject({ method: "GET", url: `/api/rooms/${roomCode}` });
    expect(lookedUp.statusCode).toBe(200);
    expect(lookedUp.json()).toEqual({
      mapId: "shuagou",
      status: "lobby",
      playerCount: 0,
    });
    expect(lookedUp.json()).not.toHaveProperty("ownerId");
  });

  it("lists live rooms without a guest cookie", async () => {
    app = await createGuestApp();
    const response = await app.inject({ method: "GET", url: "/api/rooms" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ rooms: [] });
  });

  it("does not leak other rooms when the code is unknown", async () => {
    app = await createGuestApp();
    const response = await app.inject({ method: "GET", url: "/api/rooms/ZZZZZZ" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).not.toHaveProperty("rooms");
  });

  it("lets only the owning guest close a room", async () => {
    app = await createGuestApp();
    const owner = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "拓海" },
    });
    const stranger = await app.inject({
      method: "POST",
      url: "/api/auth/guest",
      payload: { nickname: "武" },
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/rooms",
      headers: { cookie: cookieHeader(app, owner) },
      payload: { mapId: "shuagou" },
    });
    const { roomCode } = created.json();

    const forbidden = await app.inject({
      method: "DELETE",
      url: `/api/rooms/${roomCode}`,
      headers: { cookie: cookieHeader(app, stranger) },
    });
    expect(forbidden.statusCode).toBe(403);

    const allowed = await app.inject({
      method: "DELETE",
      url: `/api/rooms/${roomCode}`,
      headers: { cookie: cookieHeader(app, owner) },
    });
    expect(allowed.statusCode).toBe(204);

    const missing = await app.inject({ method: "GET", url: `/api/rooms/${roomCode}` });
    expect(missing.statusCode).toBe(404);
  });
});
