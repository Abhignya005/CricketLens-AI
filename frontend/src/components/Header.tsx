import React from 'react';
import type { MatchAnalysis, DeliveryRecord } from '../types/cricket';
import { Activity, Upload, Sparkles, Award, Shield, Layers, RefreshCw } from 'lucide-react';

interface HeaderProps {
  matchData: MatchAnalysis | null;
  activeDeliveryIndex: number;
  onSelectDelivery: (index: number) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenUpload: () => void;
  onOpenCalibration: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  matchData,
  activeDeliveryIndex,
  onSelectDelivery,
  activeTab,
  onSelectTab,
  onOpenUpload,
  onOpenCalibration,
  onRefresh,
  isLoading,
}) => {
  const currentDelivery = matchData?.deliveries[activeDeliveryIndex];

  const tabs = [
    { id: 'tactical', label: 'Tactical Radar & Video' },
    { id: 'coverage', label: 'Field Coverage & Sectors' },
    { id: 'movement', label: 'Movement & Heatmaps' },
    { id: 'patterns', label: 'ML Pattern Discovery' },
    { id: 'compare', label: 'Delivery Shift Comparator' },
    { id: 'evaluation', label: 'CV Benchmarks & Metrics' },
  ];

  return (
    <header className="w-full bg-cricket-panel border-b border-cricket-border z-30 sticky top-0 backdrop-blur-md">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-cricket-border/60 gap-3">
        {/* Brand Logo & Match Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-950">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white flex items-center gap-2 font-sans">
                CRICKETLENS <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-mono font-bold">AI</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                Spatial & Movement Broadcast Video Intelligence
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-px bg-gray-700 mx-2" />

          {/* Match Info Pills */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-200 font-medium border border-gray-700">
              {matchData?.match_info.title || 'IND vs AUS • World Cup Final'}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono text-[11px] border border-rose-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> LIVE CV
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCalibration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 text-xs font-medium border border-gray-700 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibrate Pitch</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/40 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar & Delivery Selector */}
      <div className="flex flex-wrap items-center justify-between px-5 py-2 bg-gray-900/50 gap-2">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Delivery Switcher Pills */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-gray-500 uppercase font-semibold mr-1 font-mono">Select Ball:</span>
          {matchData?.deliveries.map((del, idx) => {
            const isSelected = idx === activeDeliveryIndex;
            return (
              <button
                key={del.delivery_id}
                onClick={() => onSelectDelivery(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-950'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {del.over_ball}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
