/**
 * Procedural slide / photo canvases at LED pixel resolution.
 */

export function createLyricsCanvas(widthPx, heightPx) {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  const bg = '#1a2744';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, widthPx, heightPx);

  const margin = Math.max(8, Math.floor(widthPx * 0.06));
  ctx.fillStyle = '#2d3f66';
  ctx.fillRect(margin, margin, widthPx - 2 * margin, heightPx - 2 * margin);

  const titleSize = Math.max(10, Math.floor(heightPx * 0.09));
  const lineSize = Math.max(8, Math.floor(heightPx * 0.055));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c14b';
  ctx.font = `bold ${titleSize}px system-ui, sans-serif`;
  ctx.fillText('Großer Gott', widthPx / 2, margin + titleSize * 1.4);

  const lines = [
    'Großer Gott, wir loben dich,',
    'Herr, wir preisen deine Macht.',
    'Ewig Vater, Erd und Himmel',
    'sind von dir vollkommen acht.',
  ];
  ctx.fillStyle = '#ffffff';
  ctx.font = `${lineSize}px system-ui, sans-serif`;
  let y = margin + titleSize * 2.8;
  for (const line of lines) {
    ctx.fillText(line, widthPx / 2, y);
    y += lineSize * 1.45;
  }

  ctx.fillStyle = '#8899bb';
  ctx.font = `${Math.max(6, Math.floor(lineSize * 0.75))}px system-ui, sans-serif`;
  ctx.fillText('Gottesdienst · Beispiel-Folie', widthPx / 2, heightPx - margin * 0.8);

  return canvas;
}

export function createPhotoCanvas(widthPx, heightPx) {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, heightPx * 0.55);
  sky.addColorStop(0, '#6eb5ff');
  sky.addColorStop(1, '#c8e8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, widthPx, heightPx);

  const groundY = heightPx * 0.58;
  ctx.fillStyle = '#3d7a45';
  ctx.fillRect(0, groundY, widthPx, heightPx - groundY);

  const sunR = Math.min(widthPx, heightPx) * 0.12;
  ctx.fillStyle = '#ffe566';
  ctx.beginPath();
  ctx.arc(widthPx * 0.72, heightPx * 0.22, sunR, 0, Math.PI * 2);
  ctx.fill();

  const cx = widthPx * 0.35;
  const baseY = groundY;
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(cx - widthPx * 0.04, baseY - heightPx * 0.22, widthPx * 0.08, heightPx * 0.22);

  ctx.fillStyle = '#2d6b32';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - heightPx * 0.38);
  ctx.lineTo(cx - widthPx * 0.18, baseY - heightPx * 0.08);
  ctx.lineTo(cx + widthPx * 0.18, baseY - heightPx * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.font = `${Math.max(8, Math.floor(heightPx * 0.04))}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Beispiel-Foto', marginPx(widthPx), heightPx - marginPx(heightPx));

  return canvas;
}

function marginPx(dim) {
  return Math.max(6, Math.floor(dim * 0.03));
}
