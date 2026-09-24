"""
Unit tests for Homography and Field Calibration
"""
import pytest
import numpy as np
from app.cv.homography import FieldHomography
from app.config import DEFAULT_CAMERA_CALIBRATION_POINTS

def test_homography_reprojection():
    homography = FieldHomography()
    assert homography.H is not None
    assert homography.reprojection_error < 0.5

    # Test mapping camera pixel to field
    field_x, field_y = homography.image_to_field(570.0, 360.0)
    assert abs(field_x - (-1.52)) < 0.5
    assert abs(field_y - 8.84) < 0.5

def test_homography_inverse():
    homography = FieldHomography()
    u, v = homography.field_to_image(-1.52, 8.84)
    assert abs(u - 570.0) < 5.0
    assert abs(v - 360.0) < 5.0

