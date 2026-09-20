import { Client, type Room } from "@colyseus/sdk";

export function colyseusUrl(): string {
  return import.meta.env.VITE_COLYSEUS_URL ?? `ws://${window.location.hostname}:2567`;
}

export async function joinShuagou(roomCode: string, nickname: string): Promise<Room> {
  const client = new Client(colyseusUrl());
  return client.joinOrCreate("shuagou", { roomCode, nickname });
}
