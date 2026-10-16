import React, { useState } from 'react';
import { Compass, RefreshCw, X } from 'lucide-react';
import { CityPreset } from '../types';

interface CustomCoordinateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCustomLocation: (customPreset: CityPreset) => void;
}

export const CustomCoordinateModal: React.FC<CustomCoordinateModalProps> = ({
  isOpen,
  onClose,
  onApplyCustomLocation,
}) => {
  const [name, setName] = useState('Central Madrid District');
  const [lat, setLat] = useState(40.4168);
  const [lng, setLng] = useState(-3.7038);
  const [ambientTemp, setAmbientTemp] = useState(37.5);
  const [windSpeed, setWindSpeed] = useState(3.4);
  const [windDirection, setWindDirection] = useState(195);
  const [humidity, setHumidity] = useState(25);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  if (!isOpen) return null;

  const handleFetchLive = async () => {
    setIsLoadingWeather(true);
    try {
      const res = await fetch(`/api/weather/live?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.current) {
        setAmbientTemp(data.current.temperature);
        setWindSpeed(data.current.windSpeed);
        setWindDirection(data.current.windDirection);
        setHumidity(data.current.humidity);
      }
    } catch (err) {
      console.warn('Failed to fetch live weather:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customPreset: CityPreset = {
      id: 'custom',
      name: name.trim() || 'Custom Urban Sector',
      country: 'Global Grid',
      climateZone: 'Microclimate Custom Zone',
      coordinates: { lat, lng },
      baseLST: {
        mean: ambientTemp + 3.2,
        max: ambientTemp + 10.4,
        min: ambientTemp - 4.5,
      },
      ambientTemp,
      relativeHumidity: humidity,
      baseNDVI: 0.16,
      baseNDBI: 0.62,
      defaultWind: {
        speed: windSpeed,
        direction: windDirection,
      },
      canyonAspectRatio: 2.8,
      buildingDensity: 70,
      description: `Custom evaluated urban boundary box at Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}. Evaluated for aerodynamic wind stagnation and nature-based cross-ventilation mitigation.`,
      nativeSpecies: [
        {
          commonName: 'Regional Keystone Shade Tree',
          scientificName: 'Native Biome Selection',
          canopySpreadMeters: 12.0,
          leafAreaIndex: 4.2,
          droughtTolerance: 'High',
          coolingPotentialC: -1.7,
          waterNeed: 'Low',
          description: 'Climate-resilient regional tree with high transpiration index and deep root water stabilization.',
        },
      ],
      buildings: [
        { id: 'c-1', x: 14, y: 14, width: 18, height: 22, stories: 16, heightMeters: 60, roofType: 'flat' },
        { id: 'c-2', x: 38, y: 12, width: 22, height: 26, stories: 28, heightMeters: 105, roofType: 'flat' },
        { id: 'c-3', x: 68, y: 16, width: 16, height: 20, stories: 14, heightMeters: 52, roofType: 'flat' },
        { id: 'c-4', x: 16, y: 46, width: 20, height: 20, stories: 22, heightMeters: 84, roofType: 'flat' },
        { id: 'c-5', x: 44, y: 44, width: 22, height: 22, stories: 32, heightMeters: 120, roofType: 'flat' },
        { id: 'c-6', x: 72, y: 48, width: 16, height: 18, stories: 18, heightMeters: 68, roofType: 'flat' },
        { id: 'c-7', x: 20, y: 76, width: 18, height: 14, stories: 10, heightMeters: 38, roofType: 'flat' },
        { id: 'c-8', x: 46, y: 76, width: 20, height: 14, stories: 12, heightMeters: 45, roofType: 'flat' },
        { id: 'c-9', x: 72, y: 74, width: 18, height: 16, stories: 14, heightMeters: 52, roofType: 'flat' },
      ],
      recommendedInterventions: [
        {
          type: 'cool_corridor',
          title: 'Custom Wind Relief Breezeway',
          description: `Orient ventilation corridors parallel to ${windDirection}° prevailing wind azimuth.`,
          estimatedCoolingC: -1.7,
        },
      ],
    };

    onApplyCustomLocation(customPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0B0F1A] border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Custom Geographic Coordinates
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Urban Sector Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Downtown Cairo or East Delhi"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Latitude (°N)</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Longitude (°E)</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleFetchLive}
            disabled={isLoadingWeather}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin' : ''}`} />
            <span>Fetch Live Weather for Coordinates</span>
          </button>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Temp (°C)</label>
              <input
                type="number"
                step="0.5"
                value={ambientTemp}
                onChange={(e) => setAmbientTemp(parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-center"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Wind (m/s)</label>
              <input
                type="number"
                step="0.1"
                value={windSpeed}
                onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-center"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Azimuth (°)</label>
              <input
                type="number"
                step="1"
                value={windDirection}
                onChange={(e) => setWindDirection(parseInt(e.target.value, 10))}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-center"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Load Custom Sector
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
