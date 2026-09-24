"""
Unit tests for Pattern Discovery and Tactical Clustering
"""
import pytest
from app.analytics.pattern_discovery import PatternDiscoveryEngine
from app.utils.sample_data_generator import SampleDataGenerator

def test_feature_vector_extraction():
    engine = PatternDiscoveryEngine()
    fielders = [(15.0, 10.0), (22.0, 2.0), (-10.0, -18.0), (4.5, 17.2)]
    f_vec = engine.extract_spatial_feature_vector(fielders, is_rhb=True)
    assert len(f_vec) == 14
    assert f_vec[0] == 3 # 3 offside
    assert f_vec[1] == 1 # 1 legside

def test_configuration_change_detection():
    engine = PatternDiscoveryEngine()
    prev_fielders = [(15.0, 10.0), (22.0, 2.0), (-10.0, -18.0)]
    # Shift one fielder significantly
    curr_fielders = [(15.0, 10.0), (-35.0, 25.0), (-10.0, -18.0)]
    
    change = engine.detect_configuration_change(prev_fielders, curr_fielders)
    assert change["changed_fielders_count"] >= 1
    assert change["avg_displacement_m"] > 0.0
    assert change["shift_magnitude"] in ["Minor Adjustment", "Major Tactical Shift"]

def test_delivery_clustering():
    generator = SampleDataGenerator()
    data = generator.generate_sample_deliveries()
    assert len(data["deliveries"]) == 6
    assert "clustering" in data
    assert data["clustering"]["total_patterns_discovered"] > 0

