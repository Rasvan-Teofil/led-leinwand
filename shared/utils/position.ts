/** Snap stored canvas positions to whole millimetres. */
export function roundPositionMm(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

export function roundPositionPatch<T extends { xMm?: number, yMm?: number }>(
  patch: T
): T {
  const out = { ...patch }
  if (out.xMm != null) out.xMm = roundPositionMm(out.xMm)
  if (out.yMm != null) out.yMm = roundPositionMm(out.yMm)
  return out
}
