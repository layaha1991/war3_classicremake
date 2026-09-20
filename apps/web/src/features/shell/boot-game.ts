import Phaser from "phaser";
import { ARENA } from "@war3/shared";
import type { Room } from "@colyseus/sdk";
import { DriftDogScene } from "../driftdog/game-scene.js";
import { attachTouchPads } from "../driftdog/input.js";
import { setJoinedRoom } from "../driftdog/session.js";

export function bootGame(parent: HTMLElement, room: Room): Phaser.Game {
  setJoinedRoom(room);
  (window as unknown as { __driftdogRoom: Room }).__driftdogRoom = room;
  (window as unknown as { __driftdogPads: ReturnType<typeof attachTouchPads> }).__driftdogPads = attachTouchPads(parent);
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: ARENA.width,
    height: ARENA.height,
    backgroundColor: "#081c15",
    banner: false,
    scene: [DriftDogScene],
    input: {
      activePointers: 3,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
  (window as unknown as { __driftdogGame: Phaser.Game }).__driftdogGame = game;
  return game;
}
