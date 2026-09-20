import Phaser from "phaser";
import type { Room } from "@colyseus/sdk";
import { ARENA, DT, RAY_MAX_DIST, playerHitByRay, type SimEvent } from "@war3/shared";
import { formatScores, formatShout, formatTimer, waitingCopy } from "./hud.js";
import { interpolateEntity } from "./interpolate.js";
import {
  STICK_MAX_RADIUS,
  aimRay,
  readKeyboardInput,
  readMoveInput,
  type StickState,
  type TouchPadController,
} from "./input.js";
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
const PLAYER_HIT_RADIUS = 18;

export class ShuagouScene extends Phaser.Scene {
  private room!: Room;
  private localId = "";
  private dogs = new Map<string, Phaser.GameObjects.Arc>();
  private names = new Map<string, Phaser.GameObjects.Text>();
  private ball?: Phaser.GameObjects.Arc;
  private chaseDog?: Phaser.GameObjects.Container;
  private previous = new Map<string, RemotePlayer>();
  private current = new Map<string, RemotePlayer>();
  private previousBall: RemoteBall = { x: ARENA.width / 2, y: ARENA.height / 2, ownerId: "" };
  private currentBall: RemoteBall = { x: ARENA.width / 2, y: ARENA.height / 2, ownerId: "" };
  private previousDog = { x: 80, y: 720, heading: 0 };
  private currentDog = { x: 80, y: 720, heading: 0 };
  private keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private timerText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private bannerText?: Phaser.GameObjects.Text;
  private shoutText?: Phaser.GameObjects.Text;
  private hitFlash?: Phaser.GameObjects.Rectangle;
  private pads?: TouchPadController;
  private moveBase?: Phaser.GameObjects.Arc;
  private moveKnob?: Phaser.GameObjects.Arc;
  private aimBase?: Phaser.GameObjects.Arc;
  private aimKnob?: Phaser.GameObjects.Arc;
  private rayGfx?: Phaser.GameObjects.Graphics;

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
    this.chaseDog = this.buildChaseDog();
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
    this.rayGfx = this.add.graphics().setDepth(16);
    this.buildSticks();
    this.pads = (window as unknown as { __shuagouPads?: TouchPadController }).__shuagouPads;
    this.input.mouse?.disableContextMenu();

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
    const move = this.pads?.move ?? { active: false, x: 0, y: 0, heading: 0, magnitude: 0 };
    const aim = this.pads?.aim ?? { active: false, x: 0, y: 0, heading: 0, magnitude: 0 };
    const released = this.pads?.consumeAimRelease();
    if (released?.active) {
      this.room.send("pass", { heading: released.heading });
    }
    this.drawSticks(move, aim);
    this.drawAimRay(local, aim);

    if (!local || this.room.state.phase !== "playing") {
      this.drawRemoteBodies();
      return;
    }

    const facing = aim.active ? aim.heading : local.heading;
    const input = move.active
      ? readMoveInput(move, facing)
      : readKeyboardInput(
          {
            W: this.keys.W.isDown,
            A: this.keys.A.isDown,
            S: this.keys.S.isDown,
            D: this.keys.D.isDown,
          },
          { x: pointer.worldX, y: pointer.worldY },
          local,
        );
    if (aim.active) {
      input.facing = facing;
    }
    this.room.send("input", input);

    const predicted = predictLocal(local, input, Math.min(delta / 1000, DT * 2));
    this.drawPlayer(this.localId, { ...local, ...predicted }, true);
    this.drawRemoteBodies(this.localId);
  }

  private buildSticks(): void {
    const moveHome = this.stickHome("move");
    const aimHome = this.stickHome("aim");
    this.moveBase = this.add.circle(moveHome.x, moveHome.y, STICK_MAX_RADIUS, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.28).setDepth(20);
    this.moveKnob = this.add.circle(moveHome.x, moveHome.y, 28, 0xf4d35e, 0.9).setStrokeStyle(2, 0x081c15).setDepth(21);
    this.aimBase = this.add.circle(aimHome.x, aimHome.y, STICK_MAX_RADIUS, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.28).setDepth(20);
    this.aimKnob = this.add.circle(aimHome.x, aimHome.y, 28, 0xf95738, 0.9).setStrokeStyle(2, 0x081c15).setDepth(21);
  }

  private buildChaseDog(): Phaser.GameObjects.Container {
    const rump = this.add.circle(-16, 2, 11, 0x6b3e1a);
    const body = this.add.ellipse(0, 0, 48, 22, 0x8d5524);
    const tail = this.add.ellipse(-28, -6, 16, 6, 0xa66b2d);
    const head = this.add.circle(20, -2, 11, 0x5c3317);
    const ear = this.add.triangle(14, -16, 0, 12, 10, 0, -6, 0, 0x3d2314);
    const snout = this.add.triangle(32, 0, 0, -6, 16, 0, 0, 6, 0x3d2314);
    const container = this.add.container(80, 720, [rump, tail, body, head, ear, snout]);
    container.setDepth(8);
    return container;
  }

  private stickHome(side: "move" | "aim"): { x: number; y: number } {
    return {
      x: side === "move" ? 120 : ARENA.width - 120,
      y: ARENA.height - 120,
    };
  }

  private screenToWorld(point: { x: number; y: number } | null): { x: number; y: number } | null {
    if (!point) {
      return null;
    }
    const canvas = this.game.canvas.getBoundingClientRect();
    if (canvas.width === 0 || canvas.height === 0) {
      return null;
    }
    return {
      x: ((point.x - canvas.left) / canvas.width) * ARENA.width,
      y: ((point.y - canvas.top) / canvas.height) * ARENA.height,
    };
  }

  private drawSticks(move: StickState, aim: StickState): void {
    const moveOrigin = this.screenToWorld(this.pads?.moveOrigin) ?? this.stickHome("move");
    const aimOrigin = this.screenToWorld(this.pads?.aimOrigin) ?? this.stickHome("aim");
    this.moveBase?.setPosition(moveOrigin.x, moveOrigin.y).setAlpha(this.pads?.moveOrigin ? 0.35 : 0.18);
    this.aimBase?.setPosition(aimOrigin.x, aimOrigin.y).setAlpha(this.pads?.aimOrigin ? 0.35 : 0.18);
    this.moveKnob?.setPosition(
      moveOrigin.x + move.x * STICK_MAX_RADIUS,
      moveOrigin.y + move.y * STICK_MAX_RADIUS,
    );
    this.aimKnob?.setPosition(
      aimOrigin.x + aim.x * STICK_MAX_RADIUS,
      aimOrigin.y + aim.y * STICK_MAX_RADIUS,
    );
  }

  private drawAimRay(local: RemotePlayer | undefined, aim: StickState): void {
    this.rayGfx?.clear();
    if (!local?.hasBall || !aim.active) {
      return;
    }
    const ray = aimRay(local, aim.heading, RAY_MAX_DIST);
    const hitId = this.rayHitId(aim.heading);
    this.rayGfx?.lineStyle(5, hitId ? 0xf4d35e : 0xffffff, 0.72);
    this.rayGfx?.lineBetween(ray.x1, ray.y1, ray.x2, ray.y2);
    if (hitId) {
      const target = this.current.get(hitId);
      if (target) {
        this.rayGfx?.lineStyle(3, 0xf4d35e, 0.9);
        this.rayGfx?.strokeCircle(target.x, target.y, 26);
      }
    }
  }

  private rayHitId(heading: number): string | undefined {
    const local = this.current.get(this.localId);
    if (!local?.hasBall) {
      return undefined;
    }
    return playerHitByRay(
      local,
      heading,
      [...this.current.values()].map((player) => ({
        id: player.id,
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        heading: player.heading,
        hasBall: player.hasBall,
        score: player.score,
        blinkCd: 0,
        radius: PLAYER_HIT_RADIUS,
      })),
      this.localId,
    );
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
    const dog = this.room.state.dog as { x?: number; y?: number; heading?: number } | undefined;
    this.previousDog = this.currentDog;
    this.currentDog = {
      x: Number(dog?.x ?? this.currentDog.x),
      y: Number(dog?.y ?? this.currentDog.y),
      heading: Number(dog?.heading ?? this.currentDog.heading),
    };
  }

  private refreshHud(): void {
    const players = [...this.current.values()];
    this.timerText?.setText(formatTimer(Number(this.room.state.timer ?? 0)));
    this.scoreText?.setText(formatScores(players));
    this.bannerText?.setText(waitingCopy(String(this.room.state.phase ?? "lobby")));
  }

  private playEffect(event: SimEvent): void {
    if (event.type === "throw" || event.type === "pass") {
      const text = event.type === "pass"
        ? String(this.room.state.lastShout || "傳球")
        : formatShout(this.current.get(event.playerId)?.name ?? this.room.state.lastShout ?? "");
      this.shoutText?.setText(text).setAlpha(1);
      this.tweens.add({ targets: this.shoutText, alpha: 0, duration: 900, delay: 350 });
    }
    if (event.type === "tagged" || event.type === "hit") {
      this.hitFlash?.setAlpha(0.45);
      this.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 180 });
      this.shoutText?.setText(String(this.room.state.lastShout || "甩到了")).setAlpha(1);
      this.tweens.add({ targets: this.shoutText, alpha: 0, duration: 700, delay: 200 });
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

    const dogPose = interpolateEntity(
      { x: this.previousDog.x, y: this.previousDog.y, heading: 0 },
      { x: this.currentDog.x, y: this.currentDog.y, heading: 0 },
      0.4,
    );
    let turn = this.currentDog.heading - this.previousDog.heading;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    this.chaseDog?.setPosition(dogPose.x, dogPose.y);
    this.chaseDog?.setRotation(this.previousDog.heading + turn * 0.4);
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
    label?.setPosition(player.x, player.y - 28).setText(player.hasBall ? `${player.name} · 球` : player.name);
  }
}
