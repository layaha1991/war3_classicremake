export const ROOM_STATE_FIELDS = [
  "phase",
  "players",
  "ball",
  "timer",
  "scoreToWin",
] as const;

export const ROOM_PHASES = ["lobby", "playing", "ended"] as const;

export type RoomPhase = (typeof ROOM_PHASES)[number];
export type RoomStateField = (typeof ROOM_STATE_FIELDS)[number];

export const ROOM_CLIENT_MESSAGES = ["input", "throw", "blink"] as const;
export type RoomClientMessage = (typeof ROOM_CLIENT_MESSAGES)[number];
