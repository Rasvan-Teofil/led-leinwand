import * as THREE from 'three';
import {
  resolutionFromWall,
  clampTextureResolution,
} from './calculations.js';
import { createLyricsCanvas, createPhotoCanvas } from './content-textures.js';

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
varying vec2 vUv;

void main() {
  vec3 blended = texture2D(uMap, vUv).rgb;
  vec2 pix = vUv * uResolution;
  float ledSpan = max(length(dFdx(pix)), length(dFdy(pix)));
  if (ledSpan > 0.9) {
    gl_FragColor = vec4(blended, 1.0);
    return;
  }
  vec2 cell = fract(pix);
  vec2 idx = floor(pix);
  vec2 sampleUv = (idx + 0.5) / uResolution;
  vec3 color = texture2D(uMap, sampleUv).rgb;
  vec2 centered = cell - 0.5;
  float d = max(abs(centered.x), abs(centered.y));
  float mask = step(d, uLedFill * 0.5);
  vec3 dotted = mix(uGapColor, color, mask);
  float mixFar = smoothstep(0.55, 1.0, ledSpan);
  gl_FragColor = vec4(mix(dotted, blended, mixFar), 1.0);
}
`;

let wallIdCounter = 0;

export function createWallConfig(overrides = {}) {
  return {
    id: `wall-${++wallIdCounter}`,
    label: overrides.label ?? 'LED-Wand',
    widthM: overrides.widthM ?? 4,
    heightM: overrides.heightM ?? 2.25,
    pitchMm: overrides.pitchMm ?? 3.9,
    cols: overrides.cols ?? 8,
    rows: overrides.rows ?? 5,
    cabinetWM: overrides.cabinetWM ?? 0.5,
    cabinetHM: overrides.cabinetHM ?? 0.5,
    mountHeightM: overrides.mountHeightM ?? 1.0,
    offsetXM: overrides.offsetXM ?? 0,
    content: overrides.content ?? 'lyrics',
  };
}

export class LedWallMesh {
  constructor(config, scene) {
    this.config = { ...config };
    this.scene = scene;
    this.group = new THREE.Group();
    this.texture = null;
    this.material = null;
    this.mesh = null;
    this.frame = null;
    this._build();
  }

  _build() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    if (this.frame) {
      this.group.remove(this.frame);
      this.frame.geometry.dispose();
      this.frame.material.dispose();
    }
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();

    const { widthM, heightM, pitchMm, content } = this.config;
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
    this.texture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.texture },
        uResolution: {
          value: new THREE.Vector2(clamped.widthPx, clamped.heightPx),
        },
        uGapColor: { value: new THREE.Color(0x080808) },
        uLedFill: { value: 0.88 },
      },
      vertexShader: LED_VERTEX,
      fragmentShader: LED_FRAGMENT,
      extensions: { derivatives: true },
    });

    const geo = new THREE.PlaneGeometry(widthM, heightM);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(0, heightM / 2, 0);
    this.mesh.renderOrder = 2;
    this.group.add(this.mesh);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.4,
      roughness: 0.6,
    });
    const frameDepth = 0.08;
    const frameGeo = new THREE.BoxGeometry(widthM + 0.12, heightM + 0.12, frameDepth);
    this.frame = new THREE.Mesh(frameGeo, frameMat);
    this.frame.position.set(0, heightM / 2, -frameDepth / 2 - 0.02);
    this.group.add(this.frame);

    this._applyTransform();
  }

  _applyTransform() {
    const { mountHeightM, offsetXM } = this.config;
    this.group.position.set(this.group.position.x, mountHeightM, offsetXM);
  }

  /** Versatz entlang der Bühnenwand (Z-Achse im Raum). */
  setOffsetXM(alongWallZ) {
    this.config.offsetXM = alongWallZ;
    this.group.position.z = alongWallZ;
  }

  setMountHeight(m) {
    this.config.mountHeightM = m;
    this.group.position.y = m;
  }

  updateConfig(partial) {
    Object.assign(this.config, partial);
    this._build();
  }

  setPitchMm(pitchMm) {
    this.updateConfig({ pitchMm });
  }

  getStats() {
    const { widthM, heightM, pitchMm, cols, rows, cabinetWM, cabinetHM } =
      this.config;
    const res = resolutionFromWall(widthM, heightM, pitchMm);
    const clamped = clampTextureResolution(res.widthPx, res.heightPx);
    return {
      res,
      clamped,
      widthM,
      heightM,
      pitchMm,
      cabinets: { cols, rows, count: cols * rows, cabinetWM, cabinetHM },
    };
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material?.dispose();
      this.texture?.dispose();
    }
    if (this.frame) {
      this.frame.geometry.dispose();
      this.frame.material.dispose();
    }
  }
}
