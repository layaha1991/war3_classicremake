import type { Pool } from "pg";
import type { RoomPhase } from "@war3/protocol";
import type { RoomRecord, RoomStore } from "./types.js";

export class PostgresRoomStore implements RoomStore {
  constructor(private readonly pool: Pool) {}

  async create(room: RoomRecord): Promise<void> {
    await this.pool.query(
      "INSERT INTO rooms (code, map_id, owner_id, status, player_count) VALUES ($1, $2, $3, $4, $5)",
      [room.code, room.mapId, room.ownerId, room.status, room.playerCount],
    );
  }

  async get(code: string): Promise<RoomRecord | undefined> {
    const result = await this.pool.query<{
      code: string;
      map_id: string;
      owner_id: string;
      status: RoomPhase;
      player_count: number;
    }>("SELECT code, map_id, owner_id, status, player_count FROM rooms WHERE code = $1", [code]);
    const row = result.rows[0];
    if (!row) {
      return undefined;
    }
    return {
      code: row.code,
      mapId: row.map_id,
      ownerId: row.owner_id,
      status: row.status,
      playerCount: row.player_count,
    };
  }

  async delete(code: string): Promise<void> {
    await this.pool.query("DELETE FROM rooms WHERE code = $1", [code]);
  }
}
