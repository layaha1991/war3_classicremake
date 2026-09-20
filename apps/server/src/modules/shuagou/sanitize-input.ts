import type { PlayerInput } from "@war3/shared";

export function sanitizeInput(raw: unknown): PlayerInput {
  const message = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const facing = message.facing;
  const moveX = message.moveX;
  const moveY = message.moveY;
  return {
    up: message.up === true,
    down: message.down === true,
    left: message.left === true,
    right: message.right === true,
    ...(typeof moveX === "number" && Number.isFinite(moveX) ? { moveX: Math.min(1, Math.max(-1, moveX)) } : {}),
    ...(typeof moveY === "number" && Number.isFinite(moveY) ? { moveY: Math.min(1, Math.max(-1, moveY)) } : {}),
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

export function sanitizeHeading(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return raw;
}
