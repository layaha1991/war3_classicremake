import Phaser from "phaser";
import { ARENA } from "@war3/shared";
import type { Room } from "@colyseus/sdk";
import { ShuagouScene } from "../shuagou/game-scene.js";
import { setJoinedRoom } from "../shuagou/session.js";

export function bootGame(parent: HTMLElement, room: Room): Phaser.Game {
  setJoinedRoom(room);
  (window as unknown as { __shuagouRoom: Room }).__shuagouRoom = room;
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: ARENA.width,
    height: ARENA.height,
    backgroundColor: "#081c15",
    banner: false,
    scene: [ShuagouScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
  (window as unknown as { __shuagouGame: Phaser.Game }).__shuagouGame = game;
  return game;
}
