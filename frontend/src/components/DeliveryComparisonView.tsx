import React, { useState } from 'react';
import type { DeliveryRecord } from '../types/cricket';
import { ArrowRight, Move, Shuffle, AlertTriangle, CheckCircle } from 'lucide-react';

interface DeliveryComparisonViewProps {
  deliveries: DeliveryRecord[];
  activeDeliveryIndex: number;
}

export const DeliveryComparisonView: React.FC<DeliveryComparisonViewProps> = ({
  deliveries,
  activeDeliveryIndex,
}) => {
  const [ballAIndex, setBallAIndex] = useState(Math.max(0, activeDeliveryIndex - 1));
  const [ballBIndex, setBallBIndex] = useState(activeDeliveryIndex);

  const ballA = deliveries[ballAIndex] || deliveries[0];
  const ballB = deliveries[ballBIndex] || deliveries[1] || deliveries[0];

  const changeInfo = ballB.change_from_prev;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Selector Header */}
      <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Field Configuration Shift & Tactical Comparator
            </h3>
            <p className="text-xs text-gray-400">
              Quantifies fielder movements, sector adjustments, and tactical reorganizations between balls.
            </p>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">Ball A:</span>
            <select
              value={ballAIndex}
              onChange={(e) => setBallAIndex(parseInt(e.target.value))}
              className="bg-gray-800 text-white rounded px-2.5 py-1.5 border border-gray-700 font-mono text-xs focus:outline-none focus:border-sky-500"
            >
              {deliveries.map((d, i) => (
                <option key={i} value={i}>
                  Over {d.over_ball} ({d.ball_type})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-500" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">Ball B:</span>
            <select
              value={ballBIndex}
              onChange={(e) => setBallBIndex(parseInt(e.target.value))}
              className="bg-gray-800 text-white rounded px-2.5 py-1.5 border border-gray-700 font-mono text-xs focus:outline-none focus:border-sky-500"
            >
              {deliveries.map((d, i) => (
                <option key={i} value={i}>
                  Over {d.over_ball} ({d.ball_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Changed Fielders Count */}
        <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span>Repositioned Fielders</span>
            <Move className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {changeInfo?.changed_fielders_count || 0}
            </span>
            <span className="text-xs text-gray-400">players moved</span>
          </div>
          <div className="mt-1 text-xs text-sky-400">
            Displacement &gt; 4.0 meters
          </div>
        </div>

        {/* Avg Displacement */}
        <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span>Average Displacement</span>
            <Move className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {changeInfo?.avg_displacement_m || 0.0}m
            </span>
            <span className="text-xs text-gray-400">avg shift</span>
          </div>
          <div className="mt-1 text-xs text-emerald-400/80">
            Max shift: <span className="font-mono">{changeInfo?.max_displacement_m || 0.0}m</span>
          </div>
        </div>

        {/* Shift Intensity Rating */}
        <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span>Tactical Shift Rating</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-amber-400">
            {changeInfo?.shift_magnitude || 'Standard Adjustment'}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Detected from multi-object tracking vectors
          </div>
        </div>
      </div>

      {/* Relocation Logs Table */}
      <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
          Individual Fielder Relocation Audit
        </h4>

        {changeInfo?.relocated_details && changeInfo.relocated_details.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {changeInfo.relocated_details.map((rel, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-800 text-gray-300 font-mono flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-medium">{rel.from_sector}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-emerald-400 font-medium">{rel.to_sector}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-gray-400">
                    ({rel.from_pos[0]}, {rel.from_pos[1]}) ➔ ({rel.to_pos[0]}, {rel.to_pos[1]})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                    +{rel.displacement_m}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400">
            <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
            No major fielder relocations detected between these two deliveries. The field remained stationary.
          </div>
        )}
      </div>
    </div>
  );
};
