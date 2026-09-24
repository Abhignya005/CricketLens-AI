"""
CricketLens AI - Pattern Discovery & Tactical Clustering Engine
Uses unsupervised Machine Learning (K-Means, GMM) to discover recurring fielding setups,
cluster tactical templates, and quantify delivery-by-delivery field configuration changes.
"""

from typing import List, Dict, Tuple, Optional
import numpy as np
from sklearn.cluster import KMeans
from app.config import FIELD_CONFIG, get_field_sector

class PatternDiscoveryEngine:
    def __init__(self, n_clusters: int = 4):
        self.n_clusters = n_clusters
        self.kmeans_model = None
        self.cluster_labels = []
        self.cluster_summaries = []

    def extract_spatial_feature_vector(
        self,
        fielder_positions: List[Tuple[float, float]],
        is_rhb: bool = True
    ) -> np.ndarray:
        """
        Extracts a canonical 14-dimensional spatial feature vector from a set of fielder coordinates.
        Features:
        0: Offside Fielder Count
        1: Legside Fielder Count
        2: Inner Ring Count (<= 27.4m)
        3: Outfield Count (> 27.4m)
        4-11: Sector counts (8 sectors)
        12: Mean Radial Distance from Pitch
        13: Offside/Legside Ratio
        """
        if not fielder_positions:
            return np.zeros(14, dtype=np.float32)

        pts = np.array(fielder_positions, dtype=np.float32)
        xs = pts[:, 0] if is_rhb else -pts[:, 0]
        ys = pts[:, 1]
        
        off_count = float(np.sum(xs >= 0))
        leg_count = float(np.sum(xs < 0))
        
        radii = np.hypot(xs, ys)
        inner_r = FIELD_CONFIG["INNER_CIRCLE_RADIUS"]
        inner_count = float(np.sum(radii <= inner_r))
        outfield_count = float(np.sum(radii > inner_r))
        
        # Sector counts (8 sectors)
        # 0: Slip/Third Man, 1: Point, 2: Cover, 3: Mid-Off, 4: Mid-On, 5: Mid-Wicket, 6: Square Leg, 7: Fine Leg
        sector_bins = np.zeros(8, dtype=np.float32)
        for x, y in zip(xs, ys):
            sec_name = get_field_sector(x, y, is_rhb=is_rhb)
            if "Slip" in sec_name or "Third Man" in sec_name:
                sector_bins[0] += 1
            elif "Point" in sec_name:
                sector_bins[1] += 1
            elif "Cover" in sec_name:
                sector_bins[2] += 1
            elif "Mid-Off" in sec_name or "Long-Off" in sec_name:
                sector_bins[3] += 1
            elif "Mid-On" in sec_name or "Long-On" in sec_name:
                sector_bins[4] += 1
            elif "Mid-Wicket" in sec_name:
                sector_bins[5] += 1
            elif "Square Leg" in sec_name:
                sector_bins[6] += 1
            elif "Fine Leg" in sec_name:
                sector_bins[7] += 1

        mean_radius = float(np.mean(radii)) if len(radii) > 0 else 25.0
        ratio = off_count / max(1.0, leg_count)

        feature_vec = np.array([
            off_count, leg_count, inner_count, outfield_count,
            *sector_bins,
            mean_radius, ratio
        ], dtype=np.float32)
        
        return feature_vec

    def detect_configuration_change(
        self,
        prev_fielders: List[Tuple[float, float]],
        curr_fielders: List[Tuple[float, float]],
        displacement_threshold: float = 4.0 # meters
    ) -> Dict:
        """
        Compares fielder coordinates between two consecutive deliveries.
        Quantifies number of shifted fielders, average displacement, and change intensity.
        """
        if not prev_fielders or not curr_fielders:
            return {
                "changed_fielders_count": 0,
                "avg_displacement_m": 0.0,
                "max_displacement_m": 0.0,
                "shift_magnitude": "No Change",
                "relocated_details": []
            }

        prev_pts = np.array(prev_fielders, dtype=np.float32)
        curr_pts = np.array(curr_fielders, dtype=np.float32)

        # Match nearest fielders between deliveries using minimum Euclidean distance
        n_prev = len(prev_pts)
        n_curr = len(curr_pts)
        
        displacements = []
        relocated_details = []

        # Find closest pairing
        for i, p_pt in enumerate(prev_pts):
            dists = np.hypot(curr_pts[:, 0] - p_pt[0], curr_pts[:, 1] - p_pt[1])
            min_idx = int(np.argmin(dists))
            min_dist = float(dists[min_idx])
            displacements.append(min_dist)

            if min_dist >= displacement_threshold:
                c_pt = curr_pts[min_idx]
                prev_sec = get_field_sector(p_pt[0], p_pt[1])
                curr_sec = get_field_sector(c_pt[0], c_pt[1])
                relocated_details.append({
                    "from_sector": prev_sec,
                    "to_sector": curr_sec,
                    "displacement_m": round(min_dist, 1),
                    "from_pos": [round(float(p_pt[0]), 1), round(float(p_pt[1]), 1)],
                    "to_pos": [round(float(c_pt[0]), 1), round(float(c_pt[1]), 1)]
                })

        displacements = np.array(displacements)
        avg_disp = float(np.mean(displacements)) if len(displacements) > 0 else 0.0
        max_disp = float(np.max(displacements)) if len(displacements) > 0 else 0.0
        changed_count = len(relocated_details)

        if changed_count >= 3 or avg_disp >= 7.0:
            magnitude = "Major Tactical Shift"
        elif changed_count >= 1 or avg_disp >= 3.5:
            magnitude = "Minor Adjustment"
        else:
            magnitude = "Stationary Field"

        return {
            "changed_fielders_count": changed_count,
            "avg_displacement_m": round(avg_disp, 1),
            "max_displacement_m": round(max_disp, 1),
            "shift_magnitude": magnitude,
            "relocated_details": relocated_details
        }

    def cluster_deliveries(self, delivery_records: List[Dict]) -> Dict:
        """
        Clusters a sequence of delivery fielding configurations into tactical patterns.
        """
        if len(delivery_records) < 3:
            return {
                "clusters": [],
                "delivery_labels": [0] * len(delivery_records),
                "total_patterns_discovered": 1
            }

        features = []
        for d in delivery_records:
            fielders = d.get("fielders", [])
            f_vec = self.extract_spatial_feature_vector(fielders, is_rhb=d.get("is_rhb", True))
            features.append(f_vec)

        X = np.array(features, dtype=np.float32)
        n_clusters = min(self.n_clusters, len(delivery_records))

        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10).fit(X)
        labels = kmeans.labels_.tolist()
        centers = kmeans.cluster_centers_

        cluster_summaries = []
        for c_id in range(n_clusters):
            c_center = centers[c_id]
            assigned_deliveries = [i for i, lbl in enumerate(labels) if lbl == c_id]
            
            # Interpret cluster properties
            off_c = c_center[0]
            leg_c = c_center[1]
            inner_c = c_center[2]
            outfield_c = c_center[3]
            mean_dist = c_center[12]

            # Assign intuitive tactical names based on feature values
            if off_c >= 5.8 and c_center[4] >= 1.2: # High slip/third man
                archetype = "Attacking Offside Cordon (Slip Trap)"
                desc = "Packed offside with catching slip/gully fielders to induce edge."
            elif outfield_c >= 4.5:
                archetype = "Deep Boundary Containment (Death Shield)"
                desc = "Spread boundary fielders protecting boundaries during high-scoring phases."
            elif leg_c >= 4.5:
                archetype = "Legside Squeeze & Short-Pitch Trap"
                desc = "Reinforced mid-wicket and deep square leg fielders targeting pull/hook."
            elif inner_c >= 6.5:
                archetype = "Ring Squeeze (Spin / Powerplay Containment)"
                desc = "Packed 30-yard inner circle denying easy singles."
            else:
                archetype = "Balanced Standard Field (5-4 Spread)"
                desc = "Standard field distribution covering both off and legside scoring zones."

            cluster_summaries.append({
                "cluster_id": c_id,
                "name": archetype,
                "description": desc,
                "frequency": len(assigned_deliveries),
                "deliveries": assigned_deliveries,
                "avg_offside_count": round(float(off_c), 1),
                "avg_legside_count": round(float(leg_c), 1),
                "avg_outfield_count": round(float(outfield_c), 1),
                "avg_inner_count": round(float(inner_c), 1),
                "avg_distance_m": round(float(mean_dist), 1)
            })

        return {
            "clusters": cluster_summaries,
            "delivery_labels": labels,
            "total_patterns_discovered": n_clusters
        }

