"""
CricketLens AI - End-to-End Video Processing Pipeline
Integrates Ingestion -> YOLO Detection -> Multi-Object Tracking -> 
Team/Role Classification -> Homography -> Spatial Analytics -> ML Clustering -> Export.
"""

from typing import List, Dict, Tuple, Optional, Callable
import os
import json
import numpy as np
import cv2

from app.cv.detector import CricketDetector, Detection
from app.cv.tracker import CricketTracker
from app.cv.team_role_classifier import TeamAndRoleClassifier
from app.cv.homography import FieldHomography
from app.cv.ball_tracker import CricketBallTracker
from app.analytics.spatial_analytics import SpatialAnalyticsEngine
from app.analytics.pattern_discovery import PatternDiscoveryEngine
from app.config import TeamType, PlayerRole, FIELD_CONFIG

class VideoProcessingPipeline:
    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        homography_points: Optional[Dict] = None,
        device: str = "cpu"
    ):
        self.detector = CricketDetector(model_name=model_name, device=device)
        self.tracker = CricketTracker(max_age=25, min_hits=2, iou_threshold=0.25)
        self.classifier = TeamAndRoleClassifier()
        self.homography = FieldHomography(
            src_points=homography_points.get("camera_pixels") if homography_points else None,
            dst_points=homography_points.get("field_meters") if homography_points else None
        )
        self.spatial_engine = SpatialAnalyticsEngine()
        self.pattern_engine = PatternDiscoveryEngine()
        self.ball_tracker = CricketBallTracker(self.homography)

    def process_video(
        self,
        video_path: str,
        output_dir: str,
        sample_stride: int = 1,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict:
        """
        Executes end-to-end processing of a cricket broadcast video file.
        """
        os.makedirs(output_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video at {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        self.ball_tracker.fps = fps

        annotated_video_path = os.path.join(output_dir, "annotated_output.mp4")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(annotated_video_path, fourcc, fps / sample_stride, (width, height))

        frames_telemetry: List[Dict] = []
        frame_idx = 0
        processed_count = 0

        # Maintain track history for distance calculation
        track_trajectories: Dict[int, List[Tuple[float, float]]] = {}

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % sample_stride != 0:
                continue

            processed_count += 1
            if progress_callback and total_frames > 0:
                pct = round((frame_idx / total_frames) * 100, 1)
                progress_callback(pct, f"Processing frame {frame_idx}/{total_frames}")

            # 1. Detect Players & Ball
            player_dets, ball_det = self.detector.detect_frame(frame)

            # 2. Track Players
            active_tracks = self.tracker.update(player_dets)

            # 3. Track Ball
            ball_state = self.ball_tracker.update(ball_det, frame_idx)

            # 4. Process each player: Homography + Team + Role
            current_frame_players = []
            annotated_frame = frame.copy()

            for trk in active_tracks:
                u, v = trk.get_ground_point()
                field_x, field_y = self.homography.image_to_field(u, v)
                
                # Classify role
                role, r_conf = self.classifier.classify_role(field_x, field_y)
                
                # Extract jersey color & team
                jersey_rgb = self.classifier.extract_jersey_color(frame, trk.bbox)
                team, t_conf = self.classifier.classify_team(jersey_rgb, role_hint=role)

                # Store trajectory
                if trk.id not in track_trajectories:
                    track_trajectories[trk.id] = []
                track_trajectories[trk.id].append((field_x, field_y))

                # Compute kinematics
                kinematics = self.spatial_engine.compute_kinematics(track_trajectories[trk.id], fps=fps)

                p_info = {
                    "track_id": trk.id,
                    "bbox": [round(b, 1) for b in trk.bbox],
                    "ground_pixel": [u, v],
                    "field_pos": [field_x, field_y],
                    "role": role.value,
                    "team": team.value,
                    "color_rgb": jersey_rgb.tolist(),
                    "confidence": round(trk.confidence, 2),
                    "speed_kmh": kinematics["avg_speed_kmh"],
                    "total_distance_m": kinematics["total_distance_m"]
                }
                current_frame_players.append(p_info)

                # Draw annotation box on frame
                box_color = (255, 144, 30) if team == TeamType.FIELDING else ((0, 215, 255) if team == TeamType.BATTING else (200, 200, 200))
                bx1, by1, bx2, by2 = [int(b) for b in trk.bbox]
                cv2.rectangle(annotated_frame, (bx1, by1), (bx2, by2), box_color, 2)
                
                label = f"#{trk.id} {role.value.split('_')[0].upper()} ({kinematics['avg_speed_kmh']}kph)"
                cv2.putText(annotated_frame, label, (bx1, max(15, by1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

            # Draw Ball
            if ball_state is not None:
                bu, bv = [int(x) for x in ball_state.pixel_pos]
                cv2.circle(annotated_frame, (bu, bv), 5, (0, 0, 255), -1)
                cv2.circle(annotated_frame, (bu, bv), 6, (255, 255, 255), 1)

            # Draw pitch outline overlay for visual calibration feedback
            pitch_pts = self.homography.src_points.astype(np.int32)
            cv2.polylines(annotated_frame, [pitch_pts], True, (0, 255, 255), 1)

            out.write(annotated_frame)

            # Separate fielders (excluding batsmen) for field coverage
            fielder_field_coords = [
                (p["field_pos"][0], p["field_pos"][1]) for p in current_frame_players 
                if p["role"] not in [PlayerRole.BATSMAN_STRIKER.value, PlayerRole.BATSMAN_NON_STRIKER.value]
            ]

            field_dist = self.spatial_engine.compute_field_distribution(fielder_field_coords)
            voronoi = self.spatial_engine.compute_voronoi_coverage(fielder_field_coords)

            frames_telemetry.append({
                "frame_idx": frame_idx,
                "timestamp_sec": round(frame_idx / fps, 2),
                "players": current_frame_players,
                "ball": {
                    "pixel": ball_state.pixel_pos if ball_state else None,
                    "field": ball_state.field_pos if ball_state else None,
                    "speed_kmh": self.ball_tracker.speed_kmh
                } if ball_state else None,
                "field_distribution": field_dist,
                "voronoi_coverage_pct": voronoi["coverage_percentage"]
            })

        cap.release()
        out.release()

        # Final delivery summary metrics
        ball_summary = self.ball_tracker.get_trajectory_summary()
        mot_metrics = self.tracker.get_tracking_metrics()

        # Build feature vector & tactical summary from median frame
        median_idx = len(frames_telemetry) // 2 if frames_telemetry else 0
        median_frame = frames_telemetry[median_idx] if frames_telemetry else {}

        result_data = {
            "metadata": {
                "video_file": os.path.basename(video_path),
                "total_frames": total_frames,
                "processed_frames": len(frames_telemetry),
                "fps": fps,
                "annotated_video_path": annotated_video_path
            },
            "frames": frames_telemetry,
            "ball_trajectory": ball_summary,
            "tracking_evaluation": mot_metrics,
            "calibration": self.homography.get_calibration_info(),
            "status": "completed"
        }

        # Save JSON telemetry
        json_output_path = os.path.join(output_dir, "analysis_results.json")
        with open(json_output_path, "w") as f:
            json.dump(result_data, f, indent=2)

        return result_data

