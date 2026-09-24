import React, { useRef, useEffect, useState } from 'react';
import type { DeliveryRecord, Player, DensityGrid, ProximityMatrix } from '../types/cricket';
import { Flame, Gauge, Footprints, Network, Shield } from 'lucide-react';

interface MovementHeatmapViewProps {
  delivery: DeliveryRecord;
}

export const MovementHeatmapView: React.FC<MovementHeatmapViewProps> = ({ delivery }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [blurIntensity, setBlurIntensity] = useState(1.0);
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'fielders' | 'batsmen'>('all');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 450;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width / 160;

    // Dark ground background
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 68 * scale, 62 * scale, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#06281e';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 30 yard circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 27.43 * scale, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch
    ctx.fillStyle = '#b45309';
    ctx.fillRect(centerX - (3.05 * scale) / 2, centerY - (20.12 * scale) / 2, 3.05 * scale, 20.12 * scale);

    // Filter players based on metric
    const playersToRender = delivery.players.filter((p) => {
      if (selectedMetric === 'fielders') return p.team === 'fielding';
      if (selectedMetric === 'batsmen') return p.team === 'batting';
      return true;
    });

    // Draw 2D Gaussian Heatmap Spots
    playersToRender.forEach((p) => {
      const px = centerX + p.x * scale;
      const py = centerY - p.y * scale;
      const rad = 28 * blurIntensity;

      const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Hot red center
      grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.6)'); // Amber
      grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.3)');  // Green
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, 2 * Math.PI);
      ctx.fill();

      // Small center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [delivery, blurIntensity, selectedMetric]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controls & Summary */}
      <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Player Spatial Density & Movement Dynamics (2D KDE)
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setSelectedMetric('all')}
              className={`px-2.5 py-1 rounded transition-all ${
                selectedMetric === 'all' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Players
            </button>
            <button
              onClick={() => setSelectedMetric('fielders')}
              className={`px-2.5 py-1 rounded transition-all ${
                selectedMetric === 'fielders' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Fielding Team
            </button>
            <button
              onClick={() => setSelectedMetric('batsmen')}
              className={`px-2.5 py-1 rounded transition-all ${
                selectedMetric === 'batsmen' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Batsmen
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span>Blur:</span>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={blurIntensity}
              onChange={(e) => setBlurIntensity(parseFloat(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap Canvas + Velocity Telemetry Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Heatmap 2D Visualizer */}
        <div className="lg:col-span-5 bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col items-center justify-center">
          <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5 self-start">
            <Flame className="w-4 h-4 text-rose-400" />
            2D Gaussian Spatial Density Map
          </div>
          <canvas ref={canvasRef} className="w-full max-w-[380px] h-auto aspect-square rounded-xl shadow-xl border border-gray-800" />
          <div className="flex items-center justify-between w-full mt-3 px-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"/> Low Density</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"/> Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"/> High Congestion</span>
          </div>
        </div>

        {/* Player Velocity & Distance Telemetry Table */}
        <div className="lg:col-span-7 bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-sky-400" />
              Real-Time Sprint Velocities & Distance Traveled
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
              GPS/CV Tracked
            </span>
          </div>

          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-800/80 text-gray-400 font-mono text-[10px] uppercase sticky top-0">
                <tr>
                  <th className="py-2 px-3">Player ID</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Field (X, Y)</th>
                  <th className="py-2 px-3">Sprint Speed</th>
                  <th className="py-2 px-3">Pitch Dist</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 font-mono">
                {delivery.players.map((p) => {
                  const distFromPitch = Math.hypot(p.x, p.y).toFixed(1);
                  const isHighSpeed = p.speed_kmh > 12.0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-2.5 px-3 flex items-center gap-2 font-sans font-medium text-white">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              p.team === 'batting' ? '#f59e0b' : (p.team === 'umpire' ? '#9ca3af' : '#38bdf8'),
                          }}
                        />
                        #{p.id}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px] text-gray-400 font-sans">
                        {p.role.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300">
                        ({p.x.toFixed(1)}m, {p.y.toFixed(1)}m)
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${isHighSpeed ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {p.speed_kmh} <span className="text-[10px] font-normal text-gray-400">km/h</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-amber-400">
                        {distFromPitch}m
                      </td>
                      <td className="py-2.5 px-3">
                        {isHighSpeed ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-800">
                            Sprint Burst
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
