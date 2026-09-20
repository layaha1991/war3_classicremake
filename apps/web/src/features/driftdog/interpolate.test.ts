import { describe, expect, it } from "vitest";
import { interpolateEntity, lerp } from "./interpolate.js";

describe("interpolation", () => {
  it("lerps scalars and entity poses", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(interpolateEntity({ x: 0, y: 0, heading: 0 }, { x: 10, y: 20, heading: 2 }, 0.5)).toEqual({
      x: 5,
      y: 10,
      heading: 1,
    });
  });
});
