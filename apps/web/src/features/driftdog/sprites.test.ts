import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { facingFromHeading, facingRow, ripplePulse, shouldFlipX, walkFrame } from "./sprites.js";

describe("2d sprite helpers", () => {
  it("maps heading into four walk directions", () => {
    expect(facingFromHeading(0)).toBe("right");
    expect(facingFromHeading(Math.PI / 2)).toBe("down");
    expect(facingFromHeading(Math.PI)).toBe("left");
    expect(facingFromHeading(-Math.PI / 2)).toBe("up");
    expect(facingRow("right", "dog")).toBe(2);
    expect(shouldFlipX("right", "player")).toBe(true);
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
  });
});
