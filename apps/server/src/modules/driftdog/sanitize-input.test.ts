import { describe, expect, it } from "vitest";
import { sanitizeInput } from "./sanitize-input.js";

describe("sanitizeInput", () => {
  it("keeps only movement flags and finite facing, never coordinates", () => {
    expect(
      sanitizeInput({
        up: true,
        down: "yes",
        left: 1,
        right: false,
        facing: 1.25,
        x: 999,
        y: 999,
        vx: 40,
      }),
    ).toEqual({
      up: true,
      down: false,
      left: false,
      right: false,
      facing: 1.25,
    });
  });

  it("rejects non-finite facing", () => {
    expect(sanitizeInput({ facing: Number.NaN })).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
  });
});
