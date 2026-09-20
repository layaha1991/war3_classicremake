import { describe, expect, it } from "vitest";
import { getMap, isImplementedMap, listMaps } from "./registry.js";

describe("map registry", () => {
  it("lists the three remake maps", () => {
    const ids = listMaps().map((map) => map.id);
    expect(ids).toEqual(
      expect.arrayContaining(["driftdog", "haoren-td", "element-td"]),
    );
  });

  it("marks only driftdog as implemented", () => {
    expect(getMap("driftdog")?.implemented).toBe(true);
    expect(getMap("haoren-td")?.implemented).toBe(false);
    expect(getMap("element-td")?.implemented).toBe(false);
    expect(isImplementedMap("driftdog")).toBe(true);
    expect(isImplementedMap("haoren-td")).toBe(false);
  });

  it("returns undefined for unknown map ids", () => {
    expect(getMap("unknown")).toBeUndefined();
    expect(isImplementedMap("unknown")).toBe(false);
  });

  it("caps driftdog at 8 players for the mvp", () => {
    expect(getMap("driftdog")?.minPlayers).toBe(2);
    expect(getMap("driftdog")?.maxPlayers).toBe(8);
  });
});
