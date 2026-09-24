"""
CricketLens AI - Sample Data & Synthetic Match Generator
Generates realistic multi-delivery cricket match telemetry, tactical shifts, 
and synthetic broadcast video clips for testing and immediate demonstration.
"""

from typing import List, Dict, Tuple
import os
import math
import numpy as np
import cv2
from app.config import FIELD_CONFIG, TeamType, PlayerRole, DEFAULT_CAMERA_CALIBRATION_POINTS
from app.cv.homography import FieldHomography
from app.analytics.spatial_analytics import SpatialAnalyticsEngine
from app.analytics.pattern_discovery import PatternDiscoveryEngine

class SampleDataGenerator:
    def __init__(self):
        self.homography = FieldHomography()
        self.spatial_engine = SpatialAnalyticsEngine()
        self.pattern_engine = PatternDiscoveryEngine()

    def generate_sample_deliveries(self) -> List[Dict]:
        """
        Generates a 6-delivery over with realistic fielding adjustments, ball paths, and movement.
        """
        scenarios = [
            {
                "over_ball": "14.1",
                "ball_type": "Good Length Outswinger",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "Attacking Powerplay / Early Spell (Slip Cordon)",
                "fielders_base": [
                    # (x, y, role, id)
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.2, 16.5, PlayerRole.WICKET_KEEPER, 4),
                    (4.5, 17.2, PlayerRole.FIELDER_INNER, 5), # 1st Slip
                    (7.8, 16.0, PlayerRole.FIELDER_INNER, 6), # 2nd Slip / Gully
                    (18.5, 12.0, PlayerRole.FIELDER_INNER, 7), # Backward Point
                    (22.0, 2.0, PlayerRole.FIELDER_INNER, 8),  # Extra Cover
                    (12.0, -18.0, PlayerRole.FIELDER_INNER, 9), # Mid-Off
                    (-10.0, -18.0, PlayerRole.FIELDER_INNER, 10), # Mid-On
                    (-24.0, 6.0, PlayerRole.FIELDER_INNER, 11),  # Square Leg
                    (-38.0, 48.0, PlayerRole.FIELDER_OUTFIELD, 12), # Fine Leg (Deep)
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13), # Third Man (Deep)
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (0.0, -6.0), (0.1, -2.0), (0.3, 2.5), (0.5, 6.2), (0.8, 8.8), (12.0, 16.0), (28.0, 22.0)
                ],
                "speed_kmh": 142.4
            },
            {
                "over_ball": "14.2",
                "ball_type": "Bouncer into the Ribs",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "Legside Trap (Fielder shifted from 2nd slip to Deep Square Leg)",
                "fielders_base": [
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.0, 17.0, PlayerRole.WICKET_KEEPER, 4),
                    (4.8, 17.5, PlayerRole.FIELDER_INNER, 5), # 1st Slip
                    (-48.0, 10.0, PlayerRole.FIELDER_OUTFIELD, 6), # Relocated to Deep Square Leg!
                    (18.0, 11.5, PlayerRole.FIELDER_INNER, 7), # Backward Point
                    (21.0, 2.5, PlayerRole.FIELDER_INNER, 8),  # Cover
                    (12.0, -18.0, PlayerRole.FIELDER_INNER, 9), # Mid-Off
                    (-10.0, -18.0, PlayerRole.FIELDER_INNER, 10), # Mid-On
                    (-20.0, 8.0, PlayerRole.FIELDER_INNER, 11),  # Short Leg / Square Leg
                    (-38.0, 48.0, PlayerRole.FIELDER_OUTFIELD, 12), # Deep Fine Leg
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13), # Deep Third Man
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (-0.1, -5.0), (-0.2, 0.0), (-0.3, 4.0), (-0.4, 8.8), (-18.0, 12.0), (-42.0, 11.0)
                ],
                "speed_kmh": 144.8
            },
            {
                "over_ball": "14.3",
                "ball_type": "Full Pitch Yorker on Off Stump",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "Straight Drive Containment (Mid-Off and Mid-On pushed back)",
                "fielders_base": [
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.0, 16.8, PlayerRole.WICKET_KEEPER, 4),
                    (4.8, 17.5, PlayerRole.FIELDER_INNER, 5),
                    (-48.0, 10.0, PlayerRole.FIELDER_OUTFIELD, 6),
                    (18.0, 11.5, PlayerRole.FIELDER_INNER, 7),
                    (21.0, 2.5, PlayerRole.FIELDER_INNER, 8),
                    (18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 9), # Relocated to Long-Off!
                    (-18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 10), # Relocated to Long-On!
                    (-20.0, 8.0, PlayerRole.FIELDER_INNER, 11),
                    (-38.0, 48.0, PlayerRole.FIELDER_OUTFIELD, 12),
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13),
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (0.0, -5.0), (0.1, 0.0), (0.2, 5.0), (0.2, 9.0), (5.0, -15.0), (14.0, -38.0)
                ],
                "speed_kmh": 139.2
            },
            {
                "over_ball": "14.4",
                "ball_type": "Slower Ball Off-Cutter",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "Cover Drive Trap (Extra Cover brought tighter, Deep Cover in place)",
                "fielders_base": [
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.0, 16.5, PlayerRole.WICKET_KEEPER, 4),
                    (45.0, 18.0, PlayerRole.FIELDER_OUTFIELD, 5), # Deep Point / Cover
                    (-48.0, 10.0, PlayerRole.FIELDER_OUTFIELD, 6),
                    (16.0, 10.0, PlayerRole.FIELDER_INNER, 7),
                    (18.0, 1.0, PlayerRole.FIELDER_INNER, 8),  # Tight Cover
                    (18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 9),
                    (-18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 10),
                    (-20.0, 8.0, PlayerRole.FIELDER_INNER, 11),
                    (-38.0, 48.0, PlayerRole.FIELDER_OUTFIELD, 12),
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13),
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (0.1, -4.5), (0.3, 0.5), (0.5, 5.5), (0.6, 9.0), (15.0, 6.0), (38.0, 14.0)
                ],
                "speed_kmh": 118.5
            },
            {
                "over_ball": "14.5",
                "ball_type": "Wide Line Hard Length",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "7-2 Offside Heavy Pack",
                "fielders_base": [
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.5, 16.8, PlayerRole.WICKET_KEEPER, 4),
                    (5.0, 18.0, PlayerRole.FIELDER_INNER, 5),  # 1st Slip
                    (14.0, 16.0, PlayerRole.FIELDER_INNER, 6), # Backward Point
                    (22.0, 8.0, PlayerRole.FIELDER_INNER, 7),  # Point
                    (24.0, -2.0, PlayerRole.FIELDER_INNER, 8), # Cover
                    (18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 9), # Long-Off
                    (48.0, 15.0, PlayerRole.FIELDER_OUTFIELD, 10), # Deep Cover
                    (-12.0, -20.0, PlayerRole.FIELDER_INNER, 11), # Mid-On
                    (-42.0, 40.0, PlayerRole.FIELDER_OUTFIELD, 12), # Deep Fine Leg
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13), # Third Man
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (0.2, -4.0), (0.6, 1.0), (1.1, 6.0), (1.4, 9.2), (3.5, 16.5)
                ],
                "speed_kmh": 141.0
            },
            {
                "over_ball": "14.6",
                "ball_type": "Straight Inswinger (Wicket Ball)",
                "batsman": "V. Kohli (RHB)",
                "bowler": "P. Cummins (RAF)",
                "tactical_intent": "Wicket Delivery - Inswinger LBW Appeal",
                "fielders_base": [
                    (0.0, 9.8, PlayerRole.BATSMAN_STRIKER, 1),
                    (2.5, -9.0, PlayerRole.BATSMAN_NON_STRIKER, 2),
                    (0.2, -10.5, PlayerRole.BOWLER, 3),
                    (1.0, 16.5, PlayerRole.WICKET_KEEPER, 4),
                    (4.8, 17.5, PlayerRole.FIELDER_INNER, 5),
                    (14.0, 16.0, PlayerRole.FIELDER_INNER, 6),
                    (22.0, 8.0, PlayerRole.FIELDER_INNER, 7),
                    (24.0, -2.0, PlayerRole.FIELDER_INNER, 8),
                    (18.0, -45.0, PlayerRole.FIELDER_OUTFIELD, 9),
                    (48.0, 15.0, PlayerRole.FIELDER_OUTFIELD, 10),
                    (-12.0, -20.0, PlayerRole.FIELDER_INNER, 11),
                    (-42.0, 40.0, PlayerRole.FIELDER_OUTFIELD, 12),
                    (42.0, 45.0, PlayerRole.FIELDER_OUTFIELD, 13),
                ],
                "ball_trajectory": [
                    (-0.1, -9.5), (-0.1, -5.0), (0.0, 0.0), (0.1, 5.0), (0.0, 9.8)
                ],
                "speed_kmh": 143.6
            }
        ]

        delivery_records = []
        prev_fielders = None

        for idx, item in enumerate(scenarios):
            raw_players = item["fielders_base"]
            # Separate fielders (exclude batsmen, bowler for field distribution calculations)
            fielders = [(p[0], p[1]) for p in raw_players if p[2] not in [PlayerRole.BATSMAN_STRIKER, PlayerRole.BATSMAN_NON_STRIKER]]
            
            # Compute spatial distribution
            dist_stats = self.spatial_engine.compute_field_distribution(fielders)
            voronoi_res = self.spatial_engine.compute_voronoi_coverage(fielders)
            
            # Format players list with pixel coords and colors
            players_formatted = []
            for px, py, role, p_id in raw_players:
                u, v = self.homography.field_to_image(px, py)
                team = TeamType.BATTING if "striker" in role.value else (TeamType.UMPIRE if role == PlayerRole.UMPIRE else TeamType.FIELDING)
                color = [30, 144, 255] if team == TeamType.FIELDING else ([255, 215, 0] if team == TeamType.BATTING else [220, 220, 220])
                players_formatted.append({
                    "id": p_id,
                    "x": px,
                    "y": py,
                    "pixel_x": u,
                    "pixel_y": v,
                    "role": role.value,
                    "team": team.value,
                    "color_rgb": color,
                    "speed_kmh": round(float(np.random.uniform(2.0, 18.5)), 1)
                })

            # Detect configuration change from previous ball
            change_stats = self.pattern_engine.detect_configuration_change(prev_fielders, fielders) if prev_fielders else {
                "changed_fielders_count": 0,
                "avg_displacement_m": 0.0,
                "max_displacement_m": 0.0,
                "shift_magnitude": "Initial Configuration",
                "relocated_details": []
            }
            prev_fielders = fielders

            # Proximity matrix
            prox_res = self.spatial_engine.compute_player_proximity_matrix(players_formatted)

            # Trajectory density
            density_res = self.spatial_engine.compute_spatial_density_grid(fielders, grid_size=25)

            delivery_records.append({
                "delivery_id": idx + 1,
                "over_ball": item["over_ball"],
                "ball_type": item["ball_type"],
                "batsman": item["batsman"],
                "bowler": item["bowler"],
                "tactical_intent": item["tactical_intent"],
                "speed_kmh": item["speed_kmh"],
                "fielders": fielders,
                "players": players_formatted,
                "distribution": dist_stats,
                "voronoi": voronoi_res,
                "proximity": prox_res,
                "density_grid": density_res,
                "change_from_prev": change_stats,
                "ball_trajectory_field": item["ball_trajectory"],
                "ball_trajectory_pixel": [self.homography.field_to_image(bx, by) for bx, by in item["ball_trajectory"]]
            })

        # Run clustering across deliveries
        cluster_res = self.pattern_engine.cluster_deliveries(delivery_records)
        for i, d in enumerate(delivery_records):
            d["cluster_label"] = cluster_res["delivery_labels"][i]

        return {
            "deliveries": delivery_records,
            "clustering": cluster_res,
            "match_info": {
                "title": "IND vs AUS - ICC World Cup Final / Spell Analysis",
                "venue": "Ahmedabad / Melbourne",
                "innings": 1,
                "current_over": "14.6",
                "total_deliveries_analyzed": len(delivery_records)
            }
        }

    def generate_synthetic_video(self, output_path: str, num_frames: int = 120, fps: int = 30) -> str:
        """
        Creates a synthetic broadcast cricket clip with pitch, creases, players, and moving ball.
        """
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        w, h = 1280, 720
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

        # Camera projection points
        calib_pts = DEFAULT_CAMERA_CALIBRATION_POINTS["camera_pixels"]
        pitch_poly = np.array(calib_pts, dtype=np.int32)

        for frame_i in range(num_frames):
            # Grass green background with subtle broadcast gradient
            frame = np.full((h, w, 3), (35, 115, 45), dtype=np.uint8)

            # Draw outer 30-yard circle perspective ellipse
            cv2.ellipse(frame, (640, 520), (520, 240), 0, 0, 360, (200, 230, 200), 2)

            # Draw Pitch polygon (clay/buff color)
            cv2.fillPoly(frame, [pitch_poly], (140, 185, 210))
            cv2.polylines(frame, [pitch_poly], True, (230, 240, 250), 2)

            # Draw Crease lines
            cv2.line(frame, (int(calib_pts[0][0]), int(calib_pts[0][1])), (int(calib_pts[1][0]), int(calib_pts[1][1])), (255, 255, 255), 2)
            cv2.line(frame, (int(calib_pts[3][0]), int(calib_pts[3][1])), (int(calib_pts[2][0]), int(calib_pts[2][1])), (255, 255, 255), 2)

            # Draw Stumps
            cv2.rectangle(frame, (636, 345), (644, 360), (240, 240, 240), -1)
            cv2.rectangle(frame, (636, 675), (644, 690), (240, 240, 240), -1)

            # Draw Batsman (Striker) near striker crease
            cv2.rectangle(frame, (628, 320), (652, 360), (0, 215, 255), -1) # Yellow jersey
            cv2.circle(frame, (640, 312), 7, (220, 220, 220), -1)

            # Draw Wicketkeeper behind striker
            cv2.rectangle(frame, (648, 280), (672, 320), (255, 144, 30), -1) # Blue jersey
            cv2.circle(frame, (660, 272), 7, (220, 220, 220), -1)

            # Draw Fielders
            fielder_px = [
                (760, 290), (880, 310), (1020, 380), (950, 520),
                (320, 380), (260, 480), (380, 560), (800, 640), (480, 640)
            ]
            for fx, fy in fielder_px:
                # Small micro-jitter for realism
                j_x = fx + int(1.5 * math.sin(frame_i * 0.1 + fx))
                j_y = fy + int(1.5 * math.cos(frame_i * 0.1 + fy))
                cv2.rectangle(frame, (j_x - 10, j_y - 28), (j_x + 10, j_y), (255, 144, 30), -1) # Blue
                cv2.circle(frame, (j_x, j_y - 34), 6, (220, 220, 220), -1)

            # Bowler run-up and delivery action (frames 0 to 45 run up, 45 release)
            progress = min(1.0, frame_i / 45.0)
            bowler_y = int(710 - progress * 40)
            bowler_x = int(610 + progress * 25)
            cv2.rectangle(frame, (bowler_x - 12, bowler_y - 32), (bowler_x + 12, bowler_y), (255, 144, 30), -1)
            cv2.circle(frame, (bowler_x, bowler_y - 38), 7, (220, 220, 220), -1)

            # Moving cricket ball after release (frame 45 onwards)
            if frame_i >= 45:
                ball_t = (frame_i - 45) / 40.0
                if ball_t <= 1.0:
                    # Trajectory towards batsman
                    ball_x = int(635 + ball_t * 5)
                    ball_y = int(670 - ball_t * 310)
                    cv2.circle(frame, (ball_x, ball_y), 5, (0, 0, 255), -1) # Red ball
                    cv2.circle(frame, (ball_x, ball_y), 6, (255, 255, 255), 1)
                else:
                    # Off the bat towards cover
                    bat_t = (frame_i - 85) / 35.0
                    ball_x = int(640 + bat_t * 340)
                    ball_y = int(360 + bat_t * 120)
                    cv2.circle(frame, (ball_x, ball_y), 5, (0, 0, 255), -1)

            # Watermark / overlay text
            cv2.putText(frame, f"CricketLens AI Live Broadcast Frame #{frame_i+1}", (30, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, "IND vs AUS - Over 14.1 | P. Cummins to V. Kohli", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 240, 255), 2)
            
            out.write(frame)

        out.release()
        return output_path

