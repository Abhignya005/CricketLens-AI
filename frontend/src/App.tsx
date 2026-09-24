import React, { useState, useEffect } from 'react';
import type { MatchAnalysis, DeliveryRecord, Player } from './types/cricket';
import { getDemoMatch } from './services/api';
import { Header } from './components/Header';
import { TopDownRadar } from './components/TopDownRadar';
import { VideoOverlayPlayer } from './components/VideoOverlayPlayer';
import { FieldDistributionView } from './components/FieldDistributionView';
import { MovementHeatmapView } from './components/MovementHeatmapView';
import { PatternDiscoveryView } from './components/PatternDiscoveryView';
import { DeliveryComparisonView } from './components/DeliveryComparisonView';
import { EvaluationHub } from './components/EvaluationHub';
import { CalibrationModal } from './components/CalibrationModal';
import { UploadModal } from './components/UploadModal';
import { Loader2, AlertCircle, Sparkles, Trophy } from 'lucide-react';

export const App: React.FC = () => {
  const [matchData, setMatchData] = useState<MatchAnalysis | null>(null);
  const [activeDeliveryIndex, setActiveDeliveryIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('tactical');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDemoMatch();
      setMatchData(data);
    } catch (err: any) {
      console.warn("Backend not reached immediately, loading local demo data fallback.", err);
      // Create rich mock fallback
      setMatchData(getFallbackMatchData());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDelivery = matchData?.deliveries[activeDeliveryIndex] || matchData?.deliveries[0];

  return (
    <div className="min-h-screen flex flex-col bg-cricket-night text-gray-100">
      {/* Navigation Header */}
      <Header
        matchData={matchData}
        activeDeliveryIndex={activeDeliveryIndex}
        onSelectDelivery={setActiveDeliveryIndex}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {isLoading ? (
          <div className="flex-1 min-h-[480px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <div className="text-sm font-semibold text-gray-300">Loading CricketLens AI Telemetry...</div>
          </div>
        ) : !currentDelivery ? (
          <div className="p-8 text-center text-gray-400">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            No delivery data available. Please upload a match video or refresh.
          </div>
        ) : (
          <>
            {/* Delivery Info Banner */}
            <div className="bg-cricket-panel/80 p-3.5 rounded-xl border border-cricket-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-emerald-600/30 text-emerald-400 font-mono font-black text-sm flex items-center justify-center border border-emerald-500/40 shadow-inner">
                  {currentDelivery.over_ball}
                </span>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{currentDelivery.bowler}</span>
                    <span className="text-gray-500 text-xs">to</span>
                    <span>{currentDelivery.batsman}</span>
                  </div>
                  <div className="text-xs text-sky-400 font-mono mt-0.5">
                    {currentDelivery.ball_type} • <span className="text-rose-400 font-bold">{currentDelivery.speed_kmh} km/h</span>
                  </div>
                </div>
              </div>

              {/* Tactical Intent Pill */}
              <div className="flex items-center gap-2 text-xs bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-gray-400">Tactical Setup:</span>
                <span className="text-amber-300 font-semibold">{currentDelivery.tactical_intent}</span>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'tactical' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 2D Top-Down Tactical Pitch & Ground Radar */}
                <div className="lg:col-span-6 h-[540px]">
                  <TopDownRadar
                    delivery={currentDelivery}
                    selectedPlayerId={selectedPlayer?.id}
                    onSelectPlayer={setSelectedPlayer}
                  />
                </div>

                {/* Broadcast Video Player & YOLO Overlay */}
                <div className="lg:col-span-6 h-[540px]">
                  <VideoOverlayPlayer
                    delivery={currentDelivery}
                    selectedPlayerId={selectedPlayer?.id}
                    onSelectPlayer={setSelectedPlayer}
                  />
                </div>

                {/* Quick Field Distribution Summary under tactical tab */}
                <div className="lg:col-span-12">
                  <FieldDistributionView
                    distribution={currentDelivery.distribution}
                    voronoi={currentDelivery.voronoi}
                  />
                </div>
              </div>
            )}

            {activeTab === 'coverage' && (
              <div className="flex flex-col gap-6">
                <FieldDistributionView
                  distribution={currentDelivery.distribution}
                  voronoi={currentDelivery.voronoi}
                />
                <div className="h-[480px]">
                  <TopDownRadar
                    delivery={currentDelivery}
                    showVoronoi={true}
                    showSectors={true}
                  />
                </div>
              </div>
            )}

            {activeTab === 'movement' && (
              <MovementHeatmapView delivery={currentDelivery} />
            )}

            {activeTab === 'patterns' && matchData && (
              <PatternDiscoveryView
                clustering={matchData.clustering}
                deliveries={matchData.deliveries}
                activeDeliveryIndex={activeDeliveryIndex}
                onSelectDelivery={setActiveDeliveryIndex}
              />
            )}

            {activeTab === 'compare' && matchData && (
              <DeliveryComparisonView
                deliveries={matchData.deliveries}
                activeDeliveryIndex={activeDeliveryIndex}
              />
            )}

            {activeTab === 'evaluation' && (
              <EvaluationHub />
            )}
          </>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAnalysisFinished={loadData}
      />

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onCalibrationSaved={loadData}
      />
    </div>
  );
};

// Comprehensive fallback mock data in case of immediate standalone offline load
function getFallbackMatchData(): MatchAnalysis {
  return {
    match_info: {
      title: "IND vs AUS • ICC Men's Cricket World Cup Final",
      venue: "Narendra Modi Stadium, Ahmedabad",
      innings: 1,
      current_over: "14.6",
      total_deliveries_analyzed: 6
    },
    deliveries: [
      {
        delivery_id: 1,
        over_ball: "14.1",
        ball_type: "Good Length Outswinger",
        batsman: "V. Kohli (RHB)",
        bowler: "P. Cummins (RAF)",
        tactical_intent: "Attacking Powerplay (2 Slips & Tight Cover)",
        speed_kmh: 142.4,
        fielders: [
          [1.2, 16.5], [4.5, 17.2], [7.8, 16.0], [18.5, 12.0], [22.0, 2.0],
          [12.0, -18.0], [-10.0, -18.0], [-24.0, 6.0], [-38.0, 48.0], [42.0, 45.0]
        ],
        players: [
          { id: 1, x: 0.0, y: 9.8, pixel_x: 640, pixel_y: 350, role: 'striker', team: 'batting', color_rgb: [255, 215, 0], speed_kmh: 3.2 },
          { id: 2, x: 2.5, y: -9.0, pixel_x: 670, pixel_y: 670, role: 'non_striker', team: 'batting', color_rgb: [255, 215, 0], speed_kmh: 2.8 },
          { id: 3, x: 0.2, y: -10.5, pixel_x: 638, pixel_y: 690, role: 'bowler', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 22.4 },
          { id: 4, x: 1.2, y: 16.5, pixel_x: 658, pixel_y: 280, role: 'wicketkeeper', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 4.1 },
          { id: 5, x: 4.5, y: 17.2, pixel_x: 720, pixel_y: 275, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 3.8 },
          { id: 6, x: 7.8, y: 16.0, pixel_x: 780, pixel_y: 285, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 3.5 },
          { id: 7, x: 18.5, y: 12.0, pixel_x: 880, pixel_y: 330, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 6.2 },
          { id: 8, x: 22.0, y: 2.0, pixel_x: 940, pixel_y: 420, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 5.4 },
          { id: 9, x: 12.0, y: -18.0, pixel_x: 820, pixel_y: 640, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 4.6 },
          { id: 10, x: -10.0, y: -18.0, pixel_x: 480, pixel_y: 640, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 4.2 },
          { id: 11, x: -24.0, y: 6.0, pixel_x: 340, pixel_y: 410, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 5.9 },
          { id: 12, x: -38.0, y: 48.0, pixel_x: 220, pixel_y: 260, role: 'outfield_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 14.5 },
          { id: 13, x: 42.0, y: 45.0, pixel_x: 1050, pixel_y: 265, role: 'outfield_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 13.8 },
        ],
        distribution: {
          offside_count: 6,
          legside_count: 3,
          inner_ring_count: 7,
          outfield_count: 2,
          split_ratio: "6-3",
          offside_percentage: 66.7,
          legside_percentage: 33.3,
          sector_distribution: {
            "Slip / Gully": 2,
            "Point / Backward Point": 1,
            "Cover / Extra Cover": 1,
            "Mid-Off": 1,
            "Mid-On": 1,
            "Square Leg": 1,
            "Fine Leg": 1,
            "Third Man": 1
          },
          total_fielders: 9
        },
        voronoi: {
          polygons: [
            { fielder_idx: 0, fielder_pos: [1.2, 16.5], polygon: [[-5, 12], [8, 12], [6, 25], [-6, 25]] },
            { fielder_idx: 1, fielder_pos: [4.5, 17.2], polygon: [[4, 12], [14, 12], [15, 28], [5, 28]] },
            { fielder_idx: 2, fielder_pos: [7.8, 16.0], polygon: [[12, 10], [25, 10], [26, 30], [14, 28]] },
            { fielder_idx: 3, fielder_pos: [18.5, 12.0], polygon: [[18, 5], [35, 5], [36, 22], [18, 20]] },
            { fielder_idx: 4, fielder_pos: [22.0, 2.0], polygon: [[15, -10], [38, -10], [36, 10], [18, 5]] },
            { fielder_idx: 5, fielder_pos: [12.0, -18.0], polygon: [[5, -35], [25, -35], [25, -10], [5, -10]] },
            { fielder_idx: 6, fielder_pos: [-10.0, -18.0], polygon: [[-5, -35], [-25, -35], [-25, -10], [-5, -10]] },
            { fielder_idx: 7, fielder_pos: [-24.0, 6.0], polygon: [[-15, -5], [-38, -5], [-38, 20], [-15, 20]] },
            { fielder_idx: 8, fielder_pos: [-38.0, 48.0], polygon: [[-25, 30], [-60, 30], [-58, 60], [-25, 60]] },
            { fielder_idx: 9, fielder_pos: [42.0, 45.0], polygon: [[25, 30], [60, 30], [58, 60], [25, 60]] },
          ],
          coverage_percentage: 82.4
        },
        proximity: {
          player_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          matrix: []
        },
        density_grid: { grid_x: [], grid_y: [], density: [] },
        change_from_prev: {
          changed_fielders_count: 0,
          avg_displacement_m: 0.0,
          max_displacement_m: 0.0,
          shift_magnitude: "Initial Over Setup",
          relocated_details: []
        },
        ball_trajectory_field: [
          [-0.1, -9.5], [0.0, -6.0], [0.1, -2.0], [0.3, 2.5], [0.5, 6.2], [0.8, 8.8], [12.0, 16.0], [28.0, 22.0]
        ],
        ball_trajectory_pixel: [
          [638, 680], [639, 600], [640, 500], [642, 420], [644, 370], [648, 350], [780, 310], [960, 280]
        ],
        cluster_label: 0
      },
      {
        delivery_id: 2,
        over_ball: "14.2",
        ball_type: "Bouncer into the Ribs",
        batsman: "V. Kohli (RHB)",
        bowler: "P. Cummins (RAF)",
        tactical_intent: "Legside Trap (2nd slip shifted to Deep Square Leg)",
        speed_kmh: 144.8,
        fielders: [
          [1.0, 17.0], [4.8, 17.5], [-48.0, 10.0], [18.0, 11.5], [21.0, 2.5],
          [12.0, -18.0], [-10.0, -18.0], [-20.0, 8.0], [-38.0, 48.0], [42.0, 45.0]
        ],
        players: [
          { id: 1, x: 0.0, y: 9.8, pixel_x: 640, pixel_y: 350, role: 'striker', team: 'batting', color_rgb: [255, 215, 0], speed_kmh: 4.0 },
          { id: 2, x: 2.5, y: -9.0, pixel_x: 670, pixel_y: 670, role: 'non_striker', team: 'batting', color_rgb: [255, 215, 0], speed_kmh: 2.5 },
          { id: 3, x: 0.2, y: -10.5, pixel_x: 638, pixel_y: 690, role: 'bowler', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 23.1 },
          { id: 4, x: 1.0, y: 17.0, pixel_x: 655, pixel_y: 278, role: 'wicketkeeper', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 5.2 },
          { id: 5, x: 4.8, y: 17.5, pixel_x: 725, pixel_y: 272, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 3.1 },
          { id: 6, x: -48.0, y: 10.0, pixel_x: 160, pixel_y: 390, role: 'outfield_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 16.2 },
          { id: 7, x: 18.0, y: 11.5, pixel_x: 875, pixel_y: 335, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 5.8 },
          { id: 8, x: 21.0, y: 2.5, pixel_x: 930, pixel_y: 418, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 6.0 },
          { id: 9, x: 12.0, y: -18.0, pixel_x: 820, pixel_y: 640, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 4.3 },
          { id: 10, x: -10.0, y: -18.0, pixel_x: 480, pixel_y: 640, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 4.5 },
          { id: 11, x: -20.0, y: 8.0, pixel_x: 380, pixel_y: 395, role: 'inner_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 7.1 },
          { id: 12, x: -38.0, y: 48.0, pixel_x: 220, pixel_y: 260, role: 'outfield_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 15.0 },
          { id: 13, x: 42.0, y: 45.0, pixel_x: 1050, pixel_y: 265, role: 'outfield_fielder', team: 'fielding', color_rgb: [30, 144, 255], speed_kmh: 14.1 },
        ],
        distribution: {
          offside_count: 5,
          legside_count: 4,
          inner_ring_count: 6,
          outfield_count: 3,
          split_ratio: "5-4",
          offside_percentage: 55.6,
          legside_percentage: 44.4,
          sector_distribution: {
            "Slip / Gully": 1,
            "Point / Backward Point": 1,
            "Cover / Extra Cover": 1,
            "Mid-Off": 1,
            "Mid-On": 1,
            "Square Leg": 1,
            "Deep Square Leg": 1,
            "Fine Leg": 1,
            "Third Man": 1
          },
          total_fielders: 9
        },
        voronoi: {
          polygons: [],
          coverage_percentage: 79.8
        },
        proximity: { player_ids: [], matrix: [] },
        density_grid: { grid_x: [], grid_y: [], density: [] },
        change_from_prev: {
          changed_fielders_count: 1,
          avg_displacement_m: 5.6,
          max_displacement_m: 54.2,
          shift_magnitude: "Major Tactical Shift",
          relocated_details: [
            {
              from_sector: "2nd Slip / Gully",
              to_sector: "Deep Square Leg",
              displacement_m: 54.2,
              from_pos: [7.8, 16.0],
              to_pos: [-48.0, 10.0]
            }
          ]
        },
        ball_trajectory_field: [
          [-0.1, -9.5], [-0.1, -5.0], [-0.2, 0.0], [-0.3, 4.0], [-0.4, 8.8], [-18.0, 12.0], [-42.0, 11.0]
        ],
        ball_trajectory_pixel: [
          [638, 680], [637, 580], [636, 480], [635, 400], [634, 350], [480, 370], [220, 385]
        ],
        cluster_label: 1
      }
    ],
    clustering: {
      total_patterns_discovered: 3,
      delivery_labels: [0, 1, 2, 2, 0, 1],
      clusters: [
        {
          cluster_id: 0,
          name: "Attacking Offside Cordon (Slip Trap)",
          description: "Packed offside with 2 slips and tight point/cover to exploit the new ball and induce outside edges.",
          frequency: 2,
          deliveries: [0, 4],
          avg_offside_count: 6.0,
          avg_legside_count: 3.0,
          avg_outfield_count: 2.0,
          avg_inner_count: 7.0,
          avg_distance_m: 23.4
        },
        {
          cluster_id: 1,
          name: "Legside Squeeze & Short-Pitch Trap",
          description: "Reinforced deep square leg and short fine leg fielders designed for targeted short-pitched bouncers.",
          frequency: 2,
          deliveries: [1, 5],
          avg_offside_count: 5.0,
          avg_legside_count: 4.0,
          avg_outfield_count: 3.0,
          avg_inner_count: 6.0,
          avg_distance_m: 28.1
        },
        {
          cluster_id: 2,
          name: "Boundary Containment & Death Spread",
          description: "Straight boundaries protected with Long-off and Long-on pushed back to stop boundary hitting.",
          frequency: 2,
          deliveries: [2, 3],
          avg_offside_count: 5.0,
          avg_legside_count: 4.0,
          avg_outfield_count: 5.0,
          avg_inner_count: 4.0,
          avg_distance_m: 36.8
        }
      ]
    }
  };
}

export default App;
