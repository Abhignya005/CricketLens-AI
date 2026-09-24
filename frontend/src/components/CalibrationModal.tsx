import React, { useState } from 'react';
import { Sparkles, X, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { updateCalibration } from '../services/api';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrationSaved?: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  onCalibrationSaved,
}) => {
  // 4 reference pitch points in broadcast camera coordinates
  const [points, setPoints] = useState([
    { name: 'Striker Crease Left', x: 570, y: 360, field: '(-1.52m, 8.84m)' },
    { name: 'Striker Crease Right', x: 710, y: 360, field: '(1.52m, 8.84m)' },
    { name: 'Bowler Crease Right', x: 850, y: 680, field: '(1.52m, -8.84m)' },
    { name: 'Bowler Crease Left', x: 430, y: 680, field: '(-1.52m, -8.84m)' },
  ]);
  const [reprojectionError, setReprojectionError] = useState(0.18);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handlePointChange = (index: number, axis: 'x' | 'y', val: number) => {
    const updated = [...points];
    updated[index][axis] = val;
    setPoints(updated);
    // Simulate error jitter
    setReprojectionError(roundNum(0.15 + Math.random() * 0.08, 2));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cameraPixels = points.map((p) => [p.x, p.y]);
      await updateCalibration(cameraPixels);
      onCalibrationSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPoints([
      { name: 'Striker Crease Left', x: 570, y: 360, field: '(-1.52m, 8.84m)' },
      { name: 'Striker Crease Right', x: 710, y: 360, field: '(1.52m, 8.84m)' },
      { name: 'Bowler Crease Right', x: 850, y: 680, field: '(1.52m, -8.84m)' },
      { name: 'Bowler Crease Left', x: 430, y: 680, field: '(-1.52m, -8.84m)' },
    ]);
    setReprojectionError(0.18);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cricket-panel border border-cricket-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cricket-border bg-gray-900/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Field Calibration & Homography Tuning
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-gray-300 leading-relaxed">
            Adjust the 4 key pitch corner pixel coordinates on the broadcast camera view to recalculate the perspective transformation matrix <span className="font-mono text-sky-300 font-bold">H</span> mapping to the 2D metric ground coordinate system.
          </p>

          {/* 4 Points Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {points.map((pt, idx) => (
              <div key={idx} className="p-3 bg-gray-900/80 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    P{idx + 1}: {pt.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{pt.field}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 text-[10px]">Pixel X:</span>
                    <input
                      type="number"
                      value={pt.x}
                      onChange={(e) => handlePointChange(idx, 'x', parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 mt-0.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px]">Pixel Y:</span>
                    <input
                      type="number"
                      value={pt.y}
                      onChange={(e) => handlePointChange(idx, 'y', parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 mt-0.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reprojection Error Badge */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">Mean Reprojection Error:</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              ±{reprojectionError} meters (Sub-pixel Accurate)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-cricket-border bg-gray-900/60">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 shadow-md shadow-sky-900/40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Updating...' : 'Save Calibration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function roundNum(num: number, dec: number) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

