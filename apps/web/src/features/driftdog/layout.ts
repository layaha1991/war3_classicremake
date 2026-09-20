import { ARENA } from "@war3/shared";

export const TOUCH = {
  stickRadius: 220,
  stickKnob: 80,
  stickMarginX: 250,
  stickMarginY: 250,
  hudTop: 72,
  moveIcon: "cross",
  aimIcon: "pass",
} as const;

export function stickHome(side: "move" | "aim", arena = ARENA): { x: number; y: number } {
  return {
    x: side === "move" ? TOUCH.stickMarginX : arena.width - TOUCH.stickMarginX,
    y: arena.height - TOUCH.stickMarginY,
  };
}
