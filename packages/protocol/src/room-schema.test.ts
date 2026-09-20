import { describe, expect, it } from "vitest";
import { ROOM_PHASES, ROOM_STATE_FIELDS } from "./room-schema.js";

describe("Colyseus room contract", () => {
  it("lists the required authoritative state fields", () => {
    expect(ROOM_STATE_FIELDS).toEqual(
      expect.arrayContaining(["phase", "players", "ball", "timer", "dog"]),
    );
  });

  it("only allows lobby, playing, and ended phases", () => {
    expect(ROOM_PHASES).toEqual(["lobby", "playing", "ended"]);
  });
});
