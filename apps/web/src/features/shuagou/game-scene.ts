import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import { ARENA, DT } from "@war3/shared";
import { interpolateEntity } from "./interpolate.js";
import { readKeyboardInput } from "./input.js";
import { predictLocal } from "./predict.js";

interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  heading: number;
  hasBall: boolean;
  score: number;
}

interface RemoteBall {
  x: number;
  y: number;
  ownerId: string;
}

const DOG_COLORS = [0xf4d35e, 0xee964b, 0xf95738, 0x0d3b66, 0x28afb0, 0x9b5de5, 0x00bbf9, 0xfee440];

export class ShuagouScene extends Phaser.Scene {
  private room!: Room;
  private localId = "";
  private dogs = new Map<string, Phaser.GameObjects.Arc>();
  private names = new Map<string, Phaser.GameObjects.Text>();
  private ball?: Phaser.GameObjects.Arc;
  private previous = new Map<string, RemotePlayer>();
  private current = new Map<string, RemotePlayer>();
  private previousBall: RemoteBall = { x: ARENA.width / 2, y: ARENA.height / 2, ownerId: "" };
  private currentBall: RemoteBall = { x: ARENA.width / 2, y: ARENA.height / 2, ownerId: "" };
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  constructor() {
    super("shuagou");
  }

  init(data: { room: Room }): void {
    this.room = data.room;
    this.localId = data.room.sessionId;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1b4332");
    this.add.rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width - 40, ARENA.height - 40, 0x2d6a4f);
    this.add.circle(ARENA.width / 2, ARENA.height / 2, 70, 0x40916c, 0.35);
    this.ball = this.add.circle(ARENA.width / 2, ARENA.height / 2, 10, 0xfff3b0).setStrokeStyle(2, 0x000000);
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.keys;

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.room.send("throw");
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.room.send("blink"));
    this.input.keyboard?.on("keydown-J", () => this.room.send("throw"));

    this.room.onStateChange((state) => {
      const seen = new Set<string>();
      state.players.forEach((player: RemotePlayer, id: string) => {
        seen.add(id);
        this.upsertDog(id, player);
      });
      for (const id of [...this.dogs.keys()]) {
        if (!seen.has(id)) {
          this.dogs.get(id)?.destroy();
          this.names.get(id)?.destroy();
          this.dogs.delete(id);
          this.names.delete(id);
          this.previous.delete(id);
          this.current.delete(id);
        }
      }
    });
  }

  update(_time: number, delta: number): void {
    const pointer = this.input.activePointer;
    const local = this.current.get(this.localId);
    if (!local) {
      return;
    }
    const input = readKeyboardInput(
      {
        W: this.keys.W.isDown,
        A: this.keys.A.isDown,
        S: this.keys.S.isDown,
        D: this.keys.D.isDown,
      },
      { x: pointer.worldX, y: pointer.worldY },
      local,
    );
    this.room.send("input", input);

    const predicted = predictLocal(local, input, Math.min(delta / 1000, DT * 2));
    this.drawPlayer(this.localId, { ...local, ...predicted }, true);

    for (const [id, player] of this.current) {
      if (id === this.localId) {
        continue;
      }
      const from = this.previous.get(id) ?? player;
      this.drawPlayer(id, { ...player, ...interpolateEntity(from, player, 0.35) }, false);
    }

    const ballFrom = this.previousBall;
    const ballTo = {
      x: this.room.state.ball.x as number,
      y: this.room.state.ball.y as number,
      ownerId: this.room.state.ball.ownerId as string,
    };
    this.previousBall = this.currentBall;
    this.currentBall = ballTo;
    const ballPose = interpolateEntity(
      { x: ballFrom.x, y: ballFrom.y, heading: 0 },
      { x: ballTo.x, y: ballTo.y, heading: 0 },
      0.4,
    );
    this.ball?.setPosition(ballPose.x, ballPose.y);
  }

  private upsertDog(id: string, player: RemotePlayer): void {
    this.previous.set(id, this.current.get(id) ?? player);
    this.current.set(id, {
      id,
      name: player.name,
      x: player.x,
      y: player.y,
      heading: player.heading,
      hasBall: player.hasBall,
      score: player.score,
    });
    if (!this.dogs.has(id)) {
      const color = DOG_COLORS[this.dogs.size % DOG_COLORS.length] ?? 0xffffff;
      this.dogs.set(id, this.add.circle(player.x, player.y, 18, color).setStrokeStyle(3, 0x081c15));
      this.names.set(
        id,
        this.add.text(player.x, player.y - 28, player.name, {
          fontFamily: "ui-sans-serif, system-ui",
          fontSize: "14px",
          color: "#f8f9fa",
        }).setOrigin(0.5, 1),
      );
    }
  }

  private drawPlayer(id: string, player: RemotePlayer, local: boolean): void {
    const dog = this.dogs.get(id);
    const label = this.names.get(id);
    dog?.setPosition(player.x, player.y);
    dog?.setScale(player.hasBall ? 1.15 : 1);
    if (local) {
      dog?.setStrokeStyle(4, 0xffffff);
    }
    label?.setPosition(player.x, player.y - 28).setText(player.name);
  }
}
