import { Client, type Room } from "@colyseus/sdk";

export function colyseusUrl(): string {
  if (import.meta.env.VITE_COLYSEUS_URL) {
    return import.meta.env.VITE_COLYSEUS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (window.location.port === "5173" || window.location.port === "4173") {
    return `${protocol}//${window.location.hostname}:2567`;
  }
  return `${protocol}//${window.location.host}`;
}

export function newRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function joinShuagou(roomCode: string, nickname: string): Promise<Room> {
  const client = new Client(colyseusUrl());
  return client.joinOrCreate("shuagou", { roomCode, nickname });
}
