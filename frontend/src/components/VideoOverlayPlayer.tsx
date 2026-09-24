import React, { useRef, useEffect, useState } from 'react';
import type { DeliveryRecord, Player } from '../types/cricket';
import { Play, Pause, SkipForward, SkipBack, Video, ShieldCheck, Crosshair, Sparkles } from 'lucide-react';

interface VideoOverlayPlayerProps {
  delivery: DeliveryRecord;
  selectedPlayerId?: number | null;
  onSelectPlayer?: (player: Player | null) => void;
}

export const VideoOverlayPlayer: React.FC<VideoOverlayPlayerProps> = ({
  delivery,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHomographyGrid, setShowHomographyGrid] = useState(true);
  const [showGroundRays, setShowGroundRays] = useState(true);
  const totalFrames = 60; // 60 frames animation cycle per delivery

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % totalFrames);
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Broadcast Cricket Ground Base View
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 260);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, 260);

    // Stadium stands / boundary
    ctx.fillStyle = '#1e3a2b';
    ctx.fillRect(0, 240, width, 60);

    // Emerald Cricket Grass Field
    const grassGrad = ctx.createLinearGradient(0, 260, 0, height);
    grassGrad.addColorStop(0, '#064e3b');
    grassGrad.addColorStop(0.4, '#065f46');
    grassGrad.addColorStop(1, '#042f2e');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 260, width, height - 260);

    // 30-yard circle perspective ellipse
    ctx.beginPath();
    ctx.ellipse(640, 500, 500, 200, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch Perspective Trapezoid (Calibrated camera pixels)
    // [570, 360], [710, 360], [850, 680], [430, 680]
    ctx.beginPath();
    ctx.moveTo(570, 360);
    ctx.lineTo(710, 360);
    ctx.lineTo(850, 680);
    ctx.lineTo(430, 680);
    ctx.closePath();

    // Pitch clay color
    ctx.fillStyle = '#92400e';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Popping creases & Stumps
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Striker crease
    ctx.moveTo(555, 360);
    ctx.lineTo(725, 360);
    // Bowler crease
    ctx.moveTo(410, 680);
    ctx.lineTo(870, 680);
    ctx.stroke();

    // Stumps
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(636, 345, 8, 15);
    ctx.fillRect(636, 672, 8, 16);

    // 2. Optional Pitch Homography Keypoints Overlay
    if (showHomographyGrid) {
      const calibPts = [[570, 360], [710, 360], [850, 680], [430, 680]];
      calibPts.forEach(([cx, cy], i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`P${i+1} [${cx},${cy}]`, cx + 8, cy - 6);
      });
    }

    // 3. Draw Players and Detection Bounding Boxes
    const tNorm = frameIndex / totalFrames; // 0.0 to 1.0

    delivery.players.forEach((player) => {
      // Small interpolated movement for animated playback
      const motionOffsetX = Math.sin(tNorm * 2 * Math.PI + player.id) * (player.speed_kmh * 0.4);
      const motionOffsetY = Math.cos(tNorm * 2 * Math.PI + player.id) * (player.speed_kmh * 0.2);

      const px = player.pixel_x + motionOffsetX;
      const py = player.pixel_y + motionOffsetY;

      // Box dimensions scaled by camera depth (lower Y => smaller player far away)
      const depthScale = Math.max(0.45, Math.min(1.4, (py - 240) / 380));
      const boxW = 38 * depthScale;
      const boxH = 76 * depthScale;

      const x1 = px - boxW / 2;
      const y1 = py - boxH;
      const x2 = px + boxW / 2;
      const y2 = py;

      const isSelected = selectedPlayerId === player.id;

      if (showBoxes) {
        // Bounding Box
        let boxColor = '#38bdf8'; // Blue for Fielding
        if (player.team === 'batting') boxColor = '#f59e0b'; // Gold for Batting
        else if (player.team === 'umpire') boxColor = '#9ca3af';

        ctx.strokeStyle = isSelected ? '#ffffff' : boxColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x1, y1, boxW, boxH);

        // Jersey Color Torso Swatch
        const torsoY1 = y1 + 0.2 * boxH;
        const torsoH = 0.35 * boxH;
        ctx.fillStyle = `rgb(${player.color_rgb.join(',')})`;
        ctx.fillRect(x1 + 4, torsoY1, 6, torsoH);

        // Label Badge
        ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(17, 24, 39, 0.9)';
        ctx.fillRect(x1, Math.max(0, y1 - 20), boxW + 40, 18);
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, Math.max(0, y1 - 20), boxW + 40, 18);

        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        const roleShort = player.role === 'striker' ? 'BAT' : (player.role === 'wicketkeeper' ? 'WK' : (player.role === 'bowler' ? 'BOWL' : `#${player.id}`));
        ctx.fillText(`${roleShort} [${player.speed_kmh}k]`, x1 + 4, Math.max(12, y1 - 7));
      }

      // Ground Contact Point Reticle
      if (showGroundRays) {
        ctx.beginPath();
        ctx.arc(px, y2, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // 4. Draw Ball Trajectory and Motion
    if (delivery.ball_trajectory_pixel && delivery.ball_trajectory_pixel.length > 1) {
      const bPts = delivery.ball_trajectory_pixel;

      // Trajectory line
      ctx.beginPath();
      bPts.forEach(([bx, by], idx) => {
        if (idx === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      });
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Current animated ball position
      const ballProgress = (frameIndex / totalFrames);
      const ballPtIdx = Math.min(bPts.length - 1, Math.floor(ballProgress * bPts.length));
      const [currBx, currBy] = bPts[ballPtIdx];

      // Ball glow
      ctx.beginPath();
      ctx.arc(currBx, currBy, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Top broadcast graphics watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(20, 20, 360, 54);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, 360, 54);

    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CRICKETLENS AI • BROADCAST CV TELEMETRY', 32, 40);

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${delivery.bowler} ➔ ${delivery.batsman} (${delivery.speed_kmh} km/h)`, 32, 60);

  }, [delivery, frameIndex, showBoxes, showHomographyGrid, showGroundRays, selectedPlayerId]);

  return (
    <div className="relative w-full h-full flex flex-col bg-cricket-night rounded-xl border border-cricket-border overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cricket-panel/90 border-b border-cricket-border z-10">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-200">
            Broadcast Video & YOLO Detection Stream
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
            Model: YOLOv8-Cricket (mAP 94.8%)
          </span>
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${
              showBoxes ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Boxes</span>
          </button>

          <button
            onClick={() => setShowHomographyGrid(!showHomographyGrid)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${
              showHomographyGrid ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pitch 4P</span>
          </button>

          <button
            onClick={() => setShowGroundRays(!showGroundRays)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-all ${
              showGroundRays ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Contact (u,v)</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center p-2 min-h-[380px]">
        <canvas
          ref={canvasRef}
          className="w-full h-auto aspect-video rounded-lg shadow-inner max-w-full max-h-[560px]"
        />

        {/* Floating Speed Radar Badge */}
        <div className="absolute top-6 right-6 px-3 py-2 bg-gray-900/90 border border-rose-500/60 rounded-lg backdrop-blur shadow-xl flex items-center gap-3 pointer-events-none">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Ball Speed</div>
            <div className="text-lg font-black font-mono text-rose-400">{delivery.speed_kmh} <span className="text-xs font-normal text-gray-400">km/h</span></div>
          </div>
          <div className="h-6 w-px bg-gray-700" />
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Delivery Type</div>
            <div className="text-xs font-medium text-white">{delivery.ball_type}</div>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-cricket-panel/90 border-t border-cricket-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFrameIndex((prev) => Math.max(0, prev - 1))}
            className="p-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white font-medium text-xs flex items-center gap-1.5 hover:bg-emerald-500 shadow-md shadow-emerald-900/40"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Live Feed'}</span>
          </button>
          <button
            onClick={() => setFrameIndex((prev) => (prev + 1) % totalFrames)}
            className="p-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex-1 mx-4 flex items-center gap-3">
          <span className="text-[10px] font-mono text-gray-400">F#{frameIndex + 1}</span>
          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={frameIndex}
            onChange={(e) => setFrameIndex(parseInt(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-[10px] font-mono text-gray-400">F#{totalFrames}</span>
        </div>

        <div className="text-xs font-mono text-gray-400">
          Over <span className="text-white font-bold">{delivery.over_ball}</span>
        </div>
      </div>
    </div>
  );
};
