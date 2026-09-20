import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../../infra/config.js";
import type { TokenService } from "../auth/token-service.js";
import type { GuestIdentity } from "../auth/types.js";
import { HttpError } from "./types.js";
import type { RoomService } from "./room-service.js";

export function registerRoomRoutes(
  app: FastifyInstance,
  deps: {
    config: AppConfig;
    tokens: TokenService;
    rooms: RoomService;
  },
): void {
  const requireGuest = async (request: FastifyRequest, reply: FastifyReply): Promise<GuestIdentity | undefined> => {
    const token = request.cookies[deps.config.accessCookieName];
    if (!token) {
      reply.code(401).send({ error: "unauthorized" });
      return undefined;
    }
    try {
      const access = await deps.tokens.verifyAccess(token);
      return { id: access.sub, nickname: access.nickname };
    } catch {
      reply.code(401).send({ error: "unauthorized" });
      return undefined;
    }
  };

  app.post("/api/rooms", async (request, reply) => {
    const guest = await requireGuest(request, reply);
    if (!guest) {
      return;
    }
    const mapId = (request.body as { mapId?: unknown })?.mapId;
    if (typeof mapId !== "string") {
      return reply.code(400).send({ error: "invalid mapId" });
    }
    try {
      const room = await deps.rooms.create(guest.id, mapId);
      return reply.code(201).send({ roomCode: room.code });
    } catch (error) {
      if (error instanceof HttpError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get("/api/rooms/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    try {
      return await deps.rooms.getPublic(code);
    } catch (error) {
      if (error instanceof HttpError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.delete("/api/rooms/:code", async (request, reply) => {
    const guest = await requireGuest(request, reply);
    if (!guest) {
      return;
    }
    const { code } = request.params as { code: string };
    try {
      await deps.rooms.close(guest.id, code);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof HttpError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });
}
