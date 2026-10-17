/**
 * Angebot Shenzhen Jinyuan GZY20261015K04 — P3.91 Outdoor 4×2,5 m.
 */

export const JINYUAN_OFFER_ID = 'jinyuan-p391';

export const JINYUAN_QUOTE = {
  id: JINYUAN_OFFER_ID,
  label: 'Angebot Jinyuan P3.91',
  vendor: 'Shenzhen Jinyuan Technology Co., Ltd.',
  invoiceNo: 'GZY20261015K04',
  date: '2026-10-15',
  terms: 'EXW',
  widthM: 4,
  heightM: 2.5,
  areaM2: 10,
  pitchMm: 3.91,
  cabinetDepthM: 0.07,
  cabinetMaterial: 'Schwarz, Druckguss-Aluminium',
  cols: 8,
  /** 8×(500×500) unten + 16×(500×1000) oben = 24 Cabinets */
  cabinets500x500: 8,
  cabinets500x1000: 16,
  brightnessCdM2: 5500,
  viewingAngleH: 170,
  viewingAngleV: 120,
  powerAvgWm2: 150,
  powerMaxWm2: 500,
  refreshHz: 7680,
  processor: 'Novastar CMS260',
  processorMaxPixels: 2_600_000,
  priceUsd: 6702,
  ip: 'IP66 (Outdoor)',
};

/** Cabinet-Zellen von unten nach oben pro Spalte */
export const JINYUAN_COLUMN_STACK = [
  { w: 0.5, h: 0.5 },
  { w: 0.5, h: 1.0 },
  { w: 0.5, h: 1.0 },
];

export function hasMixedColumnStack(config) {
  return Array.isArray(config?.columnStack) && config.columnStack.length > 0;
}

export function mixedStackGridHint(config) {
  if (!hasMixedColumnStack(config)) return null;
  const cols = config.cols;
  const stack = config.columnStack;
  const heightM = stack.reduce((sum, c) => sum + c.h, 0);
  const count500 = stack.filter((c) => c.h <= 0.55).length * cols;
  const count1000 = stack.filter((c) => c.h > 0.55).length * cols;
  return {
    heightM,
    label: `${config.widthM} × ${heightM.toFixed(2).replace(/\.00$/, '')} m — ${cols} Spalten: unten 500×500, 2× 500×1000 (${count1000}× 500×1000 + ${count500}× 500×500)`,
  };
}

export function jinyuanWallConfig(overrides = {}) {
  return {
    offerId: JINYUAN_OFFER_ID,
    label: JINYUAN_QUOTE.label,
    widthM: JINYUAN_QUOTE.widthM,
    heightM: JINYUAN_QUOTE.heightM,
    pitchMm: JINYUAN_QUOTE.pitchMm,
    cols: JINYUAN_QUOTE.cols,
    rows: JINYUAN_COLUMN_STACK.length,
    cabinetWM: 0.5,
    cabinetHM: 0.5,
    cabinetDepthM: JINYUAN_QUOTE.cabinetDepthM,
    columnStack: JINYUAN_COLUMN_STACK,
    mountHeightM: 1.35,
    offsetXM: 0,
    content: 'lyrics',
    ...overrides,
  };
}

export function jinyuanOfferStats(widthM, heightM, pitchMm) {
  const wPx = Math.max(1, Math.round((widthM * 1000) / pitchMm));
  const hPx = Math.max(1, Math.round((heightM * 1000) / pitchMm));
  const totalPx = wPx * hPx;
  const area = widthM * heightM;
  const q = JINYUAN_QUOTE;
  return {
    resolution: `${wPx} × ${hPx} px`,
    totalPx,
    cmsHeadroom: q.processorMaxPixels - totalPx,
    cmsOk: totalPx <= q.processorMaxPixels,
    powerAvgW: Math.round(area * q.powerAvgWm2),
    powerMaxW: Math.round(area * q.powerMaxWm2),
    cabinetSummary: `16× 500×1000 mm + 8× 500×500 mm`,
    layoutSummary: '8 Spalten: unten 500 mm, darüber 2× 1000 mm',
  };
}
