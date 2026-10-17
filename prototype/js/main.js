import { LedVisualizerApp } from './app.js';
import { bindUi } from './ui.js';

const canvas = document.getElementById('scene-canvas');
const panel = document.getElementById('control-panel');

const app = new LedVisualizerApp(canvas);
bindUi(app, panel);
