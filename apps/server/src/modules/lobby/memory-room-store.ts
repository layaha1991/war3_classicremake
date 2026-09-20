import type { RoomRecord, RoomStore } from "./types.js";

export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomRecord>();

  async create(room: RoomRecord): Promise<void> {
    this.rooms.set(room.code, room);
  }

  async get(code: string): Promise<RoomRecord | undefined> {
    return this.rooms.get(code);
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code);
  }
}
