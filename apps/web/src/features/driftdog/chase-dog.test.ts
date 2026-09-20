import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHASE_DOG, chaseDogAngle } from "./chase-dog.js";

describe("chase dog sprite", () => {
  it("loads the Warcraft-style wolf facing the movement heading", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const file = resolve(here, "../../../public", CHASE_DOG.path.replace(/^\//, ""));
    expect(existsSync(file)).toBe(true);
    expect(CHASE_DOG.key).toBe("chase-dog");
    expect(chaseDogAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2 - CHASE_DOG.headingOffset);
  });
});
