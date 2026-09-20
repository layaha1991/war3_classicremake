export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
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
  lastThrowerId: string | null;
  spin: number;
  radius: number;
  throwImmune: number;
}

export type MatchPhase = "lobby" | "playing" | "ended";

export interface MatchState {
  phase: MatchPhase;
  players: Record<string, PlayerState>;
  ball: BallState;
  timer: number;
  scoreToWin: number;
}

export type SimEvent =
  | { type: "pickup"; playerId: string }
  | { type: "throw"; playerId: string; spin: number }
  | { type: "hit"; attackerId: string; victimId: string }
  | { type: "score"; playerId: string; score: number }
  | { type: "blink"; playerId: string }
  | { type: "win"; playerId: string };

export interface StepResult {
  state: MatchState;
  events: SimEvent[];
}
