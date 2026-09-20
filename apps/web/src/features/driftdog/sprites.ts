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
  playerDisplayWidth: 192,
  playerDisplayHeight: 192,
  dogDisplay: 400,
} as const;

/** Compass degrees: 0 is up / away from camera, clockwise. */
export function wrapDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function compassDegFromHeading(heading: number): number {
  return wrapDegrees((heading * 180) / Math.PI + 90);
}

export function facingFromCompassDeg(deg: number): Facing {
  const angle = wrapDegrees(deg);
  if (angle >= 315 || angle < 45) {
    return "up";
  }
  if (angle < 135) {
    return "right";
  }
  if (angle < 225) {
    return "down";
  }
  return "left";
}

export function facingFromHeading(heading: number): Facing {
  return facingFromCompassDeg(compassDegFromHeading(heading));
}

export function facingFromMotion(heading: number, vx: number, vy: number): Facing {
  if (isMoving(vx, vy)) {
    return facingFromHeading(Math.atan2(vy, vx));
  }
  return facingFromHeading(heading);
}

export function dogFacingFromHeading(heading: number): "left" | "right" {
  return Math.cos(heading) < 0 ? "left" : "right";
}

export function facingRow(facing: Facing, _sheet: "player" | "dog" = "player"): number {
  if (facing === "down") {
    return 0;
  }
  if (facing === "left") {
    return 1;
  }
  if (facing === "right") {
    return 2;
  }
  return 3;
}

export function shouldFlipX(_facing: Facing, _sheet: "player" | "dog" = "player"): boolean {
  return false;
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
  vx = 0,
  vy = 0,
): number {
  const angle = isMoving(vx, vy) ? Math.atan2(vy, vx) : heading;
  const facing = sheet === "dog" ? dogFacingFromHeading(angle) : facingFromMotion(heading, vx, vy);
  return facingRow(facing, sheet) * SPRITES.columns + walkFrame(elapsedMs, moving);
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
