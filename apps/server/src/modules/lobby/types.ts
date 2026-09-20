import type { RoomPhase } from "@war3/protocol";

export interface RoomRecord {
  code: string;
  mapId: string;
  ownerId: string;
  status: RoomPhase;
  playerCount: number;
}

export interface RoomStore {
  create(room: RoomRecord): Promise<void>;
  get(code: string): Promise<RoomRecord | undefined>;
  delete(code: string): Promise<void>;
}

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
