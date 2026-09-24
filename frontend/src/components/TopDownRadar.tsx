import React, { useRef, useEffect, useState } from 'react';
import type { DeliveryRecord, Player, VoronoiCoverage } from '../types/cricket';
import { Layers, Eye, Compass, Activity, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TopDownRadarProps {
  delivery: DeliveryRecord;
  showVoronoi?: boolean;
  showSectors?: boolean;
  showBallTrail?: boolean;
  selectedPlayerId?: number | null;
  onSelectPlayer?: (player: Player | null) => void;
}

export const TopDownRadar: React.FC<TopDownRadarProps> = ({
  delivery,
  showVoronoi: initialVoronoi = true,
  showSectors: initialSectors = true,
  showBallTrail: initialBall = true,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showVoronoi, setShowVoronoi] = useState(initialVoronoi);
  const [showSectors, setShowSectors] = useState(initialSectors);
  const [showBallTrail, setShowBallTrail] = useState(initialBall);
  const [zoom, setZoom] = useState(1.0);
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);

  // Field dimensions in meters
  const BOUNDARY_RX = 68.0;
  const BOUNDARY_RY = 62.0;
  const INNER_CIRCLE_R = 27.43;
  const PITCH_L = 20.12;
  const PITCH_W = 3.05;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas with devicePixelRatio for ultra-sharp high-DPI rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Scale factor: ground 75m boundary fits in canvas
    const scale = (Math.min(width, height) / 160) * zoom;

    // Transform metric field coordinates (X, Y) to canvas pixels
    // Note: in metric field coords, Y is +towards striker (north), X is +offside (east for RHB)
    // Canvas: X right, Y down => canvasX = centerX + x * scale, canvasY = centerY - y * scale
    const toCanvasX = (mX: number) => centerX + mX * scale;
    const toCanvasY = (mY: number) => centerY - mY * scale;

    // 1. Clear background (Dark theme sports broadcast aesthetic)
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Outfield Boundary Oval
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, BOUNDARY_RX * scale, BOUNDARY_RY * scale, 0, 0, 2 * Math.PI);
    const turfGradient = ctx.createRadialGradient(centerX, centerY, 10 * scale, centerX, centerY, BOUNDARY_RX * scale);
    turfGradient.addColorStop(0, '#064e3b');   // Deep emerald center
    turfGradient.addColorStop(0.7, '#065f46'); // Classic turf
    turfGradient.addColorStop(1, '#042f2e');   // Dark boundary rim
    ctx.fillStyle = turfGradient;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#34d399'; // Neon emerald boundary rope
    ctx.stroke();

    // Boundary rope dashes / markers
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Draw 30-yard Inner Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, INNER_CIRCLE_R * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Sector Guidelines & Labels
    if (showSectors) {
      const sectorAngles = [
        { name: "SLIP / GULLY", angle: 15 },
        { name: "POINT", angle: 55 },
        { name: "COVER", angle: 95 },
        { name: "MID-OFF", angle: 145 },
        { name: "MID-ON", angle: 215 },
        { name: "MID-WICKET", angle: 265 },
        { name: "SQUARE LEG", angle: 305 },
        { name: "FINE LEG", angle: 345 }
      ];

      sectorAngles.forEach(({ name, angle }) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const lineEndX = centerX + Math.cos(rad) * (BOUNDARY_RX * 0.95) * scale;
        const lineEndY = centerY + Math.sin(rad) * (BOUNDARY_RY * 0.95) * scale;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Sector label
        const labelX = centerX + Math.cos(rad) * (BOUNDARY_RX * 0.82) * scale;
        const labelY = centerY + Math.sin(rad) * (BOUNDARY_RY * 0.82) * scale;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, labelX, labelY);
      });
    }

    // 5. Draw Pitch Rectangle
    const pitchLeft = toCanvasX(-PITCH_W / 2);
    const pitchTop = toCanvasY(PITCH_L / 2);
    const pitchW = PITCH_W * scale;
    const pitchH = PITCH_L * scale;

    ctx.fillStyle = '#b45309'; // Rich clay pitch color
    ctx.fillRect(pitchLeft, pitchTop, pitchW, pitchH);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.strokeRect(pitchLeft, pitchTop, pitchW, pitchH);

    // Crease lines
    const strikerCreaseY = toCanvasY(8.84);
    const bowlerCreaseY = toCanvasY(-8.84);
    const strikerStumpsY = toCanvasY(10.06);
    const bowlerStumpsY = toCanvasY(-10.06);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Popping creases
    ctx.beginPath();
    ctx.moveTo(pitchLeft - 2 * scale, strikerCreaseY);
    ctx.lineTo(pitchLeft + pitchW + 2 * scale, strikerCreaseY);
    ctx.moveTo(pitchLeft - 2 * scale, bowlerCreaseY);
    ctx.lineTo(pitchLeft + pitchW + 2 * scale, bowlerCreaseY);
    ctx.stroke();

    // Stumps
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(centerX - 3, strikerStumpsY - 2, 6, 4);
    ctx.fillRect(centerX - 3, bowlerStumpsY - 2, 6, 4);

    // 6. Draw Voronoi Defensive Coverage Polygons
    if (showVoronoi && delivery.voronoi && delivery.voronoi.polygons) {
      delivery.voronoi.polygons.forEach((polyItem, i) => {
        const poly = polyItem.polygon;
        if (!poly || poly.length < 3) return;

        ctx.beginPath();
        poly.forEach(([px, py], pIdx) => {
          const cx = toCanvasX(px);
          const cy = toCanvasY(py);
          if (pIdx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();

        // Shaded territory
        const colors = [
          'rgba(56, 189, 248, 0.08)',
          'rgba(16, 185, 129, 0.08)',
          'rgba(245, 158, 11, 0.08)',
          'rgba(168, 85, 247, 0.08)',
        ];
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 7. Draw Ball Trajectory
    if (showBallTrail && delivery.ball_trajectory_field && delivery.ball_trajectory_field.length > 0) {
      const pts = delivery.ball_trajectory_field;
      ctx.beginPath();
      pts.forEach(([bx, by], idx) => {
        const cx = toCanvasX(bx);
        const cy = toCanvasY(by);
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });

      // Neon red glow trail
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ball markers
      pts.forEach(([bx, by], idx) => {
        const cx = toCanvasX(bx);
        const cy = toCanvasY(by);
        ctx.beginPath();
        if (idx === 0) {
          // Release point
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        } else if (idx === pts.length - 1) {
          // Impact / End point
          ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fill();
        }
      });
    }

    // 8. Draw Players
    delivery.players.forEach((player) => {
      const pCanvasX = toCanvasX(player.x);
      const pCanvasY = toCanvasY(player.y);
      const isSelected = selectedPlayerId === player.id;
      const isHovered = hoveredPlayer?.id === player.id;

      // Player circle base
      ctx.beginPath();
      const dotRadius = isSelected || isHovered ? 8 : 6;
      ctx.arc(pCanvasX, pCanvasY, dotRadius, 0, 2 * Math.PI);

      // Color mapping
      let fillColor = '#38bdf8'; // Blue (Fielding)
      if (player.team === 'batting') fillColor = '#f59e0b'; // Gold (Batting)
      else if (player.team === 'umpire') fillColor = '#9ca3af'; // Grey (Umpire)

      ctx.fillStyle = fillColor;
      ctx.fill();

      // Highlight stroke
      ctx.lineWidth = isSelected ? 3 : (isHovered ? 2.5 : 1.5);
      ctx.strokeStyle = isSelected ? '#ffffff' : (isHovered ? '#67e8f9' : 'rgba(0,0,0,0.6)');
      ctx.stroke();

      // Pulse ring for selected player
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pCanvasX, pCanvasY, dotRadius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Player ID / Role Tag
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      
      const roleLabel = player.role === 'striker' ? 'BAT' : (player.role === 'wicketkeeper' ? 'WK' : (player.role === 'bowler' ? 'BOWL' : `#${player.id}`));
      ctx.fillText(roleLabel, pCanvasX, pCanvasY - dotRadius - 4);
    });

  }, [delivery, showVoronoi, showSectors, showBallTrail, selectedPlayerId, hoveredPlayer, zoom]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const scale = (Math.min(rect.width, rect.height) / 160) * zoom;

    // Find nearest player within threshold
    let nearest: Player | null = null;
    let minDist = 16; // pixels

    delivery.players.forEach((p) => {
      const pX = centerX + p.x * scale;
      const pY = centerY - p.y * scale;
      const dist = Math.hypot(pX - mouseX, pY - mouseY);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    });

    setHoveredPlayer(nearest);
  };

  const handleCanvasClick = () => {
    if (hoveredPlayer) {
      onSelectPlayer?.(hoveredPlayer);
    } else {
      onSelectPlayer?.(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-cricket-night rounded-xl border border-cricket-border overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cricket-panel/90 border-b border-cricket-border z-10">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cricket-accent animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
            2D Tactical Pitch & Field Radar
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            Scale: 1:1 Metric
          </span>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVoronoi(!showVoronoi)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
              showVoronoi
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Voronoi Territory Zones"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Voronoi</span>
          </button>

          <button
            onClick={() => setShowSectors(!showSectors)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
              showSectors
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Sector Names"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Sectors</span>
          </button>

          <button
            onClick={() => setShowBallTrail(!showBallTrail)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
              showBallTrail
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Ball Motion Trail"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Ball Track</span>
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            className="p-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full min-h-[460px] bg-slate-950 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredPlayer(null)}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair max-w-[620px] max-h-[620px]"
        />

        {/* Hover Tooltip HUD */}
        {hoveredPlayer && (
          <div className="absolute bottom-4 left-4 p-3 bg-gray-900/95 border border-sky-500/50 rounded-lg shadow-xl backdrop-blur-md text-xs pointer-events-none min-w-[200px] z-20">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-800">
              <span className="font-bold text-white uppercase flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{
                    backgroundColor:
                      hoveredPlayer.team === 'batting'
                        ? '#f59e0b'
                        : hoveredPlayer.team === 'umpire'
                        ? '#9ca3af'
                        : '#38bdf8',
                  }}
                />
                Player #{hoveredPlayer.id}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-sky-400 font-mono">
                {hoveredPlayer.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 pt-2 text-[11px] text-gray-300">
              <div>
                <span className="text-gray-500">Field (X, Y):</span>{' '}
                <span className="font-mono text-white">
                  {hoveredPlayer.x}m, {hoveredPlayer.y}m
                </span>
              </div>
              <div>
                <span className="text-gray-500">Speed:</span>{' '}
                <span className="font-mono text-emerald-400">{hoveredPlayer.speed_kmh} km/h</span>
              </div>
              <div>
                <span className="text-gray-500">Distance from Pitch:</span>{' '}
                <span className="font-mono text-amber-400">
                  {Math.hypot(hoveredPlayer.x, hoveredPlayer.y).toFixed(1)}m
                </span>
              </div>
              <div>
                <span className="text-gray-500">Team:</span>{' '}
                <span className="font-mono text-sky-300 capitalize">{hoveredPlayer.team}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 p-2 bg-gray-900/80 rounded border border-gray-800 text-[10px] text-gray-300 backdrop-blur pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Fielding Team</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Batsmen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Umpires</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Cricket Ball</span>
          </div>
        </div>
      </div>
    </div>
  );
};
