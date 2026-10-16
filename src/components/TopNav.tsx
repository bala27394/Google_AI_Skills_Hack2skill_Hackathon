import React from 'react';
import { Sparkles, Loader2, Compass, Download, Thermometer, TrendingDown, FolderArchive } from 'lucide-react';

interface TopNavProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenCustomCoords: () => void;
  onRunGemini: () => void;
  isLoadingGemini: boolean;
  onExportPDF?: () => void;
  ambientTemp: number;
  coolingDelta: number;
  interventionsCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenCustomCoords,
  onRunGemini,
  isLoadingGemini,
  onExportPDF,
  ambientTemp,
  coolingDelta,
  interventionsCount,
}) => {
  const cities = [
    { id: 'phoenix', label: 'Phoenix' },
    { id: 'singapore', label: 'Singapore' },
    { id: 'athens', label: 'Athens' },
    { id: 'tokyo', label: 'Tokyo' },
  ];

  const netCoolingDelta = Math.min(0, coolingDelta);
  const effectiveTemp = ambientTemp + netCoolingDelta;

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 border-b border-slate-800 bg-[#070A11] shrink-0 z-30">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Compass className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
          Urban Heat Island Mitigation Studio
        </span>
      </div>

      {/* Zone 2: 4-5 single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
        {cities.map((city) => {
          const isActive = activePresetId === city.id;
          return (
            <button
              key={city.id}
              onClick={() => onSelectPreset(city.id)}
              className={`transition-colors whitespace-nowrap pb-0.5 relative cursor-pointer ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'hover:text-slate-200'
              }`}
            >
              {city.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
        <button
          onClick={onOpenCustomCoords}
          className={`transition-colors whitespace-nowrap pb-0.5 relative cursor-pointer ${
            activePresetId === 'custom'
              ? 'text-cyan-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Custom Coordinates
          {activePresetId === 'custom' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />
          )}
        </button>
      </nav>

      {/* Zone 3: Real-time Ambient Temp Delta Telemetry & Primary Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Real-time Ambient Temp Delta Telemetry Display */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0B0F1A] font-mono text-xs shadow-inner">
          <div className="flex items-center gap-1.5 text-slate-400 font-sans text-xs">
            <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xl:inline">Ambient:</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-slate-200 tabular-nums font-bold">
              {effectiveTemp.toFixed(1)}°C
            </span>
            {netCoolingDelta < -0.05 && (
              <span className="text-[10px] text-slate-500 line-through">
                {ambientTemp.toFixed(1)}°C
              </span>
            )}
          </div>

          <span className="text-slate-700 font-mono">|</span>

          {/* Cumulative Cooling Delta */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-sans text-slate-400">ΔT:</span>
            <span
              className={`font-bold tabular-nums flex items-center gap-0.5 ${
                netCoolingDelta < -0.05
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {netCoolingDelta < -0.05 && (
                <TrendingDown className="w-3 h-3 text-emerald-400" />
              )}
              {netCoolingDelta < 0 ? `${netCoolingDelta.toFixed(1)}°C` : '0.0°C'}
            </span>
          </div>

          {interventionsCount > 0 && (
            <span className="hidden 2xl:inline text-[10px] text-slate-500 font-sans">
              ({interventionsCount} {interventionsCount === 1 ? 'layer' : 'layers'})
            </span>
          )}
        </div>

        <a
          href="/api/download-zip"
          download="uhi-mitigation-planner.zip"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="Download complete source code ZIP for local testing"
        >
          <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Download ZIP</span>
          <span className="sm:hidden">ZIP</span>
        </a>

        {onExportPDF && (
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Export Formatted Microclimate PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}

        <button
          onClick={onRunGemini}
          disabled={isLoadingGemini}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
        >
          {isLoadingGemini ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Synthesizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run AI Planner</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
