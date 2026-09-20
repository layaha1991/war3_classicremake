import { ARENA } from "@war3/shared";

export const TOUCH = {
  stickRadius: 110,
  stickMarginX: 200,
  stickMarginY: 260,
  hudTop: 72,
} as const;

export function stickHome(side: "move" | "aim", arena = ARENA): { x: number; y: number } {
  return {
    x: side === "move" ? TOUCH.stickMarginX : arena.width - TOUCH.stickMarginX,
    y: arena.height - TOUCH.stickMarginY,
  };
}
