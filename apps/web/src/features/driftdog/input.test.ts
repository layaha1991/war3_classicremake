import { describe, expect, it } from "vitest";
import {
  aimRay,
  facingForInput,
  readMoveInput,
  readVirtualStick,
  shouldPassOnRelease,
  sideForPointer,
} from "./input.js";

describe("virtual sticks", () => {
  it("keeps the left half for movement and the right half for aiming", () => {
    expect(sideForPointer(100, 800)).toBe("move");
    expect(sideForPointer(399, 800)).toBe("move");
    expect(sideForPointer(400, 800)).toBe("aim");
    expect(sideForPointer(720, 800)).toBe("aim");
  });

  it("ignores tiny drags inside the deadzone", () => {
    const stick = readVirtualStick({ x: 80, y: 80 }, { x: 84, y: 80 }, 80);
    expect(stick.active).toBe(false);
    expect(stick.x).toBe(0);
    expect(stick.y).toBe(0);
  });

  it("clamps analog movement to the stick rim and reports heading", () => {
    const stick = readVirtualStick({ x: 0, y: 0 }, { x: 200, y: 0 }, 80);
    expect(stick.active).toBe(true);
    expect(stick.x).toBeCloseTo(1);
    expect(stick.y).toBeCloseTo(0);
    expect(stick.magnitude).toBe(1);
    expect(stick.heading).toBeCloseTo(0);
    expect(readMoveInput(stick).moveX).toBeCloseTo(1);
    expect(readMoveInput(stick).moveY).toBeCloseTo(0);
    expect(readMoveInput(stick).facing).toBeUndefined();
  });

  it("locks facing only while the aim stick is held", () => {
    expect(facingForInput({ active: true, x: 0, y: -1, heading: -Math.PI / 2, magnitude: 1 })).toBeCloseTo(-Math.PI / 2);
    expect(facingForInput({ active: false, x: 0, y: 0, heading: 0, magnitude: 0 })).toBeUndefined();
    expect(readMoveInput(readVirtualStick({ x: 0, y: 0 }, { x: 0, y: -80 }, 80)).facing).toBeUndefined();
  });

  it("builds an aim ray from the holder along the stick heading", () => {
    const ray = aimRay({ x: 10, y: 20 }, 0, 100);
    expect(ray).toEqual({ x1: 10, y1: 20, x2: 110, y2: 20 });
  });

  it("passes only when the finger is up and the ray hits someone", () => {
    const aiming = readVirtualStick({ x: 0, y: 0 }, { x: 80, y: 0 }, 80);
    expect(shouldPassOnRelease(aiming, "p2")).toBe(true);
    expect(shouldPassOnRelease(aiming, undefined)).toBe(false);
    expect(shouldPassOnRelease(readVirtualStick({ x: 0, y: 0 }, null), "p2")).toBe(false);
  });
});
