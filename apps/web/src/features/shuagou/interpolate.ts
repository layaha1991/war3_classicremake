export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function interpolateEntity(
  from: { x: number; y: number; heading: number },
  to: { x: number; y: number; heading: number },
  t: number,
): { x: number; y: number; heading: number } {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    heading: lerp(from.heading, to.heading, t),
  };
}
