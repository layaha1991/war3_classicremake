export const ROOM_STATE_FIELDS = [
  "phase",
  "players",
  "ball",
  "dog",
  "timer",
] as const;

export const ROOM_PHASES = ["lobby", "playing", "ended"] as const;

export type RoomPhase = (typeof ROOM_PHASES)[number];
export type RoomStateField = (typeof ROOM_STATE_FIELDS)[number];

export const ROOM_CLIENT_MESSAGES = ["input", "pass"] as const;
export type RoomClientMessage = (typeof ROOM_CLIENT_MESSAGES)[number];
