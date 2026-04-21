const SEGMENT_SIZE = 100000;

export function calcNextThreshold(currentMiles: number): number {
  let threshold = Math.ceil(currentMiles / SEGMENT_SIZE) * SEGMENT_SIZE;
  if (threshold === currentMiles) {
    threshold += SEGMENT_SIZE;
  }
  return threshold || SEGMENT_SIZE;
}

export function calcRemainingMiles(
  nextThreshold: number,
  currentMiles: number,
): number {
  return nextThreshold - currentMiles;
}

export function calcProgressPercent(
  nextThreshold: number,
  currentMiles: number,
): number {
  const segmentStart = nextThreshold - SEGMENT_SIZE;
  return Math.max(
    0,
    Math.min(100, ((currentMiles - segmentStart) / SEGMENT_SIZE) * 100),
  );
}
