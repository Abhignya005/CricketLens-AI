import React from 'react';
import type { FieldDistribution, VoronoiCoverage } from '../types/cricket';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Shield, Target, PieChart as PieIcon, BarChart3, AlertCircle } from 'lucide-react';

interface FieldDistributionViewProps {
  distribution: FieldDistribution;
  voronoi: VoronoiCoverage;
}

export const FieldDistributionView: React.FC<FieldDistributionViewProps> = ({
  distribution,
  voronoi,
}) => {
  // Data for offside vs legside
  const offLegData = [
    { name: 'Offside', value: distribution.offside_count, color: '#38bdf8' },
    { name: 'Legside', value: distribution.legside_count, color: '#f59e0b' },
  ];

  // Data for ring vs outfield
  const ringOutfieldData = [
    { name: 'Inner Ring (30yd)', value: distribution.inner_ring_count, color: '#10b981' },
    { name: 'Deep Outfield', value: distribution.outfield_count, color: '#a855f7' },
  ];

  // Sector distribution array
  const sectorData = Object.entries(distribution.sector_distribution || {}).map(([sec, count]) => ({
    sector: sec.replace(' / ', '/'),
    count: count,
  }));

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Split Ratio */}
        <div className="bg-cricket-panel p-3.5 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Off-Leg Balance</span>
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{distribution.split_ratio}</span>
            <span className="text-[11px] text-gray-400">split</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            {distribution.offside_percentage}% Offside / {distribution.legside_percentage}% Leg
          </div>
        </div>

        {/* Ring vs Outfield */}
        <div className="bg-cricket-panel p-3.5 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Circle vs Deep</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {distribution.inner_ring_count} : {distribution.outfield_count}
            </span>
            <span className="text-[11px] text-gray-400">in/out</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            {distribution.inner_ring_count} Ring / {distribution.outfield_count} Boundary
          </div>
        </div>

        {/* Voronoi Coverage */}
        <div className="bg-cricket-panel p-3.5 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Voronoi Coverage</span>
            <PieIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">
              {voronoi?.coverage_percentage || 78.5}%
            </span>
            <span className="text-[11px] text-gray-400">territory</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-400/80">
            {100 - (voronoi?.coverage_percentage || 78.5)}% High-Risk Gaps
          </div>
        </div>

        {/* Active Fielders */}
        <div className="bg-cricket-panel p-3.5 rounded-xl border border-cricket-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Tracked Fielders</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-purple-400">
              {distribution.total_fielders}
            </span>
            <span className="text-[11px] text-gray-400">/ 9 outfielders</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-400/80">
            Excl. Bowler & Keeper
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offside vs Legside Bar Distribution */}
        <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400" />
            Field Symmetry & Zonal Balance
          </h4>

          {/* Balance Slider Visualizer */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-300 mb-1 font-mono">
              <span className="text-sky-400">Offside: {distribution.offside_count} ({distribution.offside_percentage}%)</span>
              <span className="text-amber-400">Legside: {distribution.legside_count} ({distribution.legside_percentage}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
              <div
                className="bg-sky-500 h-full transition-all duration-500"
                style={{ width: `${distribution.offside_percentage}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${distribution.legside_percentage}%` }}
              />
            </div>
          </div>

          {/* Ring vs Boundary Split Visualizer */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-300 mb-1 font-mono">
              <span className="text-emerald-400">30-Yard Ring: {distribution.inner_ring_count}</span>
              <span className="text-purple-400">Deep Outfield: {distribution.outfield_count}</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(distribution.inner_ring_count / Math.max(1, distribution.total_fielders)) * 100}%` }}
              />
              <div
                className="bg-purple-500 h-full transition-all duration-500"
                style={{ width: `${(distribution.outfield_count / Math.max(1, distribution.total_fielders)) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-auto p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs text-gray-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              {distribution.offside_count >= 6
                ? 'Heavy offside bias targeting outside-off channel and slips.'
                : distribution.legside_count >= 5
                ? 'Legside trap setting forcing pull/hook shots with boundary protection.'
                : 'Balanced standard fielding setup covering all standard scoring zones.'}
            </span>
          </div>
        </div>

        {/* Sector Breakdown Chart */}
        <div className="bg-cricket-panel p-4 rounded-xl border border-cricket-border flex flex-col">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Field Sector Density Breakdown
          </h4>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" stroke="#6b7280" fontSize={10} allowDecimals={false} />
                <YAxis dataKey="sector" type="category" stroke="#9ca3af" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '11px' }}
                  formatter={(val: any) => [`${val} fielder(s)`, 'Count']}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
