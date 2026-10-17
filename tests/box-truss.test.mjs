import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BoxTrussBuilder,
  TRUSS_SECTION_M,
  TRUSS_SEGMENT_M,
} from '../prototype/js/box-truss.js';

const EPS = 0.04;

function distPointToSegment(p, a, b) {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  const closest = a.clone().add(ab.multiplyScalar(t));
  return p.distanceTo(closest);
}

function chordKey(p) {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
}

function collectChordNodes(chords) {
  const nodes = new Set();
  for (const { p0, p1 } of chords) {
    nodes.add(chordKey(p0));
    nodes.add(chordKey(p1));
  }
  return { nodes, chords };
}

function nodeOnChord(p, chords) {
  for (const { p0, p1 } of chords) {
    if (distPointToSegment(p, p0, p1) <= EPS) return true;
  }
  return false;
}

function braceInBoundingBox(p0, p1, chords) {
  const xs = [];
  const ys = [];
  const zs = [];
  for (const { p0: c0, p1: c1 } of chords) {
    xs.push(c0.x, c1.x);
    ys.push(c0.y, c1.y);
    zs.push(c0.z, c1.z);
  }
  const pad = TRUSS_SECTION_M * 0.6;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const minZ = Math.min(...zs) - pad;
  const maxZ = Math.max(...zs) + pad;
  for (const p of [p0, p1]) {
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY || p.z < minZ || p.z > maxZ) {
      return false;
    }
  }
  return true;
}

describe('box-truss braces', () => {
  it('diagonal endpoints lie on chord lines and lengths match face geometry', () => {
    const builder = new BoxTrussBuilder();
    builder.addRun([0, 2, -1], [0, 6, -1]);
    const { chords, braces } = builder.getDebugGeometry();
    assert.ok(braces.length > 0);

    const maxDiag = Math.hypot(TRUSS_SEGMENT_M, TRUSS_SECTION_M) + 0.08;
    const minDiag = TRUSS_SECTION_M * 0.85;

    for (const { p0, p1 } of braces) {
      const len = p0.distanceTo(p1);
      assert.ok(len <= maxDiag, `brace too long: ${len}`);
      assert.ok(len >= minDiag, `brace too short: ${len}`);
      assert.ok(nodeOnChord(p0, chords), 'brace start not on chord');
      assert.ok(nodeOnChord(p1, chords), 'brace end not on chord');
      assert.ok(braceInBoundingBox(p0, p1, chords), 'brace outside truss bounds');
    }
  });
});
