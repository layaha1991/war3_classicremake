import { mountLobby } from "./features/lobby/lobby-screen.js";
import { joinDriftDog } from "./features/driftdog/net.js";
import { bootGame } from "./features/shell/boot-game.js";
import "./features/shell/styles.css";

const app = document.querySelector("#app");
if (!app) {
  throw new Error("#app missing");
}

mountLobby(app as HTMLElement, async (roomCode, nickname) => {
  const room = await joinDriftDog(roomCode, nickname);
  app.innerHTML = "";
  const gameRoot = document.createElement("div");
  gameRoot.id = "game";
  app.append(gameRoot);
  bootGame(gameRoot, room);
});
