"""
CricketLens AI - Team and Role Classification Module
Uses jersey color clustering and spatial positioning heuristics to assign team and tactical roles.
"""

from typing import List, Dict, Tuple, Optional
import numpy as np
import cv2
from sklearn.cluster import KMeans
from app.config import TeamType, PlayerRole, FIELD_CONFIG

class TeamAndRoleClassifier:
    def __init__(self):
        self.fielding_team_color = [30, 144, 255] # Default Dodger Blue (RGB)
        self.batting_team_color = [255, 215, 0]   # Default Gold/Yellow (RGB)
        self.umpire_color = [30, 30, 30]          # Black / Dark Grey (RGB)
        self.color_model_fitted = False

    def extract_jersey_color(self, frame: np.ndarray, bbox: List[float]) -> np.ndarray:
        """
        Extracts dominant color of player's upper torso (20% to 55% of bbox height).
        Returns RGB array [R, G, B].
        """
        h_frame, w_frame = frame.shape[:2]
        x1 = max(0, int(bbox[0]))
        y1 = max(0, int(bbox[1]))
        x2 = min(w_frame, int(bbox[2]))
        y2 = min(h_frame, int(bbox[3]))

        box_w = x2 - x1
        box_h = y2 - y1

        if box_w < 6 or box_h < 12:
            return np.array([128, 128, 128], dtype=np.uint8)

        # Upper torso crop
        torso_y1 = int(y1 + 0.15 * box_h)
        torso_y2 = int(y1 + 0.55 * box_h)
        torso_x1 = int(x1 + 0.15 * box_w)
        torso_x2 = int(x2 - 0.15 * box_w)

        if torso_x2 <= torso_x1 or torso_y2 <= torso_y1:
            return np.array([128, 128, 128], dtype=np.uint8)

        crop = frame[torso_y1:torso_y2, torso_x1:torso_x2]
        if crop.size == 0:
            return np.array([128, 128, 128], dtype=np.uint8)

        # Convert to RGB and find median color
        rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        pixels = rgb_crop.reshape(-1, 3)
        median_color = np.median(pixels, axis=0).astype(np.uint8)
        return median_color

    def classify_team(self, rgb_color: np.ndarray, role_hint: Optional[str] = None) -> Tuple[TeamType, float]:
        """
        Classifies team based on jersey color distance to team templates.
        """
        if role_hint in [PlayerRole.BATSMAN_STRIKER, PlayerRole.BATSMAN_NON_STRIKER]:
            return TeamType.BATTING, 0.92
        if role_hint == PlayerRole.UMPIRE:
            return TeamType.UMPIRE, 0.95

        # Euclidean distance in RGB
        dist_fielding = np.linalg.norm(rgb_color - np.array(self.fielding_team_color))
        dist_batting = np.linalg.norm(rgb_color - np.array(self.batting_team_color))
        dist_umpire = np.linalg.norm(rgb_color - np.array(self.umpire_color))

        min_dist = min(dist_fielding, dist_batting, dist_umpire)
        
        # Confidence score inversely proportional to relative color distance
        total_dist = dist_fielding + dist_batting + 1e-5
        conf = float(1.0 - (min_dist / total_dist))
        conf = round(max(0.65, min(0.98, conf)), 2)

        if min_dist == dist_umpire and np.mean(rgb_color) < 70:
            return TeamType.UMPIRE, conf
        elif min_dist == dist_fielding:
            return TeamType.FIELDING, conf
        else:
            return TeamType.BATTING, conf

    def classify_role(self, field_x: float, field_y: float, is_bowling_action: bool = False) -> Tuple[PlayerRole, float]:
        """
        Infers player role using top-down pitch and field coordinates (X, Y in meters).
        """
        # Striker crease is at Y = 8.84m to 10.06m, X around 0m
        striker_crease_y = FIELD_CONFIG["STRIKER_POPPING_CREASE_Y"]
        bowler_crease_y = FIELD_CONFIG["BOWLER_POPPING_CREASE_Y"]
        inner_r = FIELD_CONFIG["INNER_CIRCLE_RADIUS"]
        dist_from_pitch_center = np.hypot(field_x, field_y)

        # 1. Striker Batsman
        if abs(field_y - striker_crease_y) <= 1.8 and abs(field_x) <= 2.2:
            return PlayerRole.BATSMAN_STRIKER, 0.94

        # 2. Wicketkeeper (behind striker stumps Y > 10.5m, centered)
        if 10.5 <= field_y <= 24.0 and abs(field_x) <= 4.5:
            return PlayerRole.WICKET_KEEPER, 0.92

        # 3. Non-Striker Batsman (near bowler's crease, to one side of pitch)
        if abs(field_y - bowler_crease_y) <= 2.5 and 1.2 <= abs(field_x) <= 4.0:
            return PlayerRole.BATSMAN_NON_STRIKER, 0.90

        # 4. Bowler (near bowler's end stumps or approaching pitch)
        if is_bowling_action or (abs(field_y - bowler_crease_y) <= 3.0 and abs(field_x) <= 1.5):
            return PlayerRole.BOWLER, 0.88

        # 5. Umpire positions:
        # Bowler's end umpire (Y <= -11.0m, near center X)
        if -16.0 <= field_y <= -10.5 and abs(field_x) <= 2.5:
            return PlayerRole.UMPIRE, 0.91
        # Square leg umpire (Y ~ 8.8m, X around +/- 18m to 25m)
        if abs(field_y - striker_crease_y) <= 3.0 and 16.0 <= abs(field_x) <= 28.0:
            return PlayerRole.UMPIRE, 0.89

        # 6. Fielders (Inner Ring vs Outfield)
        if dist_from_pitch_center <= inner_r:
            return PlayerRole.FIELDER_INNER, 0.85
        else:
            return PlayerRole.FIELDER_OUTFIELD, 0.85

    def fit_team_colors(self, player_crops_rgb: List[np.ndarray]):
        """Cluster extracted colors across detections to adapt to any team jersey colors."""
        if len(player_crops_rgb) < 5:
            return
        
        data = np.array(player_crops_rgb)
        kmeans = KMeans(n_clusters=2, random_state=42, n_init=10).fit(data)
        centers = kmeans.cluster_centers_.astype(int)
        
        # Larger cluster is usually fielding team (up to 9 fielders in camera)
        counts = np.bincount(kmeans.labels_)
        fielding_idx = np.argmax(counts)
        batting_idx = 1 - fielding_idx

        self.fielding_team_color = centers[fielding_idx].tolist()
        self.batting_team_color = centers[batting_idx].tolist()
        self.color_model_fitted = True

