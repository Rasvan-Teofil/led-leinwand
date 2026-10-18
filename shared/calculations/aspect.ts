export function aspectDeviation(actual: number, desired?: number): number {
  if (!desired || desired <= 0) return 0
  return Math.abs(actual - desired) / desired
}
