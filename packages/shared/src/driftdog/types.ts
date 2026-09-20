export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  moveX?: number;
  moveY?: number;
  facing?: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  hasBall: boolean;
  hearts: number;
  alive: boolean;
  score: number;
  blinkCd: number;
  radius: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string | null;
  flightToId: string | null;
  lastThrowerId: string | null;
  spin: number;
  radius: number;
  throwImmune: number;
}

export interface DogState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  speed: number;
  stun: number;
}

export type MatchPhase = "lobby" | "playing" | "ended";

export interface MatchState {
  phase: MatchPhase;
  players: Record<string, PlayerState>;
  ball: BallState;
  dog: DogState;
  timer: number;
}

export type SimEvent =
  | { type: "pass"; fromId: string; toId: string }
  | { type: "tagged"; victimId: string }
  | { type: "downed"; victimId: string }
  | { type: "win"; playerId: string }
  | { type: "blink"; playerId: string; fromX: number; fromY: number; toX: number; toY: number };

export interface StepResult {
  state: MatchState;
  events: SimEvent[];
}
