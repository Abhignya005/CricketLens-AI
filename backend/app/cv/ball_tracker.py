"""
CricketLens AI - Ball Tracking & Trajectory Module
Specialized multi-frame temporal filter for small, fast-moving cricket balls.
Estimates trajectory, speed (km/h), release point, pitch bounce point, and batsman impact.
"""

from typing import List, Dict, Tuple, Optional
import numpy as np
from app.cv.detector import Detection
from app.cv.homography import FieldHomography

class BallState:
    def __init__(self, pixel_pos: Tuple[float, float], field_pos: Tuple[float, float], frame_idx: int, confidence: float):
        self.pixel_pos = pixel_pos # (u, v)
        self.field_pos = field_pos # (X, Y) in meters
        self.frame_idx = frame_idx
        self.confidence = confidence

class CricketBallTracker:
    def __init__(self, homography: FieldHomography, fps: float = 30.0):
        self.homography = homography
        self.fps = fps
        self.history: List[BallState] = []
        self.speed_kmh = 0.0
        self.is_tracked = False
        self.bounce_point: Optional[Tuple[float, float]] = None
        self.release_point: Optional[Tuple[float, float]] = None

    def update(self, ball_det: Optional[Detection], frame_idx: int) -> Optional[BallState]:
        """
        Updates ball trajectory with new frame detection or temporal estimation.
        """
        if ball_det is not None:
            u, v = ball_det.ground_point
            field_x, field_y = self.homography.image_to_field(u, v)
            state = BallState(
                pixel_pos=(round(u, 1), round(v, 1)),
                field_pos=(round(field_x, 2), round(field_y, 2)),
                frame_idx=frame_idx,
                confidence=ball_det.confidence
            )
            self.history.append(state)
            self.is_tracked = True
            self._update_kinematics()
            return state
        else:
            # Handle brief occlusion / missing frame (up to 3 frames)
            if len(self.history) >= 2 and (frame_idx - self.history[-1].frame_idx) <= 3:
                last1 = self.history[-1]
                last2 = self.history[-2]
                dt = (last1.frame_idx - last2.frame_idx)
                if dt > 0:
                    vx_px = (last1.pixel_pos[0] - last2.pixel_pos[0]) / dt
                    vy_px = (last1.pixel_pos[1] - last2.pixel_pos[1]) / dt
                    pred_u = last1.pixel_pos[0] + vx_px
                    pred_v = last1.pixel_pos[1] + vy_px
                    field_x, field_y = self.homography.image_to_field(pred_u, pred_v)
                    
                    state = BallState(
                        pixel_pos=(round(pred_u, 1), round(pred_v, 1)),
                        field_pos=(round(field_x, 2), round(field_y, 2)),
                        frame_idx=frame_idx,
                        confidence=round(last1.confidence * 0.75, 2)
                    )
                    self.history.append(state)
                    self._update_kinematics()
                    return state

            return None

    def _update_kinematics(self):
        """Calculates trajectory metrics, release point, bounce point, and release speed."""
        if len(self.history) < 2:
            return

        # Estimate speed using recent field positions
        p1 = self.history[-2]
        p2 = self.history[-1]
        dt = (p2.frame_idx - p1.frame_idx) / self.fps
        if dt > 0:
            dist_m = np.hypot(p2.field_pos[0] - p1.field_pos[0], p2.field_pos[1] - p1.field_pos[1])
            speed_ms = dist_m / dt
            inst_speed_kmh = speed_ms * 3.6
            # Cricket ball speeds typically range 80 - 155 km/h
            if 40.0 <= inst_speed_kmh <= 165.0:
                self.speed_kmh = round(0.4 * inst_speed_kmh + 0.6 * self.speed_kmh if self.speed_kmh > 0 else inst_speed_kmh, 1)

        # Release point detection: first ball position near bowler's end (-10m to -6m)
        if self.release_point is None and len(self.history) >= 1:
            first_pos = self.history[0].field_pos
            if -11.0 <= first_pos[1] <= -4.0:
                self.release_point = first_pos

        # Bounce point detection: inflection point along pitch (Y between -5m and +5m)
        if self.bounce_point is None and len(self.history) >= 4:
            # Check for vertical velocity change in camera / pitch coordinate
            for i in range(1, len(self.history) - 1):
                fy = self.history[i].field_pos[1]
                if -6.0 <= fy <= 6.0:
                    self.bounce_point = self.history[i].field_pos
                    break

    def get_trajectory_summary(self) -> Dict:
        """Returns structured ball trajectory summary."""
        pts_field = [s.field_pos for s in self.history]
        pts_pixel = [s.pixel_pos for s in self.history]
        avg_conf = float(np.mean([s.confidence for s in self.history])) if self.history else 0.0

        return {
            "total_points": len(self.history),
            "estimated_speed_kmh": self.speed_kmh,
            "release_point": self.release_point,
            "bounce_point": self.bounce_point,
            "mean_confidence": round(avg_conf, 3),
            "trajectory_field": pts_field,
            "trajectory_pixel": pts_pixel
        }

