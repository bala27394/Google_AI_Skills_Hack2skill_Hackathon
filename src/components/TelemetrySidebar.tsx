import React from 'react';
import {
  CityPreset,
  InterventionType,
} from '../types';
import {
  Wind,
  Thermometer,
  Droplets,
  Building2,
  TreePine,
  Layers,
  Sparkles,
  RotateCcw,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  Eraser,
  RefreshCw,
  Sun,
  Flame,
} from 'lucide-react';

interface TelemetrySidebarProps {
  preset: CityPreset;
  windSpeed: number;
  setWindSpeed: (val: number) => void;
  windDirection: number;
  setWindDirection: (val: number) => void;
  ambientTemp: number;
  setAmbientTemp: (val: number) => void;
  relativeHumidity: number;
  setRelativeHumidity: (val: number) => void;
  activeTool: 'inspect' | InterventionType | 'erase';
  setActiveTool: (tool: 'inspect' | InterventionType | 'erase') => void;
  onApplyPresetRecommendations: () => void;
  onFetchLiveWeather: () => void;
  isLoadingWeather: boolean;
  interventionsCount: number;
}

export const TelemetrySidebar: React.FC<TelemetrySidebarProps> = ({
  preset,
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
  ambientTemp,
  setAmbientTemp,
  relativeHumidity,
  setRelativeHumidity,
  activeTool,
  setActiveTool,
  onApplyPresetRecommendations,
  onFetchLiveWeather,
  isLoadingWeather,
  interventionsCount,
}) => {
  const getCardinalDirection = (deg: number) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  return (
    <aside className="w-80 border-r border-slate-800 bg-[#0B0F1A] flex flex-col shrink-0 h-full overflow-y-auto">
      {/* City Location Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>{preset.country}</span>
          <span className="font-mono tabular-nums">{preset.climateZone}</span>
        </div>
        <h2 className="text-base font-bold text-slate-100 tracking-tight">
          {preset.name}
        </h2>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="font-mono text-slate-400">
            {preset.coordinates.lat.toFixed(4)}° N, {preset.coordinates.lng.toFixed(4)}° E
          </span>
          <button
            onClick={onFetchLiveWeather}
            disabled={isLoadingWeather}
            className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50 cursor-pointer"
            title="Fetch live atmospheric data from Open-Meteo"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingWeather ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Environmental Parameters & Controls */}
      <div className="p-4 border-b border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Atmospheric & Wind Dynamics
          </span>
        </div>

        {/* Ambient Temperature Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              Ambient Air Temp
            </span>
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              {ambientTemp.toFixed(1)} °C
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="50"
            step="0.5"
            value={ambientTemp}
            onChange={(e) => setAmbientTemp(parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Wind Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              Prevailing Wind Speed
            </span>
            <span className="font-mono font-bold text-cyan-400 tabular-nums">
              {windSpeed.toFixed(1)} m/s
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="12.0"
            step="0.1"
            value={windSpeed}
            onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Wind Direction Dial & Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Wind Azimuth
            </span>
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              {windDirection}° ({getCardinalDirection(windDirection)})
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="359"
            step="1"
            value={windDirection}
            onChange={(e) => setWindDirection(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Relative Humidity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              Relative Humidity
            </span>
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              {relativeHumidity}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            step="1"
            value={relativeHumidity}
            onChange={(e) => setRelativeHumidity(parseInt(e.target.value, 10))}
            className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Natural Cooling Intervention Toolkit */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Natural Mitigation Toolkit
          </span>
          <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
            {interventionsCount} Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* Inspect tool */}
          <button
            onClick={() => setActiveTool('inspect')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'inspect'
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-400" />
              <span>Inspect Point Telemetry</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">HOVER</span>
          </button>

          {/* Cool Ventilation Corridor */}
          <button
            onClick={() => setActiveTool('cool_corridor')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'cool_corridor'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span>Cross-Ventilation Breezeway</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">-1.8°C</span>
          </button>

          {/* Native Shade Tree Canopy */}
          <button
            onClick={() => setActiveTool('tree_canopy')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'tree_canopy'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-400" />
              <span>Native Shade Tree Grove</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">-1.6°C</span>
          </button>

          {/* Biosolar Green Roof */}
          <button
            onClick={() => setActiveTool('green_roof')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'green_roof'
                ? 'bg-teal-950/80 border-teal-500 text-teal-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Biosolar Green Roof</span>
            </div>
            <span className="text-[10px] font-mono text-teal-400">-1.2°C</span>
          </button>

          {/* High-Albedo Cool Surface */}
          <button
            onClick={() => setActiveTool('cool_surface')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'cool_surface'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>High-SRI Albedo Coating</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400">-0.9°C</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => setActiveTool('erase')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              activeTool === 'erase'
                ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Eraser className="w-4 h-4 text-rose-400" />
              <span>Erase Element</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">DEL</span>
          </button>
        </div>

        {/* Quick Batch Apply Preset Suite */}
        <button
          onClick={onApplyPresetRecommendations}
          className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/50 rounded-lg transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Apply Recommended City Suite</span>
        </button>
      </div>

      {/* Urban Geometry & Baseline Metrics */}
      <div className="p-4 space-y-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Baseline Urban Geometry
        </span>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 font-sans">Building Footprint Density</span>
            <span className="font-bold text-slate-200 tabular-nums">{preset.buildingDensity}%</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 font-sans">Canyon Aspect Ratio (H/W)</span>
            <span className="font-bold text-slate-200 tabular-nums">{preset.canyonAspectRatio}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 font-sans">Baseline Satellite NDVI</span>
            <span className="font-bold text-emerald-400 tabular-nums">{preset.baseNDVI.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400 font-sans">Built-Up Index (NDBI)</span>
            <span className="font-bold text-amber-400 tabular-nums">{preset.baseNDBI.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 font-sans">Baseline Mean LST</span>
            <span className="font-bold text-rose-400 tabular-nums">{preset.baseLST.mean.toFixed(1)} °C</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
