import { Document, NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'fs';

const doc = new Document();
const buffer = doc.createBuffer();
const pos = doc.createAccessor()
  .setType('VEC3')
  .setArray(new Float32Array([
    -0.22, 0, -0.22, 0.22, 0, -0.22, 0.22, 0, 0.22, -0.22, 0, 0.22,
    -0.22, 0.45, -0.22, 0.22, 0.45, -0.22, 0.22, 0.45, 0.22, -0.22, 0.45, 0.22,
    -0.22, 0.45, -0.05, 0.22, 0.45, -0.05, 0.22, 0.85, -0.05, -0.22, 0.85, -0.05,
  ]))
  .setBuffer(buffer);
const idx = doc.createAccessor()
  .setType('SCALAR')
  .setArray(new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    4, 5, 1, 4, 1, 0,
    7, 3, 2, 7, 2, 6,
    5, 6, 2, 5, 2, 1,
    4, 0, 3, 4, 3, 7,
    8, 9, 10, 8, 10, 11,
  ]))
  .setBuffer(buffer);
const prim = doc.createPrimitive()
  .setIndices(idx)
  .setAttribute('POSITION', pos);
const mat = doc.createMaterial().setBaseColorFactor([0.12, 0.12, 0.14, 1]);
prim.setMaterial(mat);
const mesh = doc.createMesh().addPrimitive(prim);
const node = doc.createNode().setMesh(mesh);
doc.createScene().addChild(node);

const io = new NodeIO();
const bytes = await io.writeBinary(doc);
writeFileSync('prototype/assets/chair/chair.glb', Buffer.from(bytes));
console.log('wrote chair.glb', bytes.byteLength);
