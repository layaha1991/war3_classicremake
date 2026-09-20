import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import { ARENA, DT, type SimEvent } from "@war3/shared";
import { formatScores, formatShout, formatTimer, waitingCopy } from "./hud.js";
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
  private timerText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private bannerText?: Phaser.GameObjects.Text;
  private shoutText?: Phaser.GameObjects.Text;
  private hitFlash?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("shuagou");
  }

  init(): void {
    const room = (window as unknown as { __shuagouRoom?: Room }).__shuagouRoom;
    if (!room) {
      throw new Error("missing joined room");
    }
    this.room = room;
    this.localId = room.sessionId;
  }

  create(): void {
    (window as unknown as { __shuagouCreated?: boolean }).__shuagouCreated = true;
    this.cameras.main.setBackgroundColor("#1b4332");
    this.add.rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width - 40, ARENA.height - 40, 0x2d6a4f);
    this.add.circle(ARENA.width / 2, ARENA.height / 2, 70, 0x40916c, 0.35);
    this.ball = this.add.circle(ARENA.width / 2, ARENA.height / 2, 10, 0xfff3b0).setStrokeStyle(2, 0x000000);
    this.keys = (this.input.keyboard?.addKeys("W,A,S,D") ?? {
      W: { isDown: false },
      A: { isDown: false },
      S: { isDown: false },
      D: { isDown: false },
    }) as typeof this.keys;

    const hudFont = "PingFang TC, Hiragino Sans GB, Noto Sans TC, sans-serif";
    const roomCode = new URLSearchParams(window.location.search).get("room") ?? "";
    this.add.text(28, 24, roomCode ? `房間 ${roomCode}` : "", {
      fontFamily: hudFont,
      fontSize: "16px",
      color: "#95d5b2",
    });
    this.timerText = this.add.text(ARENA.width / 2, 28, "3:00", {
      fontFamily: hudFont,
      fontSize: "28px",
      color: "#f8f9fa",
    }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(ARENA.width / 2, 64, "", {
      fontFamily: hudFont,
      fontSize: "18px",
      color: "#f4d35e",
    }).setOrigin(0.5, 0);
    this.bannerText = this.add.text(ARENA.width / 2, ARENA.height / 2 - 120, "", {
      fontFamily: hudFont,
      fontSize: "26px",
      color: "#fff3b0",
    }).setOrigin(0.5);
    this.shoutText = this.add.text(ARENA.width / 2, 120, "", {
      fontFamily: hudFont,
      fontSize: "42px",
      color: "#f95738",
    }).setOrigin(0.5).setAlpha(0);
    this.hitFlash = this.add.rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width, ARENA.height, 0xffffff, 0);

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.room.send("throw");
      }
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.room.send("blink"));
    this.input.keyboard?.on("keydown-J", () => this.room.send("throw"));

    this.time.delayedCall(0, () => {
      try {
        this.room.onStateChange(() => this.pullState());
        this.room.onMessage("fx", (event: SimEvent) => this.playEffect(event));
        this.pullState();
      } catch (error) {
        console.error("shuagou subscribe failed", error);
      }
    });
  }

  update(_time: number, delta: number): void {
    this.refreshHud();
    const pointer = this.input.activePointer;
    const local = this.current.get(this.localId);
    if (!local || this.room.state.phase !== "playing") {
      this.drawRemoteBodies();
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
    this.drawRemoteBodies(this.localId);
  }

  private pullState(): void {
    const seen = new Set<string>();
    const players = this.room.state.players as { forEach?: (cb: (player: RemotePlayer, id: string) => void) => void };
    players.forEach?.((player, id) => {
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
  }

  private refreshHud(): void {
    const players = [...this.current.values()];
    this.timerText?.setText(formatTimer(Number(this.room.state.timer ?? 0)));
    this.scoreText?.setText(formatScores(players));
    this.bannerText?.setText(waitingCopy(String(this.room.state.phase ?? "lobby")));
  }

  private playEffect(event: SimEvent): void {
    if (event.type === "throw") {
      const name = this.current.get(event.playerId)?.name ?? this.room.state.lastShout ?? "";
      this.shoutText?.setText(formatShout(String(name))).setAlpha(1);
      this.tweens.add({ targets: this.shoutText, alpha: 0, duration: 900, delay: 350 });
    }
    if (event.type === "hit") {
      this.hitFlash?.setAlpha(0.45);
      this.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 180 });
      const victim = this.dogs.get(event.victimId);
      if (victim) {
        this.tweens.add({ targets: victim, scale: 1.4, yoyo: true, duration: 120 });
      }
    }
    if (event.type === "win") {
      const winner = this.current.get(event.playerId)?.name ?? "玩家";
      this.bannerText?.setText(`${winner} 贏了！`);
    }
  }

  private drawRemoteBodies(exceptId?: string): void {
    for (const [id, player] of this.current) {
      if (id === exceptId) {
        continue;
      }
      const from = this.previous.get(id) ?? player;
      this.drawPlayer(id, { ...player, ...interpolateEntity(from, player, 0.35) }, id === this.localId);
    }
    const ballTo = {
      x: Number(this.room.state.ball.x),
      y: Number(this.room.state.ball.y),
      ownerId: String(this.room.state.ball.ownerId ?? ""),
    };
    const ballFrom = this.previousBall;
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
          fontFamily: "PingFang TC, Hiragino Sans GB, Noto Sans TC, sans-serif",
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
