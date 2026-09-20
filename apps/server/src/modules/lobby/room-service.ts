import { randomBytes } from "node:crypto";
import { isImplementedMap } from "@war3/shared";
import { HttpError, type RoomRecord, type RoomStore } from "./types.js";

export class RoomService {
  constructor(private readonly rooms: RoomStore) {}

  async create(ownerId: string, mapId: string): Promise<RoomRecord> {
    if (!isImplementedMap(mapId)) {
      throw new HttpError(403, "map is not implemented");
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join("");
      if (await this.rooms.get(code)) {
        continue;
      }
      const room: RoomRecord = {
        code,
        mapId,
        ownerId,
        status: "lobby",
        playerCount: 0,
      };
      await this.rooms.create(room);
      return room;
    }
    throw new HttpError(500, "could not allocate room code");
  }

  async getPublic(code: string): Promise<Pick<RoomRecord, "mapId" | "status" | "playerCount">> {
    const room = await this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new HttpError(404, "room not found");
    }
    return {
      mapId: room.mapId,
      status: room.status,
      playerCount: room.playerCount,
    };
  }

  async close(actorId: string, code: string): Promise<void> {
    const room = await this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new HttpError(404, "room not found");
    }
    if (room.ownerId !== actorId) {
      throw new HttpError(403, "not the room owner");
    }
    await this.rooms.delete(room.code);
  }
}
