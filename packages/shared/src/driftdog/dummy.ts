import { playerHitByRay } from "./sim.js";
import type { MatchState, PlayerInput } from "./types.js";

const idle: PlayerInput = { up: false, down: false, left: false, right: false };

function toward(from: { x: number; y: number }, to: { x: number; y: number }, flip = 1): { x: number; y: number } {
  const dx = (to.x - from.x) * flip;
  const dy = (to.y - from.y) * flip;
  const length = Math.hypot(dx, dy);
  if (length <= 1) {
    return { x: 0, y: 0 };
  }
  return { x: dx / length, y: dy / length };
}

export function dummyInput(state: MatchState, id: string): PlayerInput {
  const player = state.players[id];
  if (!player?.alive) {
    return { ...idle };
  }
  if (player.hasBall) {
    const flee = toward(player, state.dog, -1);
    return { ...idle, moveX: flee.x, moveY: flee.y };
  }
  const holder = state.ball.ownerId ? state.players[state.ball.ownerId] : undefined;
  const mark = holder?.alive ? holder : { x: state.ball.x, y: state.ball.y };
  const chase = toward(player, mark);
  return { ...idle, moveX: chase.x, moveY: chase.y };
}

export function dummyShouldBlink(state: MatchState, id: string): boolean {
  const player = state.players[id];
  if (!player?.alive || !player.hasBall || player.blinkCd > 0) {
    return false;
  }
  return Math.hypot(player.x - state.dog.x, player.y - state.dog.y) < 220;
}

export function dummyPassHeading(state: MatchState, id: string): number | undefined {
  const player = state.players[id];
  if (!player?.alive || !player.hasBall) {
    return undefined;
  }
  if (Math.hypot(player.x - state.dog.x, player.y - state.dog.y) > 280) {
    return undefined;
  }
  const mate = Object.values(state.players).find((other) => other.alive && other.id !== id);
  if (!mate) {
    return undefined;
  }
  const heading = Math.atan2(mate.y - player.y, mate.x - player.x);
  return playerHitByRay(player, heading, Object.values(state.players), id) ? heading : undefined;
}
