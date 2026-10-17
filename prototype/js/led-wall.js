import * as THREE from 'three';
import {
  resolutionFromWall,
  clampTextureResolution,
} from './calculations.js';
import { createLyricsCanvas, createPhotoCanvas } from './content-textures.js';
import { JINYUAN_COLUMN_STACK, jinyuanWallConfig } from './jinyuan-offer.js';
import { buildHangingTruss } from './led-truss.js';

const LED_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LED_FRAGMENT = `
uniform sampler2D uMap;
uniform vec2 uResolution;
uniform vec3 uGapColor;
uniform float uLedFill;
uniform float uFlatBlend;
uniform float uCabinetCols;
varying vec2 vUv;

float cabinetSeam(vec2 uv) {
  float sx = min(fract(uv.x * uCabinetCols), 1.0 - fract(uv.x * uCabinetCols));
  float s = smoothstep(0.0, 0.018, sx) * smoothstep(0.0, 0.018, 1.0 - sx);
  float h1 = abs(uv.y - 0.2);
  float h2 = abs(uv.y - 0.6);
  float sy = min(h1, h2);
  float sh = smoothstep(0.0, 0.012, sy);
  return 1.0 - min(s, sh);
}

void main() {
  vec3 blended = texture2D(uMap, vUv).rgb;
  vec2 pix = vUv * uResolution;
  vec2 cell = fract(pix);
  vec2 idx = floor(pix);
  vec2 sampleUv = (idx + 0.5) / uResolution;
  vec3 color = texture2D(uMap, sampleUv).rgb;
  vec2 centered = cell - 0.5;
  float d = max(abs(centered.x), abs(centered.y));
  float mask = step(d, uLedFill * 0.5);
  vec3 dotted = mix(uGapColor, color, mask);
  float ledSpan = max(length(dFdx(pix)), length(dFdy(pix)));
  float autoBlend = smoothstep(0.55, 1.05, ledSpan);
  float blend = max(uFlatBlend, autoBlend);
  vec3 outRgb = mix(dotted, blended, blend);
  float seam = cabinetSeam(vUv);
  outRgb *= mix(0.72, 1.0, seam);
  outRgb *= 1.0 + blend * 0.55;
  outRgb += blended * 0.12;
  gl_FragColor = vec4(outRgb, 1.0);
}
`;

let wallIdCounter = 0;

export function createWallConfig(overrides = {}) {
  return {
    id: `wall-${++wallIdCounter}`,
    ...jinyuanWallConfig(),
    ...overrides,
  };
}

/**
 * LED-Wand mit Traversen-Torbogen. Lokales System der Gruppe: Ursprung auf dem Boden in der
 * Traversenachse, x entlang der Wandbreite, +z = Blickrichtung der LED-Fläche.
 */
export class LedWallMesh {
  constructor(config, scene) {
    this.config = { trussBaseY: 0, ...config };
    this.scene = scene;
    this.group = new THREE.Group();
    this.panel = new THREE.Group();
    this.group.add(this.panel);
    this.texture = null;
    this.material = null;
    this.mesh = null;
    this.cabinetGroup = null;
    this.trussGroup = null;
    this._build();
  }

  _build() {
    this._disposeParts();

    const { widthM, heightM, pitchMm, content, cols, cabinetDepthM, columnStack } =
      this.config;
    const res = resolutionFromWall(widthM, heightM, pitchMm);
    const clamped = clampTextureResolution(res.widthPx, res.heightPx);

    const canvas =
      content === 'photo'
        ? createPhotoCanvas(clamped.widthPx, clamped.heightPx)
        : createLyricsCanvas(clamped.widthPx, clamped.heightPx);

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.texture },
        uResolution: { value: new THREE.Vector2(clamped.widthPx, clamped.heightPx) },
        uGapColor: { value: new THREE.Color(0x080808) },
        uLedFill: { value: 0.88 },
        uFlatBlend: { value: 0 },
        uCabinetCols: { value: cols },
      },
      vertexShader: LED_VERTEX,
      fragmentShader: LED_FRAGMENT,
      extensions: { derivatives: true },
    });

    const geo = new THREE.PlaneGeometry(widthM, heightM);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(0, heightM / 2, cabinetDepthM / 2 + 0.002);
    this.mesh.renderOrder = 3;
    this.mesh.name = 'led-surface';
    this.panel.add(this.mesh);

    this.cabinetGroup = this._buildCabinetBoxes(widthM, columnStack, cabinetDepthM);
    this.panel.add(this.cabinetGroup);

    this._applyTransform();
    this._rebuildTruss();
  }

  _rebuildTruss() {
    this._disposeTruss();
    const { widthM, heightM, mountHeightM, trussBaseY } = this.config;
    this.trussGroup = buildHangingTruss({
      widthM,
      panelBottomY: mountHeightM,
      panelHeightM: heightM,
      baseY: trussBaseY,
    });
    this.group.add(this.trussGroup);
  }

  _disposeTruss() {
    if (!this.trussGroup) return;
    this.group.remove(this.trussGroup);
    const geos = new Set();
    const mats = new Set();
    this.trussGroup.traverse((o) => {
      if (o.isMesh) {
        geos.add(o.geometry);
        mats.add(o.material);
      }
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.trussGroup = null;
  }

  _buildCabinetBoxes(widthM, columnStack, depthM) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      metalness: 0.75,
      roughness: 0.28,
    });
    const colW = widthM / (this.config.cols || 8);
    let y = 0;
    const stack = columnStack ?? JINYUAN_COLUMN_STACK;
    for (const cell of stack) {
      for (let c = 0; c < this.config.cols; c++) {
        const x = -widthM / 2 + colW / 2 + c * colW;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(colW - 0.004, cell.h - 0.004, depthM),
          mat
        );
        box.position.set(x, y + cell.h / 2, 0);
        g.add(box);
      }
      y += cell.h;
    }
    return g;
  }

  _disposeParts() {
    if (this.mesh) {
      this.panel.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    if (this.cabinetGroup) {
      this.panel.remove(this.cabinetGroup);
      this.cabinetGroup.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    }
    this._disposeTruss();
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
  }

  _applyTransform() {
    const { mountHeightM, offsetXM } = this.config;
    this.panel.position.y = mountHeightM;
    this.group.position.z = offsetXM;
  }

  setOffsetXM(alongWallZ) {
    this.config.offsetXM = alongWallZ;
    this.group.position.z = alongWallZ;
  }

  setMountHeight(m) {
    this.config.mountHeightM = m;
    this.panel.position.y = m;
    this._rebuildTruss();
  }

  setTrussBaseY(y) {
    if (this.config.trussBaseY === y) return;
    this.config.trussBaseY = y;
    this._rebuildTruss();
  }

  /** LED-Mittelpunkt in Weltkoordinaten. */
  getCenterWorld(target = new THREE.Vector3()) {
    this.mesh.updateWorldMatrix(true, false);
    return this.mesh.getWorldPosition(target);
  }

  updateConfig(partial) {
    Object.assign(this.config, partial);
    this._build();
  }

  setPitchMm(pitchMm) {
    this.updateConfig({ pitchMm });
  }

  setFlatBlend(t) {
    if (this.material?.uniforms?.uFlatBlend) {
      this.material.uniforms.uFlatBlend.value = THREE.MathUtils.clamp(t, 0, 1);
    }
  }

  getStats() {
    const { widthM, heightM, pitchMm, cols, rows, cabinetWM, cabinetHM, offerId } =
      this.config;
    const res = resolutionFromWall(widthM, heightM, pitchMm);
    const clamped = clampTextureResolution(res.widthPx, res.heightPx);
    const stack = this.config.columnStack ?? JINYUAN_COLUMN_STACK;
    const count =
      cols * stack.length +
      (stack.length === 3 ? 0 : 0);
    return {
      res,
      clamped,
      widthM,
      heightM,
      pitchMm,
      offerId,
      cabinets: {
        cols,
        rows: stack.length,
        count: cols * stack.length,
        cabinetWM,
        cabinetHM,
      },
    };
  }

  dispose() {
    this._disposeParts();
  }
}
