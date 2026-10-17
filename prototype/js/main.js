import * as THREE from 'three';
import { LedVisualizerApp } from './app.js';
import { bindUi } from './ui.js';
import { ensureChairTemplate } from './room.js';

const canvas = document.getElementById('scene-canvas');
const panel = document.getElementById('control-panel');
const viewport = document.getElementById('viewport');

async function start() {
  try {
    await ensureChairTemplate();
    const app = new LedVisualizerApp(canvas);
    bindUi(app, panel, viewport);
    window.__ledApp = app;
    window.__ledTHREE = THREE;
  } catch (err) {
    console.error('LED-Visualizer Startfehler:', err);
    const banner = document.createElement('p');
    banner.className = 'warn';
    banner.textContent = `3D-Startfehler: ${err.message}`;
    document.getElementById('viewport')?.prepend(banner);
  }
}

start();
