import type { PlayerInput } from "@war3/shared";

export const STICK_DEADZONE = 0.12;
export const STICK_MAX_RADIUS = 72;

export type StickSide = "move" | "aim";

export interface StickState {
  active: boolean;
  x: number;
  y: number;
  heading: number;
  magnitude: number;
}

export function sideForPointer(x: number, width: number): StickSide {
  return x < width / 2 ? "move" : "aim";
}

export function readVirtualStick(
  origin: { x: number; y: number },
  pointer: { x: number; y: number } | null,
  maxRadius = STICK_MAX_RADIUS,
): StickState {
  if (!pointer) {
    return { active: false, x: 0, y: 0, heading: 0, magnitude: 0 };
  }
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const raw = Math.hypot(dx, dy);
  const heading = raw > 0 ? Math.atan2(dy, dx) : 0;
  const magnitude = maxRadius <= 0 ? 0 : Math.min(1, raw / maxRadius);
  if (magnitude <= STICK_DEADZONE) {
    return { active: false, x: 0, y: 0, heading, magnitude };
  }
  return {
    active: true,
    x: Math.cos(heading) * magnitude,
    y: Math.sin(heading) * magnitude,
    heading,
    magnitude,
  };
}

export function readMoveInput(stick: StickState, facing?: number): PlayerInput {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    moveX: stick.x,
    moveY: stick.y,
    ...(facing !== undefined ? { facing } : {}),
  };
}

export function aimRay(
  from: { x: number; y: number },
  heading: number,
  length: number,
): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: from.x,
    y1: from.y,
    x2: from.x + Math.cos(heading) * length,
    y2: from.y + Math.sin(heading) * length,
  };
}

export function shouldPassOnRelease(aim: StickState, hitId: string | undefined): boolean {
  return aim.active && hitId !== undefined;
}

const idleStick: StickState = { active: false, x: 0, y: 0, heading: 0, magnitude: 0 };

export interface TouchPadController {
  move: StickState;
  aim: StickState;
  moveOrigin: { x: number; y: number } | null;
  aimOrigin: { x: number; y: number } | null;
  consumeAimRelease(): StickState | undefined;
  destroy(): void;
}

export function attachTouchPads(root: HTMLElement): TouchPadController {
  const wrap = document.createElement("div");
  wrap.className = "pads";
  wrap.innerHTML = `<div class="pad pad-move" role="button" aria-label="移動"></div><div class="pad pad-aim" role="button" aria-label="傳球"></div>`;
  root.append(wrap);

  const moveEl = wrap.querySelector(".pad-move") as HTMLElement;
  const aimEl = wrap.querySelector(".pad-aim") as HTMLElement;
  const controller: TouchPadController = {
    move: idleStick,
    aim: idleStick,
    moveOrigin: null,
    aimOrigin: null,
    consumeAimRelease() {
      const released = pendingRelease;
      pendingRelease = undefined;
      return released;
    },
    destroy() {
      wrap.remove();
    },
  };
  let pendingRelease: StickState | undefined;

  const bind = (el: HTMLElement, side: StickSide) => {
    let pointerId: number | undefined;
    let origin = { x: 0, y: 0 };

    const setStick = (pointer: { x: number; y: number } | null) => {
      const next = readVirtualStick(origin, pointer);
      if (side === "move") {
        controller.move = next;
        controller.moveOrigin = pointer ? origin : null;
        return;
      }
      controller.aim = next;
      controller.aimOrigin = pointer ? origin : null;
    };

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      pointerId = event.pointerId;
      origin = { x: event.clientX, y: event.clientY };
      el.setPointerCapture(event.pointerId);
      setStick({ x: event.clientX, y: event.clientY });
    });
    el.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      setStick({ x: event.clientX, y: event.clientY });
    });
    const end = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      const last = readVirtualStick(origin, { x: event.clientX, y: event.clientY });
      if (side === "aim") {
        pendingRelease = last;
      }
      pointerId = undefined;
      setStick(null);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  bind(moveEl, "move");
  bind(aimEl, "aim");
  return controller;
}

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
