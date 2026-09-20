import type { Room } from "@colyseus/sdk";

let joined: Room | undefined;

export function setJoinedRoom(room: Room): void {
  joined = room;
}

export function takeJoinedRoom(): Room {
  if (!joined) {
    throw new Error("missing joined room");
  }
  return joined;
}
