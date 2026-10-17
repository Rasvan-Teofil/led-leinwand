import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HALL_FOOTPRINT_XZ,
  footprintBounds,
  footprintSpanZ,
  offsetOutline,
  pointInFootprint,
  signedArea,
} from '../prototype/js/room-footprint.js';
import { resolveRoomLayout } from '../prototype/js/room-layout.js';
import { collectSeatTransforms, facingFromYaw } from '../prototype/js/seat-layout.js';

const L = resolveRoomLayout();
const CHAIR_W = 0.48;
const CHAIR_D = 0.52;

describe('hall outline from the floor plan', () => {
  it('stage is 8 m × 3 m × 0.2 m against the left wall', () => {
    const s = L.stage;
    assert.ok(Math.abs(s.lengthZ - 8) < 1e-9);
    assert.ok(Math.abs(s.depthX - 3) < 0.05);
    assert.equal(s.heightM, 0.2);
    for (const [x, z] of [
      [s.xMin, s.zMin],
      [s.xMin, s.zMax],
      [s.xMax, s.zMin],
      [s.xMax, s.zMax],
    ]) {
      assert.ok(pointInFootprint(x, z), `stage corner ${x},${z} outside the hall`);
    }
    assert.ok(s.xMin - L.minX < 0.7, 'stage is not against the back wall');
  });

  it('room proportions match the plan', () => {
    const b = footprintBounds();
    assert.ok(b.widthX > 18.5 && b.widthX < 19.5, `hall length ${b.widthX}`);
    const atStage = footprintSpanZ(L.stage.xMin + 0.5);
    assert.ok(atStage.zMax - atStage.zMin > 8.3 && atStage.zMax - atStage.zMin < 8.7);
    assert.ok(b.depthZ > 9.3 && b.depthZ < 9.9, `max width ${b.depthZ}`);
  });

  it('wall ring lies outside the inner outline', () => {
    const outer = offsetOutline(HALL_FOOTPRINT_XZ, 0.25);
    assert.ok(Math.abs(signedArea(outer)) > Math.abs(signedArea(HALL_FOOTPRINT_XZ)));
    for (const p of outer) assert.ok(!pointInFootprint(p.x, p.z), 'outer wall vertex inside the hall');
    for (const p of HALL_FOOTPRINT_XZ) assert.ok(pointInFootprint(p.x, p.z, outer));
  });
});

describe('seating blocks from the floor plan', () => {
  const seats = collectSeatTransforms();

  it('7×4 straight middle block, 7×3 upper wing, 5×3 lower wing', () => {
    const count = (id) => seats.filter((s) => s.block === id).length;
    assert.equal(count('mitte'), 28);
    assert.equal(count('oben'), 21);
    assert.equal(count('unten'), 15);
  });

  it('every chair lies completely inside the hall, in front of the stage', () => {
    for (const s of seats) {
      const f = facingFromYaw(s.rotY);
      const side = { x: -f.z, z: f.x };
      for (const [u, v] of [
        [CHAIR_D / 2, CHAIR_W / 2],
        [CHAIR_D / 2, -CHAIR_W / 2],
        [-CHAIR_D / 2, CHAIR_W / 2],
        [-CHAIR_D / 2, -CHAIR_W / 2],
      ]) {
        const x = s.x + f.x * u + side.x * v;
        const z = s.z + f.z * u + side.z * v;
        assert.ok(pointInFootprint(x, z), `${s.block} r${s.row} s${s.seat} sticks out of the hall`);
        assert.ok(x > L.stage.xMax + 0.5, `${s.block} r${s.row} s${s.seat} too close to the stage`);
      }
    }
  });

  it('no two chairs overlap', () => {
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const d = Math.hypot(seats[i].x - seats[j].x, seats[i].z - seats[j].z);
        assert.ok(d >= CHAIR_W, `chairs ${i} and ${j} overlap (${d.toFixed(2)} m)`);
      }
    }
  });

  it('all chairs face the stage; wings are turned toward the centre', () => {
    const target = { x: L.stage.xMin + L.stage.depthX / 2, z: L.stage.centerZ };
    for (const s of seats) {
      const f = facingFromYaw(s.rotY);
      const tx = target.x - s.x;
      const tz = target.z - s.z;
      const cos = (f.x * tx + f.z * tz) / Math.hypot(tx, tz);
      assert.ok(cos > 0.8, `${s.block} r${s.row} s${s.seat} looks away from the stage`);
      if (s.block === 'oben') assert.ok(f.z > 0.3);
      if (s.block === 'unten') assert.ok(f.z < -0.3);
      if (s.block === 'mitte') assert.ok(Math.abs(f.z) < 1e-9);
    }
  });
});

describe('camera presets', () => {
  it('stand inside the hall, in the audience, facing the stage', () => {
    for (const [key, vp] of Object.entries(L.viewpoints)) {
      assert.ok(pointInFootprint(vp.x, vp.z), `${key} outside the hall`);
      assert.ok(vp.x > L.stage.xMax + 1, `${key} not in the audience`);
      assert.ok(vp.eyeY > 1 && vp.eyeY < 1.8);
    }
  });
});
