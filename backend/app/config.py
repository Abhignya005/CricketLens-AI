"""
CricketLens AI - Configuration & Constants
Standard ICC metric field dimensions, sector definitions, role categories and system parameters.
"""

from typing import Dict, List, Tuple
from enum import Enum
import math

class TeamType(str, Enum):
    FIELDING = "fielding"
    BATTING = "batting"
    UMPIRE = "umpire"
    UNKNOWN = "unknown"

class PlayerRole(str, Enum):
    BATSMAN_STRIKER = "striker"
    BATSMAN_NON_STRIKER = "non_striker"
    WICKET_KEEPER = "wicketkeeper"
    BOWLER = "bowler"
    FIELDER_INNER = "inner_fielder"
    FIELDER_OUTFIELD = "outfield_fielder"
    UMPIRE = "umpire"
    UNKNOWN = "unknown"

class FieldSector(str, Enum):
    SLIP_GULLY = "Slip / Gully"
    POINT_COVER = "Point / Cover"
    EXTRA_COVER = "Extra Cover"
    MID_OFF = "Mid-Off"
    MID_ON = "Mid-On"
    MID_WICKET = "Mid-Wicket"
    SQUARE_LEG = "Square Leg"
    FINE_LEG = "Fine Leg"
    THIRD_MAN = "Third Man"
    LONG_OFF = "Long-Off"
    LONG_ON = "Long-On"
    DEEP_MID_WICKET = "Deep Mid-Wicket"
    DEEP_SQUARE_LEG = "Deep Square Leg"
    DEEP_POINT = "Deep Point / Cover"

# Metric dimensions in meters
FIELD_CONFIG = {
    # Standard Pitch Dimensions
    "PITCH_LENGTH": 20.12,         # 22 yards (stump to stump)
    "PITCH_WIDTH": 3.05,           # 10 feet
    "POPPING_CREASE_OFFSET": 1.22, # 4 feet from stumps
    "RETURN_CREASE_WIDTH": 2.64,   # 8 ft 8 in
    
    # Ground Dimensions
    "INNER_CIRCLE_RADIUS": 27.43,  # 30 yards
    "BOUNDARY_RADIUS_X": 68.0,     # Outfield ellipse semi-major axis (meters)
    "BOUNDARY_RADIUS_Y": 62.0,     # Outfield ellipse semi-minor axis (meters)
    
    # Origin (0,0) is Pitch Center.
    # Strikers Stumps (North): (0, 10.06)
    # Bowlers Stumps (South): (0, -10.06)
    # Offside is positive X for right-handed batsman, negative X for legside
    "STRIKER_STUMPS": (0.0, 10.06),
    "BOWLER_STUMPS": (0.0, -10.06),
    "STRIKER_POPPING_CREASE_Y": 8.84,
    "BOWLER_POPPING_CREASE_Y": -8.84,
}

# Standard Sector Angle Intervals (in degrees, 0 deg = straight down pitch towards bowler, clockwise for RHB)
# 0 deg = Long-on/Mid-on / Straight south
SECTOR_ANGLES: List[Dict] = [
    {"name": "Mid-Off / Long-Off", "min_deg": 335, "max_deg": 25, "side": "off"},
    {"name": "Cover / Extra Cover", "min_deg": 25, "max_deg": 70, "side": "off"},
    {"name": "Point / Deep Point", "min_deg": 70, "max_deg": 115, "side": "off"},
    {"name": "Slip / Third Man", "min_deg": 115, "max_deg": 160, "side": "off"},
    {"name": "Fine Leg / Short Fine", "min_deg": 160, "max_deg": 205, "side": "leg"},
    {"name": "Square Leg / Deep Square", "min_deg": 205, "max_deg": 250, "side": "leg"},
    {"name": "Mid-Wicket / Deep Mid-Wicket", "min_deg": 250, "max_deg": 295, "side": "leg"},
    {"name": "Mid-On / Long-On", "min_deg": 295, "max_deg": 335, "side": "leg"},
]

def get_field_sector(x: float, y: float, is_rhb: bool = True) -> str:
    """
    Determine cricket field sector name from field coordinate (x, y) relative to pitch center.
    x > 0: Offside for Right-Hand Batsman (RHB)
    """
    if not is_rhb:
        x = -x
        
    dist = math.hypot(x, y)
    is_inner = dist <= FIELD_CONFIG["INNER_CIRCLE_RADIUS"]
    
    # Angle relative to +Y (North / Batsman) or -Y (South / Bowler)
    # Strikers end is at +10.06m. Calculate angle from striker's position (0, 8.84)
    rel_x = x - 0.0
    rel_y = y - FIELD_CONFIG["STRIKER_POPPING_CREASE_Y"]
    angle_rad = math.atan2(rel_x, rel_y) # 0 is north (behind keeper), pi/2 is point (offside), -pi/2 is square leg (legside), pi is straight down ground
    angle_deg = (math.degrees(angle_rad) + 360) % 360
    
    # Map angle (0 = behind batsman / fine leg/third man, 90 = point/cover, 180 = straight towards bowler, 270 = square leg)
    if 340 <= angle_deg or angle_deg < 30:
        return "Third Man" if not is_inner else "Slip / Gully"
    elif 30 <= angle_deg < 75:
        return "Deep Point / Cover" if not is_inner else "Point / Backward Point"
    elif 75 <= angle_deg < 120:
        return "Deep Extra Cover" if not is_inner else "Cover / Extra Cover"
    elif 120 <= angle_deg < 165:
        return "Long-Off" if not is_inner else "Mid-Off"
    elif 165 <= angle_deg < 195:
        return "Long-On" if not is_inner else "Mid-On"
    elif 195 <= angle_deg < 240:
        return "Deep Mid-Wicket" if not is_inner else "Mid-Wicket"
    elif 240 <= angle_deg < 285:
        return "Deep Square Leg" if not is_inner else "Square Leg"
    elif 285 <= angle_deg < 340:
        return "Fine Leg" if not is_inner else "Short Fine Leg"
    return "Outfield"

DEFAULT_CAMERA_CALIBRATION_POINTS = {
    # 4 reference pitch points in standard broadcast camera view (broadcast behind bowler)
    # [top-left, top-right, bottom-right, bottom-left]
    "camera_pixels": [
        [570.0, 360.0],  # Striker crease left
        [710.0, 360.0],  # Striker crease right
        [850.0, 680.0],  # Bowler crease right
        [430.0, 680.0],  # Bowler crease left
    ],
    "field_meters": [
        [-1.52, 8.84],   # Striker popping crease left (-1.52m, 8.84m)
        [1.52, 8.84],    # Striker popping crease right (1.52m, 8.84m)
        [1.52, -8.84],   # Bowler popping crease right (1.52m, -8.84m)
        [-1.52, -8.84],  # Bowler popping crease left (-1.52m, -8.84m)
    ]
}

