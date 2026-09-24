import React from 'react';
import type { ClusteringResult, DeliveryRecord } from '../types/cricket';
import { BrainCircuit, Sparkles, Layers, Target, Shield, CheckCircle2 } from 'lucide-react';

interface PatternDiscoveryViewProps {
  clustering: ClusteringResult;
  deliveries: DeliveryRecord[];
  activeDeliveryIndex: number;
  onSelectDelivery: (index: number) => void;
}

export const PatternDiscoveryView: React.FC<PatternDiscoveryViewProps> = ({
  clustering,
  deliveries,
  activeDeliveryIndex,
  onSelectDelivery,
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Info */}
      <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Unsupervised Machine Learning Pattern Discovery
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                K-Means / Spatial Vectors
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Discovered <span className="text-white font-semibold">{clustering.total_patterns_discovered} distinct tactical fielding archetypes</span> across analyzed deliveries.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
          <span>Feature Dimension:</span>
          <span className="px-2 py-1 rounded bg-gray-800 text-sky-400 font-bold">14-D Invariant</span>
        </div>
      </div>

      {/* Discovered Tactical Archetypes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clustering.clusters.map((cluster) => {
          const isCurrentActive = cluster.deliveries.includes(activeDeliveryIndex);

          return (
            <div
              key={cluster.cluster_id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isCurrentActive
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50'
                  : 'bg-cricket-panel border-cricket-border hover:border-gray-600'
              }`}
            >
              <div>
                {/* Cluster Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center border border-indigo-500/40">
                      C{cluster.cluster_id + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white">{cluster.name}</h4>
                  </div>
                  {isCurrentActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active Ball
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  {cluster.description}
                </p>

                {/* Spatial Feature Centroids */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-900/80 p-2.5 rounded-lg border border-gray-800 mb-4 font-mono">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Off-Leg Split</span>
                    <span className="text-sky-400 font-bold">{cluster.avg_offside_count} : {cluster.avg_legside_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Boundary Ring</span>
                    <span className="text-purple-400 font-bold">{cluster.avg_outfield_count} deep</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Inner Circle</span>
                    <span className="text-emerald-400 font-bold">{cluster.avg_inner_count} ring</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Mean Dispersion</span>
                    <span className="text-amber-400 font-bold">{cluster.avg_distance_m}m</span>
                  </div>
                </div>
              </div>

              {/* Delivery Assignment Badges */}
              <div>
                <div className="text-[11px] text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>Occurs in Deliveries:</span>
                  <span className="font-mono text-white font-bold">{cluster.deliveries.length} balls</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cluster.deliveries.map((dIdx) => {
                    const delivery = deliveries[dIdx];
                    const isSelected = dIdx === activeDeliveryIndex;

                    return (
                      <button
                        key={dIdx}
                        onClick={() => onSelectDelivery(dIdx)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white font-bold shadow'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Ball {delivery?.over_ball || `#${dIdx + 1}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
