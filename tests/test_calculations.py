"""Tests for LED calculation helpers (mirrors prototype/js/calculations.js)."""

import math
import unittest


def meters_to_pixels(meters: float, pitch_mm: float) -> int:
    if pitch_mm <= 0:
        return 0
    return max(1, round((meters * 1000) / pitch_mm))


def viewing_distance_rule_of_thumb(pitch_mm: float) -> dict:
    min_m = pitch_mm
    return {
        "min_m": min_m,
        "comfortable_min_m": min_m * 2,
        "comfortable_max_m": min_m * 3,
    }


def clamp_texture_resolution(width_px: int, height_px: int, max_pixels: int = 4096) -> dict:
    max_dim = max(width_px, height_px)
    if max_dim <= max_pixels:
        return {"width_px": width_px, "height_px": height_px, "scaled": False}
    scale = max_pixels / max_dim
    return {
        "width_px": max(1, round(width_px * scale)),
        "height_px": max(1, round(height_px * scale)),
        "scaled": True,
    }


class CalculationsTest(unittest.TestCase):
    def test_meters_to_pixels_39_pitch(self):
        # 4 m wide wall @ 3.9 mm pitch
        px = meters_to_pixels(4.0, 3.9)
        self.assertEqual(px, 1026)

    def test_viewing_distance_39(self):
        v = viewing_distance_rule_of_thumb(3.9)
        self.assertAlmostEqual(v["min_m"], 3.9)
        self.assertAlmostEqual(v["comfortable_min_m"], 7.8)

    def test_clamp_large_wall(self):
        r = clamp_texture_resolution(8000, 4500)
        self.assertTrue(r["scaled"])
        self.assertLessEqual(max(r["width_px"], r["height_px"]), 4096)

    def test_grid_cabinet_count(self):
        cols, rows = 8, 5
        self.assertEqual(cols * rows, 40)


def snap_mismatch(cols, rows, cab_w, cab_h, target_w, target_h):
    width_m = cols * cab_w
    height_m = rows * cab_h
    return abs(target_w - width_m) > 0.001 or abs(target_h - height_m) > 0.001


class SnapGridTest(unittest.TestCase):
    def test_8x5_snaps_4x2_5(self):
        self.assertFalse(snap_mismatch(8, 5, 0.5, 0.5, 4.0, 2.5))

    def test_8x5_mismatch_2_25_height(self):
        self.assertTrue(snap_mismatch(8, 5, 0.5, 0.5, 4.0, 2.25))


if __name__ == "__main__":
    unittest.main()
