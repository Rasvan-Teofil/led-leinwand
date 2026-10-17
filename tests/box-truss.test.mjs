import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  BoxTrussBuilder,
  TRUSS_BASE_PLATE_T,
  TRUSS_CHORD_OFFSET_M,
  TRUSS_PANEL_M,
  TRUSS_SECTION_M,
  TRUSS_SEGMENT_M,
} from '../prototype/js/box-truss.js';
import { buildHangingTruss } from '../prototype/js/led-truss.js';

const EPS = 1e-6;
const FACE_WIDTH = 2 * TRUSS_CHORD_OFFSET_M;

function distToLine(p, a, b) {
  const dir = b.clone().sub(a).normalize();
  const ap = p.clone().sub(a);
  return ap.sub(dir.multiplyScalar(ap.dot(dir))).length();
}

function axisParam(p, a, b) {
  const ab = b.clone().sub(a);
  return p.clone().sub(a).dot(ab) / ab.lengthSq();
}

const RUNS = [
  { name: 'lintel along X', start: [-2.395, 4.155, 0], end: [2.395, 4.155, 0] },
  { name: 'tower along Y', start: [0, 0.212, -1], end: [0, 4.01, -1] },
  { name: 'ceiling run along Z', start: [1.2, 4.65, -3.9], end: [1.2, 4.65, 3.9] },
];

describe('F34 box truss geometry', () => {
  for (const run of RUNS) {
    describe(run.name, () => {
      const builder = new BoxTrussBuilder();
      builder.addRun(run.start, run.end);
      const { chordLines, diagonals, rungs } = builder.getDebugGeometry();
      const a = new THREE.Vector3(...run.start);
      const b = new THREE.Vector3(...run.end);
      const axisDir = b.clone().sub(a).normalize();
      const runLen = a.distanceTo(b);

      it('has four chords on a 240 mm square (adjacent = face width)', () => {
        assert.equal(chordLines.length, 4);
        for (let i = 0; i < 4; i++) {
          const next = chordLines[(i + 1) % 4];
          const opposite = chordLines[(i + 2) % 4];
          assert.ok(Math.abs(chordLines[i].a.distanceTo(next.a) - FACE_WIDTH) < EPS);
          assert.ok(Math.abs(chordLines[i].a.distanceTo(opposite.a) - FACE_WIDTH * Math.SQRT2) < EPS);
          assert.ok(Math.abs(distToLine(chordLines[i].a, a, b) - FACE_WIDTH / Math.SQRT2) < EPS);
        }
      });

      it('every diagonal connects two adjacent chords and stays inside the truss', () => {
        const segments = Math.ceil(runLen / TRUSS_SEGMENT_M - 1e-6);
        assert.ok(diagonals.length >= segments * 4 * 2);
        for (const d of diagonals) {
          const sep = Math.abs(d.chordA - d.chordB);
          assert.ok(sep === 1 || sep === 3, `chords ${d.chordA}/${d.chordB} are not adjacent`);
          const lineA = chordLines[d.chordA];
          const lineB = chordLines[d.chordB];
          assert.ok(distToLine(d.p0, lineA.a, lineA.b) < EPS, 'diagonal start not on its chord');
          assert.ok(distToLine(d.p1, lineB.a, lineB.b) < EPS, 'diagonal end not on its chord');
          for (const p of [d.p0, d.p1]) {
            const t = axisParam(p, a, b);
            assert.ok(t > 0 && t < 1, 'diagonal end outside the run');
            assert.ok(distToLine(p, a, b) <= FACE_WIDTH / Math.SQRT2 + EPS, 'diagonal end outside the section');
          }
          const along = Math.abs(d.p1.clone().sub(d.p0).dot(axisDir));
          assert.ok(along > 0.25 && along <= TRUSS_PANEL_M * 1.3, `panel length ${along}`);
          const len = d.p0.distanceTo(d.p1);
          assert.ok(Math.abs(len - Math.hypot(along, FACE_WIDTH)) < 1e-6, `diagonal length ${len}`);
        }
      });

      it('diagonals form a continuous zig-zag on each face', () => {
        const byFace = new Map();
        for (const d of diagonals) {
          const key = `${d.runId}:${d.face}`;
          if (!byFace.has(key)) byFace.set(key, []);
          byFace.get(key).push(d);
        }
        assert.equal(byFace.size, 4);
        for (const list of byFace.values()) {
          for (let i = 1; i < list.length; i++) {
            if (list[i].k === 0) continue;
            assert.ok(list[i - 1].p1.distanceTo(list[i].p0) < EPS, 'zig-zag is broken');
            assert.notEqual(list[i - 1].chordA, list[i].chordA, 'zig-zag does not alternate');
          }
        }
      });

      it('end frames have perpendicular rungs between adjacent chords', () => {
        assert.ok(rungs.length > 0);
        for (const r of rungs) {
          const v = r.p1.clone().sub(r.p0);
          assert.ok(Math.abs(v.dot(axisDir)) < EPS);
          assert.ok(Math.abs(v.length() - FACE_WIDTH) < EPS);
        }
      });

      it('instanced tubes reproduce their exact endpoints', () => {
        const group = builder.toGroup();
        const m = new THREE.Matrix4();
        for (const kind of ['chord', 'brace', 'coupler']) {
          const mesh = group.getObjectByName(`truss-${kind}`);
          const tubes = builder.tubes[kind];
          assert.equal(mesh.count, tubes.length);
          tubes.forEach((t, i) => {
            mesh.getMatrixAt(i, m);
            const p0 = new THREE.Vector3(0, -0.5, 0).applyMatrix4(m);
            const p1 = new THREE.Vector3(0, 0.5, 0).applyMatrix4(m);
            assert.ok(p0.distanceTo(t.p0) < 1e-6 && p1.distanceTo(t.p1) < 1e-6, `${kind} ${i} misplaced`);
          });
        }
      });
    });
  }

  it('towers stand on a base plate and end in a corner block', () => {
    const builder = new BoxTrussBuilder();
    builder.addTower(1, 2, 0.2, 4.2);
    assert.equal(builder.plates.length, 1);
    assert.ok(Math.abs(builder.plates[0].center.y - (0.2 + TRUSS_BASE_PLATE_T / 2)) < EPS);
    const chordTops = builder.debug.chordLines.map((l) => l.b.y);
    for (const y of chordTops) assert.ok(Math.abs(y - (4.2 - TRUSS_SECTION_M / 2)) < EPS);
  });
});

describe('LED hanging truss', () => {
  it('towers start on the stage and the lintel clears the panel top', () => {
    const g = buildHangingTruss({ widthM: 4, panelBottomY: 1.2, panelHeightM: 2.5, baseY: 0.2 });
    const plates = g.getObjectByName('truss-base-plates');
    assert.equal(plates.count, 2);
    const box = new THREE.Box3().setFromObject(g.getObjectByName('truss-chord'));
    assert.ok(Math.abs(box.min.y - (0.2 + TRUSS_BASE_PLATE_T)) < 1e-3, `tower foot at ${box.min.y}`);
    assert.ok(box.max.y > 3.7 + 0.3 && box.max.y < 4.5, `truss top at ${box.max.y}`);
    assert.ok(box.max.x > 2 + 0.2 && box.max.x < 2.6, 'towers sit beside the 4 m panel');
  });
});
