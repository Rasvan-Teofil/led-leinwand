import { LedVisualizerApp } from './app.js';
import { bindUi } from './ui.js';

const canvas = document.getElementById('scene-canvas');
const panel = document.getElementById('control-panel');

let app;
try {
  app = new LedVisualizerApp(canvas);
  bindUi(app, panel);
} catch (err) {
  console.error('LED-Visualizer Startfehler:', err);
  const banner = document.createElement('p');
  banner.className = 'warn';
  banner.textContent = `3D-Startfehler: ${err.message}`;
  document.getElementById('viewport')?.prepend(banner);
  throw err;
}

if (typeof window !== 'undefined') {
  window.__ledApp = app;
}
