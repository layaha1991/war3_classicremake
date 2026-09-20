import type { PlayerInput } from "@war3/shared";

export function readKeyboardInput(
  keys: { W: boolean; A: boolean; S: boolean; D: boolean },
  pointer: { x: number; y: number },
  origin: { x: number; y: number },
): PlayerInput {
  return {
    up: keys.W,
    down: keys.S,
    left: keys.A,
    right: keys.D,
    facing: Math.atan2(pointer.y - origin.y, pointer.x - origin.x),
  };
}
