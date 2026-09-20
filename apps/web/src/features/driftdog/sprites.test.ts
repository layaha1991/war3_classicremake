import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPRITES, facingFromCompassDeg, facingFromHeading, facingFromMotion, facingRow, ripplePulse, shouldFlipX, walkFrame } from "./sprites.js";

describe("2d sprite helpers", () => {
  it("maps 360° compass with 0 at the top into four walk directions", () => {
    expect(facingFromCompassDeg(0)).toBe("up");
    expect(facingFromCompassDeg(-45)).toBe("up");
    expect(facingFromCompassDeg(44)).toBe("up");
    expect(facingFromCompassDeg(45)).toBe("right");
    expect(facingFromCompassDeg(90)).toBe("right");
    expect(facingFromCompassDeg(135)).toBe("down");
    expect(facingFromCompassDeg(180)).toBe("down");
    expect(facingFromCompassDeg(225)).toBe("left");
    expect(facingFromCompassDeg(270)).toBe("left");
    expect(facingFromCompassDeg(315)).toBe("up");
    expect(facingFromHeading(-Math.PI / 2)).toBe("up");
    expect(facingFromHeading(0)).toBe("right");
    expect(facingFromHeading(Math.PI / 2)).toBe("down");
    expect(facingFromHeading(Math.PI)).toBe("left");
    expect(facingFromMotion(0, 0, -80)).toBe("up");
    expect(facingFromMotion(Math.PI, 80, 0)).toBe("right");
    expect(facingFromMotion(0, 0, 0)).toBe("right");
    expect(facingRow("right", "player")).toBe(2);
    expect(facingRow("right", "dog")).toBe(2);
    expect(shouldFlipX("right", "player")).toBe(false);
    expect(shouldFlipX("right", "dog")).toBe(false);
  });

  it("advances walk frames only while moving", () => {
    expect(walkFrame(0, false)).toBe(0);
    expect(walkFrame(0, true)).toBe(0);
    expect(walkFrame(125, true, 4, 8)).toBe(1);
    expect(walkFrame(375, true, 4, 8)).toBe(3);
    expect(walkFrame(500, true, 4, 8)).toBe(0);
  });

  it("grows a holder ripple that fades out", () => {
    const start = ripplePulse(0);
    const mid = ripplePulse(450);
    expect(start.scale).toBeLessThan(mid.scale);
    expect(start.alpha).toBeGreaterThan(mid.alpha);
    expect(ripplePulse(900).alpha).toBeCloseTo(start.alpha);
  });

  it("ships player and dog walk sheets", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = resolve(here, "../../../public");
    expect(existsSync(resolve(publicDir, "driftdog/player-walk.png"))).toBe(true);
    expect(existsSync(resolve(publicDir, "driftdog/dog-walk.png"))).toBe(true);
    expect(SPRITES.playerDisplayWidth).toBe(192);
    expect(SPRITES.playerDisplayHeight).toBe(192);
    expect(SPRITES.dogDisplay).toBe(480);
  });
});
