/**
 * Pure helpers for LED wall dimensions and viewing distance (rule of thumb).
 */

export const PITCH_PRESETS_MM = [1.9, 2.5, 2.9, 3.9, 4.8, 5.9, 6.9];

export const CABINET_PRESETS = [
  { label: '500 × 500 mm', w: 0.5, h: 0.5 },
  { label: '500 × 1000 mm', w: 0.5, h: 1.0 },
];

export const WALL_SIZE_PRESETS = [
  { label: '3 × 2 m', w: 3, h: 2 },
  { label: '4 × 2,25 m (16:9)', w: 4, h: 2.25 },
  { label: '5 × 3 m', w: 5, h: 3 },
  { label: '6 × 3,375 m', w: 6, h: 3.375 },
];

export const MAX_TEXTURE_PIXELS = 4096;

export function metersToPixels(meters, pitchMm) {
  if (pitchMm <= 0) return 0;
  return Math.max(1, Math.round((meters * 1000) / pitchMm));
}

export function resolutionFromWall(widthM, heightM, pitchMm) {
  const w = metersToPixels(widthM, pitchMm);
  const h = metersToPixels(heightM, pitchMm);
  return { widthPx: w, heightPx: h, totalPx: w * h };
}

export function aspectRatioString(widthPx, heightPx) {
  if (!heightPx) return '—';
  const g = gcd(widthPx, heightPx);
  const aw = widthPx / g;
  const ah = heightPx / g;
  if (aw > 32 || ah > 32) {
    return (widthPx / heightPx).toFixed(3) + ':1';
  }
  return `${aw}:${ah}`;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function cabinetsFromGrid(cols, rows) {
  return { cols, rows, count: cols * rows };
}

export function gridFromWallAndCabinet(wallWM, wallHM, cabWM, cabHM) {
  const cols = Math.max(1, Math.round(wallWM / cabWM));
  const rows = Math.max(1, Math.round(wallHM / cabHM));
  return {
    cols,
    rows,
    widthM: cols * cabWM,
    heightM: rows * cabHM,
  };
}

/** Rule of thumb: ~1 m minimum per mm pitch; comfortable ~2–3×. */
export function viewingDistanceRuleOfThumb(pitchMm) {
  const minM = pitchMm; // z. B. 3,9 mm Pitch → ca. 3,9 m Mindestabstand
  const comfortableMinM = minM * 2;
  const comfortableMaxM = minM * 3;
  return {
    minM,
    comfortableMinM,
    comfortableMaxM,
    labelMin: `ca. ${formatM(minM)} (Faustregel: ~1 m pro mm Pixelpitch)`,
    labelComfort: `ca. ${formatM(comfortableMinM)} – ${formatM(comfortableMaxM)} (Faustregel: 2–3× Mindestabstand)`,
  };
}

export function formatM(m) {
  if (m < 1) return `${(m * 100).toFixed(0)} cm`;
  return `${m.toFixed(2)} m`.replace('.00', '');
}

export function clampTextureResolution(widthPx, heightPx) {
  const maxDim = Math.max(widthPx, heightPx);
  if (maxDim <= MAX_TEXTURE_PIXELS) {
    return { widthPx, heightPx, scaled: false };
  }
  const scale = MAX_TEXTURE_PIXELS / maxDim;
  return {
    widthPx: Math.max(1, Math.round(widthPx * scale)),
    heightPx: Math.max(1, Math.round(heightPx * scale)),
    scaled: true,
  };
}
