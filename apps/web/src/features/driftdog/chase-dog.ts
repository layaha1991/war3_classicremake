export const CHASE_DOG = {
  key: "chase-dog",
  path: "/driftdog/wolf.png",
  displayWidth: 88,
  displayHeight: 75,
  /** Sprite faces slightly down-right; subtract so heading 0 is due east. */
  headingOffset: 0.62,
} as const;

export function chaseDogAngle(heading: number): number {
  return heading - CHASE_DOG.headingOffset;
}
