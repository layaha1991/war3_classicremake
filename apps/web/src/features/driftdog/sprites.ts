export type Facing = "down" | "left" | "right" | "up";

export const SPRITES = {
  playerKey: "player-walk",
  playerPath: "/driftdog/player-walk.png",
  dogKey: "dog-walk",
  dogPath: "/driftdog/dog-walk.png",
  frameSize: 128,
  columns: 4,
  rows: 4,
  framesPerDir: 4,
  fps: 8,
  playerDisplay: 96,
  dogDisplay: 120,
} as const;

export function facingFromHeading(heading: number): Facing {
  const tau = Math.PI * 2;
  const angle = ((heading % tau) + tau) % tau;
  if (angle >= (Math.PI * 7) / 4 || angle < Math.PI / 4) {
    return "right";
  }
  if (angle < (Math.PI * 3) / 4) {
    return "down";
  }
  if (angle < (Math.PI * 5) / 4) {
    return "left";
  }
  return "up";
}

export function facingRow(facing: Facing, sheet: "player" | "dog" = "player"): number {
  if (facing === "down") {
    return 0;
  }
  if (facing === "up") {
    return 3;
  }
  if (sheet === "dog") {
    return facing === "left" ? 1 : 2;
  }
  return 1;
}

export function shouldFlipX(facing: Facing, sheet: "player" | "dog" = "player"): boolean {
  return sheet === "player" && facing === "right";
}

export function walkFrame(elapsedMs: number, moving: boolean, frames = SPRITES.framesPerDir, fps = SPRITES.fps): number {
  if (!moving) {
    return 0;
  }
  return Math.floor((elapsedMs / 1000) * fps) % frames;
}

export function spriteFrameIndex(
  heading: number,
  elapsedMs: number,
  moving: boolean,
  sheet: "player" | "dog" = "player",
): number {
  return facingRow(facingFromHeading(heading), sheet) * SPRITES.columns + walkFrame(elapsedMs, moving);
}

export function ripplePulse(elapsedMs: number): { scale: number; alpha: number } {
  const t = (elapsedMs % 900) / 900;
  return {
    scale: 1 + t * 1.8,
    alpha: 0.58 * (1 - t),
  };
}

export function isMoving(vx: number, vy: number): boolean {
  return Math.hypot(vx, vy) > 12;
}
