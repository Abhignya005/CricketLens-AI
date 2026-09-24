"""
Unit tests for Spatial Analytics Engine
"""
import pytest
from app.analytics.spatial_analytics import SpatialAnalyticsEngine
from app.config import PlayerRole

def test_field_distribution_rhb():
    engine = SpatialAnalyticsEngine()
    # 5 offside, 4 legside fielders
    fielders = [
        (15.0, 10.0), (22.0, 2.0), (12.0, -18.0), (45.0, 18.0), (4.5, 17.2), # Offside
        (-10.0, -18.0), (-24.0, 6.0), (-38.0, 48.0), (-48.0, 10.0)             # Legside
    ]
    res = engine.compute_field_distribution(fielders, is_rhb=True)
    assert res["offside_count"] == 5
    assert res["legside_count"] == 4
    assert res["split_ratio"] == "5-4"
    assert res["total_fielders"] == 9
    assert "sector_distribution" in res

def test_voronoi_coverage():
    engine = SpatialAnalyticsEngine()
    fielders = [
        (15.0, 10.0), (22.0, 2.0), (12.0, -18.0), (45.0, 18.0),
        (-10.0, -18.0), (-24.0, 6.0), (-38.0, 48.0), (-48.0, 10.0), (1.2, 16.5)
    ]
    res = engine.compute_voronoi_coverage(fielders)
    assert len(res["polygons"]) > 0
    assert res["coverage_percentage"] >= 50.0

def test_kinematics():
    engine = SpatialAnalyticsEngine()
    trajectory = [(0.0, 0.0), (1.0, 0.0), (2.5, 0.0), (4.0, 0.0)]
    res = engine.compute_kinematics(trajectory, fps=30.0)
    assert res["total_distance_m"] == 4.0
    assert res["avg_speed_kmh"] > 0.0

