import { Client, type Room } from "@colyseus/sdk";

export function colyseusUrl(): string {
  if (import.meta.env.VITE_COLYSEUS_URL) {
    return import.meta.env.VITE_COLYSEUS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  if (window.location.port === "5173" || window.location.port === "4173") {
    return `${protocol}//${window.location.hostname}:2567`;
  }
  return `${protocol}//${window.location.host}`;
}

export function hasRoomState(state: unknown): boolean {
  if (!state || typeof state !== "object") {
    return false;
  }
  const room = state as { players?: unknown; ball?: unknown };
  return room.players !== undefined && room.ball !== undefined;
}

export function waitForRoomState(
  room: { state?: unknown; onStateChange: { once: (callback: () => void) => void } },
  timeoutMs = 8000,
): Promise<void> {
  if (hasRoomState(room.state)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("房間狀態逾時")), timeoutMs);
    room.onStateChange.once(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function newRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function joinDriftDog(
  roomCode: string,
  nickname: string,
  options: { fillBots?: boolean } = {},
): Promise<Room> {
  const client = new Client(colyseusUrl());
  const room = await client.joinOrCreate("driftdog", {
    roomCode,
    nickname,
    fillBots: options.fillBots !== false,
  });
  await waitForRoomState(room);
  return room;
}
