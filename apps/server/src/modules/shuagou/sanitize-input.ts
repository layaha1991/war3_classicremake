import type { PlayerInput } from "@war3/shared";

export function sanitizeInput(raw: unknown): PlayerInput {
  const message = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const facing = message.facing;
  return {
    up: message.up === true,
    down: message.down === true,
    left: message.left === true,
    right: message.right === true,
    ...(typeof facing === "number" && Number.isFinite(facing) ? { facing } : {}),
  };
}

export function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== "string") {
    return "訪客";
  }
  const nickname = raw.trim().slice(0, 16);
  return nickname.length > 0 ? nickname : "訪客";
}
