export type TeamType = 'fielding' | 'batting' | 'umpire' | 'unknown';

export type PlayerRole = 
  | 'striker'
  | 'non_striker'
  | 'wicketkeeper'
  | 'bowler'
  | 'inner_fielder'
  | 'outfield_fielder'
  | 'umpire'
  | 'unknown';

export interface Player {
  id: number;
  x: number;          // Ground X in meters (pitch center = 0, positive = offside for RHB)
  y: number;          // Ground Y in meters (positive = towards striker)
  pixel_x: number;    // Broadcast frame pixel X
  pixel_y: number;    // Broadcast frame pixel Y
  role: PlayerRole;
  team: TeamType;
  color_rgb: [number, number, number];
  speed_kmh: number;
  total_distance_m?: number;
  confidence?: number;
  bbox?: [number, number, number, number];
}

export interface BallTelemetry {
  pixel: [number, number] | null;
  field: [number, number] | null;
  speed_kmh: number;
}

export interface FieldDistribution {
  offside_count: number;
  legside_count: number;
  inner_ring_count: number;
  outfield_count: number;
  split_ratio: string;
  offside_percentage: number;
  legside_percentage: number;
  sector_distribution: Record<string, number>;
  total_fielders: number;
}

export interface VoronoiPolygon {
  fielder_idx: number;
  fielder_pos: [number, number];
  polygon: [number, number][];
}

export interface VoronoiCoverage {
  polygons: VoronoiPolygon[];
  coverage_percentage: number;
}

export interface ProximityMatrix {
  player_ids: number[];
  matrix: number[][];
}

export interface DensityGrid {
  grid_x: number[];
  grid_y: number[];
  density: number[][];
}

export interface RelocatedDetail {
  from_sector: string;
  to_sector: string;
  displacement_m: number;
  from_pos: [number, number];
  to_pos: [number, number];
}

export interface ConfigurationChange {
  changed_fielders_count: number;
  avg_displacement_m: number;
  max_displacement_m: number;
  shift_magnitude: string;
  relocated_details: RelocatedDetail[];
}

export interface DeliveryRecord {
  delivery_id: number;
  over_ball: string;
  ball_type: string;
  batsman: string;
  bowler: string;
  tactical_intent: string;
  speed_kmh: number;
  fielders: [number, number][];
  players: Player[];
  distribution: FieldDistribution;
  voronoi: VoronoiCoverage;
  proximity: ProximityMatrix;
  density_grid: DensityGrid;
  change_from_prev: ConfigurationChange;
  ball_trajectory_field: [number, number][];
  ball_trajectory_pixel: [number, number][];
  cluster_label?: number;
}

export interface ClusterSummary {
  cluster_id: number;
  name: string;
  description: string;
  frequency: number;
  deliveries: number[];
  avg_offside_count: number;
  avg_legside_count: number;
  avg_outfield_count: number;
  avg_inner_count: number;
  avg_distance_m: number;
}

export interface ClusteringResult {
  clusters: ClusterSummary[];
  delivery_labels: number[];
  total_patterns_discovered: number;
}

export interface MatchAnalysis {
  match_info: {
    title: string;
    venue: string;
    innings: number;
    current_over: string;
    total_deliveries_analyzed: number;
  };
  deliveries: DeliveryRecord[];
  clustering: ClusteringResult;
}

export interface EvaluationMetrics {
  object_detection: {
    model: string;
    precision: number;
    recall: number;
    mAP50: number;
    mAP50_95: number;
    ball_precision: number;
    ball_recall: number;
  };
  multi_object_tracking: {
    tracker: string;
    mota: number;
    idf1: number;
    id_switches_per_1000_frames: number;
    fragmentation_rate: number;
  };
  field_homography: {
    mean_reprojection_error_m: number;
    max_reprojection_error_m: number;
    pitch_corner_accuracy_pct: number;
  };
  team_role_classification: {
    jersey_color_accuracy: number;
    role_heuristic_accuracy: number;
    striker_keeper_f1: number;
  };
}

