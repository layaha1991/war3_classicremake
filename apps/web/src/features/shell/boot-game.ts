import Phaser from "phaser";
import { ARENA } from "@war3/shared";
import type { Room } from "@colyseus/sdk";
import { DriftDogScene } from "../driftdog/game-scene.js";
import { attachTouchPads } from "../driftdog/input.js";
import { setJoinedRoom } from "../driftdog/session.js";
import { wireEndOverlay } from "../driftdog/end-screen.js";

type WindowRefs = {
  __driftdogRoom?: Room;
  __driftdogPads?: ReturnType<typeof attachTouchPads>;
  __driftdogGame?: Phaser.Game;
  __driftdogCreated?: boolean;
};

function refs(): WindowRefs {
  return window as unknown as WindowRefs;
}

export function teardownGame(): void {
  const win = refs();
  win.__driftdogPads?.destroy();
  win.__driftdogGame?.destroy(true);
  win.__driftdogPads = undefined;
  win.__driftdogGame = undefined;
  win.__driftdogRoom = undefined;
  win.__driftdogCreated = undefined;
}

export function bootGame(parent: HTMLElement, room: Room, options: { onReturnLobby: () => void }): Phaser.Game {
  setJoinedRoom(room);
  const win = refs();
  win.__driftdogRoom = room;
  win.__driftdogPads = attachTouchPads(parent);

  const returnToLobby = (): void => {
    void room.leave();
    teardownGame();
    options.onReturnLobby();
  };

  const rotate = document.createElement("p");
  rotate.className = "rotate-hint";
  rotate.textContent = "請直向拿手機";
  parent.append(rotate);
  const back = document.createElement("button");
  back.type = "button";
  back.className = "ghost game-back";
  back.textContent = "← 返回";
  back.setAttribute("aria-label", "返回大廳");
  back.addEventListener("click", returnToLobby);
  parent.append(back);
  const addBot = document.createElement("button");
  addBot.type = "button";
  addBot.className = "ghost add-bot";
  addBot.textContent = "加 Bot";
  addBot.addEventListener("click", () => {
    room.send("addBot");
  });
  parent.append(addBot);
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
  win.__driftdogGame = game;
  wireEndOverlay(parent, room, {
    onRematch: () => room.send("rematch"),
    onLobby: returnToLobby,
  });
  return game;
}
