import * as THREE from 'three';

export function makeRugTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6e1418';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#8a1c22' : '#5c1014';
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 232, 232);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.2, 1.2);
  return tex;
}

export function addCeilingTruss(group, layout, roomHeightM) {
  const { stage, hallWidthM, halfD } = layout;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x888890,
    metalness: 0.7,
    roughness: 0.35,
  });
  const y = roomHeightM - 0.35;
  const t = 0.1;
  const spanZ = stage.lengthZ + 4;
  const spanX = hallWidthM * 0.55;
  const cx = (stage.xMin + stage.xMax) / 2 + 1.5;
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(spanX, t, t), mat);
    beam.position.set(cx, y, i * 1.8);
    group.add(beam);
  }
  for (let i = -3; i <= 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(t, t, spanZ), mat);
    beam.position.set(cx - spanX / 2 + (i + 3) * (spanX / 6), y, 0);
    group.add(beam);
  }

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.95 });
  for (let x = -hallWidthM / 2 + 2; x < hallWidthM / 2; x += 3.5) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, halfD * 1.6), beamMat);
    b.position.set(x, roomHeightM - 0.25, 0);
    group.add(b);
  }
}

export function addStageDressing(group, layout) {
  const { stage } = layout;
  const cx = (stage.xMin + stage.xMax) / 2;
  const cz = (stage.zMin + stage.zMax) / 2;
  const depth = stage.xMax - stage.xMin;
  const len = stage.zMax - stage.zMin;

  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, stage.heightM + 0.02, len + 0.2),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 })
  );
  skirt.position.set(stage.xMax + 0.02, stage.heightM / 2, cz);
  group.add(skirt);

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a52,
    roughness: 0.98,
    side: THREE.DoubleSide,
  });
  const curtain = new THREE.Mesh(
    new THREE.PlaneGeometry(len * 0.95, layout.roomHeightM - 0.8),
    curtainMat
  );
  curtain.position.set(stage.xMin - 0.08, (layout.roomHeightM - 0.8) / 2 + stage.heightM, cz);
  curtain.rotation.y = Math.PI / 2;
  group.add(curtain);

  for (let i = 0; i < 14; i++) {
    const fold = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, layout.roomHeightM - 1, 0.08),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x3e3e46 : 0x52525c })
    );
    fold.position.set(
      stage.xMin - 0.06,
      (layout.roomHeightM - 1) / 2 + 0.3,
      cz - len / 2 + 0.35 + i * (len / 14)
    );
    group.add(fold);
  }

  addCross(group, stage.xMin + depth * 0.35, stage.heightM + 1.6, cz + 0.5);
  addDrumKit(group, stage.xMin + depth * 0.25, stage.heightM, cz - 1.8);
  addKeyboard(group, stage.xMin + depth * 0.55, stage.heightM, cz + 1.6);
}

function addCross(group, x, y, z) {
  const wood = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.75 });
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), wood);
  const h = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), wood);
  v.position.set(x, y, z);
  h.position.set(x, y + 0.35, z);
  group.add(v, h);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: 0xffe8a8,
    emissiveIntensity: 1.2,
  });
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bulbMat);
    const t = i / 8;
    b.position.set(x + Math.sin(t * Math.PI * 2) * 0.45, y + 0.35, z + Math.cos(t * Math.PI * 2) * 0.08);
    group.add(b);
  }
}

function addDrumKit(group, x, y, z) {
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.7 });
  const cym = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
  const bass = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 20), drumMat);
  bass.position.set(x, y + 0.35, z);
  group.add(bass);
  const snare = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16), drumMat);
  snare.position.set(x + 0.35, y + 0.55, z + 0.25);
  group.add(snare);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.01, 20), cym);
  c.position.set(x + 0.1, y + 1.1, z - 0.2);
  group.add(c);
}

function addKeyboard(group, x, y, z) {
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.9, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  stand.position.set(x, y + 0.45, z);
  group.add(stand);
  const keys = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  keys.position.set(x, y + 0.92, z);
  group.add(keys);
}

export function addKleingruppenCabinet(group, layout) {
  const { ledPlaneX, halfD } = layout;
  const x = ledPlaneX + 9;
  const z = halfD * 0.35;
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.65, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.85 })
  );
  cab.position.set(x, 0.825, z);
  group.add(cab);
  const label = makeTextSprite('KLEINGRUPPEN');
  label.position.set(x + 0.3, 1.55, z);
  label.scale.set(1.6, 0.4, 1);
  group.add(label);
}

function makeTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  return new THREE.Sprite(mat);
}
