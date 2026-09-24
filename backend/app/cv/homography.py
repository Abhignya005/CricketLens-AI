"""
CricketLens AI - Field Calibration & Homography Transformation Module
Transforms 2D broadcast camera coordinates (pixels) into real-world 2D Top-Down Field coordinates (meters).
"""

from typing import List, Tuple, Optional, Dict
import numpy as np
import cv2
from app.config import DEFAULT_CAMERA_CALIBRATION_POINTS, FIELD_CONFIG

class FieldHomography:
    def __init__(self, src_points: Optional[List[List[float]]] = None, dst_points: Optional[List[List[float]]] = None):
        """
        Initialize field homography matrix H.
        src_points: 4 or more points in image pixel coordinates [[u1, v1], [u2, v2], ...]
        dst_points: Corresponding points in ground metric coordinates [[X1, Y1], [X2, Y2], ...]
        """
        if src_points is None or dst_points is None:
            src_points = DEFAULT_CAMERA_CALIBRATION_POINTS["camera_pixels"]
            dst_points = DEFAULT_CAMERA_CALIBRATION_POINTS["field_meters"]
            
        self.src_points = np.array(src_points, dtype=np.float32)
        self.dst_points = np.array(dst_points, dtype=np.float32)
        self.H = None
        self.H_inv = None
        self.reprojection_error = 0.0
        self.compute_homography()

    def compute_homography(self) -> np.ndarray:
        """Computes Homography matrix and inverse using OpenCV."""
        if len(self.src_points) < 4 or len(self.dst_points) < 4:
            raise ValueError("At least 4 correspondence points are required for Homography.")
            
        self.H, status = cv2.findHomography(self.src_points, self.dst_points, cv2.RANSAC, 5.0)
        if self.H is not None:
            self.H_inv = np.linalg.inv(self.H)
            self._calculate_reprojection_error()
        return self.H

    def _calculate_reprojection_error(self):
        """Calculates mean reprojection error across calibration points in meters."""
        if self.H is None:
            return
        transformed = self.image_to_field_batch(self.src_points)
        diffs = transformed - self.dst_points
        errors = np.linalg.norm(diffs, axis=1)
        self.reprojection_error = float(np.mean(errors))

    def image_to_field(self, u: float, v: float) -> Tuple[float, float]:
        """
        Transforms a single image point (u, v) into field ground coordinates (X, Y) in meters.
        u: pixel x (width)
        v: pixel y (height - typically bottom center of player bounding box)
        """
        if self.H is None:
            return (0.0, 0.0)
        
        pt = np.array([[[u, v]]], dtype=np.float32)
        mapped_pt = cv2.perspectiveTransform(pt, self.H)
        x_m = float(mapped_pt[0][0][0])
        y_m = float(mapped_pt[0][0][1])
        
        # Clamp to realistic ground boundary oval with safety margin
        max_rx = FIELD_CONFIG["BOUNDARY_RADIUS_X"] + 15.0
        max_ry = FIELD_CONFIG["BOUNDARY_RADIUS_Y"] + 15.0
        x_m = float(np.clip(x_m, -max_rx, max_rx))
        y_m = float(np.clip(y_m, -max_ry, max_ry))
        return (round(x_m, 2), round(y_m, 2))

    def image_to_field_batch(self, points: np.ndarray) -> np.ndarray:
        """Batch transforms Nx2 image points to Nx2 field points."""
        if self.H is None or len(points) == 0:
            return np.zeros_like(points)
        pts = np.array(points, dtype=np.float32).reshape(-1, 1, 2)
        mapped = cv2.perspectiveTransform(pts, self.H)
        return mapped.reshape(-1, 2)

    def field_to_image(self, x: float, y: float) -> Tuple[float, float]:
        """Transforms top-down field coordinate (X, Y) back into camera pixel coordinates (u, v)."""
        if self.H_inv is None:
            return (0.0, 0.0)
        pt = np.array([[[x, y]]], dtype=np.float32)
        mapped_pt = cv2.perspectiveTransform(pt, self.H_inv)
        u = float(mapped_pt[0][0][0])
        v = float(mapped_pt[0][0][1])
        return (round(u, 1), round(v, 1))

    def update_calibration(self, src_points: List[List[float]], dst_points: Optional[List[List[float]]] = None) -> Dict:
        """Update calibration points and recalculate homography matrix."""
        self.src_points = np.array(src_points, dtype=np.float32)
        if dst_points is not None:
            self.dst_points = np.array(dst_points, dtype=np.float32)
        self.compute_homography()
        return {
            "reprojection_error_meters": round(self.reprojection_error, 3),
            "matrix": self.H.tolist() if self.H is not None else [],
            "status": "success" if self.H is not None else "failed"
        }

    def get_calibration_info(self) -> Dict:
        return {
            "src_points": self.src_points.tolist(),
            "dst_points": self.dst_points.tolist(),
            "reprojection_error_m": round(self.reprojection_error, 3),
            "matrix": self.H.tolist() if self.H is not None else []
        }

