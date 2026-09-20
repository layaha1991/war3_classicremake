import Phaser from "phaser";
import { ARENA } from "@war3/shared";
import type { Room } from "@colyseus/sdk";
import { ShuagouScene } from "../shuagou/game-scene.js";

export function bootGame(parent: HTMLElement, room: Room): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ARENA.width,
    height: ARENA.height,
    backgroundColor: "#081c15",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
  game.scene.add("shuagou", ShuagouScene, true, { room });
  return game;
}
