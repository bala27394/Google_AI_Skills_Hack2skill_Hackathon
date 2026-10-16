/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { TelemetrySidebar } from './components/TelemetrySidebar';
import { UrbanCanvas } from './components/UrbanCanvas';
import { GeminiMitigationPanel } from './components/GeminiMitigationPanel';
import { CustomCoordinateModal } from './components/CustomCoordinateModal';
import { CITY_PRESETS } from './data/cityPresets';
import { CFDMicroclimateEngine } from './utils/cfdSimulation';
import { exportMicroclimatePDFReport } from './utils/pdfExport';
import {
  ActionPlanItem,
  CityPreset,
  GeminiMitigationResponse,
  InterventionType,
  LayerType,
  PlacedIntervention,
} from './types';

export default function App() {
  const [activePresetId, setActivePresetId] = useState<string>('phoenix');
  const [customPreset, setCustomPreset] = useState<CityPreset | null>(null);

  // Active Preset Object
  const currentPreset = useMemo<CityPreset>(() => {
    if (activePresetId === 'custom' && customPreset) return customPreset;
    return CITY_PRESETS.find((p) => p.id === activePresetId) || CITY_PRESETS[0];
  }, [activePresetId, customPreset]);

  // Environmental Parameters
  const [windSpeed, setWindSpeed] = useState<number>(currentPreset.defaultWind.speed);
  const [windDirection, setWindDirection] = useState<number>(currentPreset.defaultWind.direction);
  const [ambientTemp, setAmbientTemp] = useState<number>(currentPreset.ambientTemp);
  const [relativeHumidity, setRelativeHumidity] = useState<number>(currentPreset.relativeHumidity);

  // Viewport & Tools State
  const [activeLayer, setActiveLayer] = useState<LayerType>('combined');
  const [activeTool, setActiveTool] = useState<'inspect' | InterventionType | 'erase'>('inspect');
  const [interventions, setInterventions] = useState<PlacedIntervention[]>([]);
  const [isSimulatingWind, setIsSimulatingWind] = useState<boolean>(true);
  const [splitCompare, setSplitCompare] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // AI & Weather State
  const [geminiData, setGeminiData] = useState<GeminiMitigationResponse | null>(null);
  const [isLoadingGemini, setIsLoadingGemini] = useState<boolean>(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);

  // Simulation Engine (persistent singleton across re-renders)
  const engine = useMemo(() => new CFDMicroclimateEngine(), []);

  // Update simulation scenario whenever parameters or interventions change
  const [metrics, setMetrics] = useState(() => engine.getGridMetrics());

  const recomputeSimulation = useCallback(() => {
    engine.updateScenario(
      currentPreset.buildings,
      currentPreset.baseLST.mean,
      currentPreset.baseNDVI,
      currentPreset.baseNDBI,
      windSpeed,
      windDirection,
      interventions
    );
    setMetrics(engine.getGridMetrics());
  }, [engine, currentPreset, windSpeed, windDirection, interventions]);

  // Sync parameters when preset switches
  useEffect(() => {
    setWindSpeed(currentPreset.defaultWind.speed);
    setWindDirection(currentPreset.defaultWind.direction);
    setAmbientTemp(currentPreset.ambientTemp);
    setRelativeHumidity(currentPreset.relativeHumidity);
    setInterventions([]);
    setGeminiData(null);
  }, [currentPreset]);

  // Re-run simulation when environmental values or interventions change
  useEffect(() => {
    recomputeSimulation();
  }, [recomputeSimulation]);

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
  };

  // Add Intervention
  const handleAddIntervention = (intervention: PlacedIntervention) => {
    setInterventions((prev) => [...prev, intervention]);
  };

  // Remove Intervention
  const handleRemoveIntervention = (id: string) => {
    setInterventions((prev) => prev.filter((it) => it.id !== id));
  };

  // Clear All
  const handleClearInterventions = () => {
    setInterventions([]);
  };

  // Batch Apply Preset Recommendations
  const handleApplyPresetRecommendations = () => {
    const newItems: PlacedIntervention[] = [
      {
        id: `int-rec-1`,
        type: 'cool_corridor',
        x: 50,
        y: 45,
        width: 32,
        height: 20,
        label: `${currentPreset.name} Ventilation Corridor`,
        speciesOrMaterial: 'Canyon relief clearing',
        details: 'Channels prevailing wind through core buildings',
        coolingDelta: -1.8,
      },
      {
        id: `int-rec-2`,
        type: 'tree_canopy',
        x: 30,
        y: 65,
        radius: 14,
        label: `${currentPreset.nativeSpecies[0]?.commonName || 'Native'} Shade Grove`,
        speciesOrMaterial: currentPreset.nativeSpecies[0]?.scientificName,
        details: 'High evapotranspiration vegetative barrier',
        coolingDelta: -1.6,
      },
      {
        id: `int-rec-3`,
        type: 'green_roof',
        x: 38,
        y: 44,
        width: 22,
        height: 22,
        label: 'Commercial Biosolar Green Roof',
        speciesOrMaterial: 'Sedum album succulent matrix',
        details: 'Thermal absorption dampener',
        coolingDelta: -1.2,
      },
    ];

    setInterventions(newItems);
  };

  // Apply single action from Gemini plan
  const handleApplyRecommendation = (action: ActionPlanItem) => {
    const count = interventions.length;
    const x = 30 + ((count * 18) % 45);
    const y = 35 + ((count * 15) % 40);

    const newIt: PlacedIntervention = {
      id: `gemini-${action.id}-${Date.now()}`,
      type: action.type,
      x,
      y,
      radius: action.type === 'tree_canopy' ? 14 : undefined,
      width: action.type === 'cool_corridor' ? 26 : 18,
      height: action.type === 'cool_corridor' ? 18 : 18,
      label: action.title,
      details: action.engineeringDetails,
      coolingDelta: action.coolingImpactC,
      speciesOrMaterial: action.specificSpeciesOrMaterials.join(', '),
    };

    setInterventions((prev) => [...prev, newIt]);
  };

  // Trigger Gemini Mitigation Planner
  const handleRunGemini = async () => {
    setIsLoadingGemini(true);
    try {
      const response = await fetch('/api/gemini/mitigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: currentPreset.name,
          lat: currentPreset.coordinates.lat,
          lng: currentPreset.coordinates.lng,
          meanLST: metrics.meanLST,
          maxLST: metrics.maxLST,
          ambientTemp,
          ndvi: metrics.meanNDVI,
          ndbi: currentPreset.baseNDBI,
          windSpeed,
          windDirection,
          buildingDensity: currentPreset.buildingDensity,
          canyonAspectRatio: currentPreset.canyonAspectRatio,
          activeInterventions: interventions.map((it) => ({
            type: it.type,
            name: it.label,
            intensity: it.coolingDelta,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data: GeminiMitigationResponse = await response.json();
      setGeminiData(data);
    } catch (err) {
      console.error('Failed to run Gemini mitigation planner:', err);
    } finally {
      setIsLoadingGemini(false);
    }
  };

  // Fetch Live Weather from Open-Meteo
  const handleFetchLiveWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const res = await fetch(
        `/api/weather/live?lat=${currentPreset.coordinates.lat}&lng=${currentPreset.coordinates.lng}`
      );
      const data = await res.json();
      if (data.current) {
        setAmbientTemp(data.current.temperature);
        setWindSpeed(data.current.windSpeed);
        setWindDirection(data.current.windDirection);
        setRelativeHumidity(data.current.humidity);
      }
    } catch (err) {
      console.warn('Failed to fetch live weather:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Export PDF Report handler
  const handleExportPDF = () => {
    exportMicroclimatePDFReport({
      preset: currentPreset,
      geminiData,
      metrics,
      interventions,
      ambientTemp,
      windSpeed,
      windDirection,
      relativeHumidity,
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070A11] text-slate-100 overflow-hidden font-sans">
      {/* Strict 3-Zone Top Navigation */}
      <TopNav
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onOpenCustomCoords={() => setIsCustomModalOpen(true)}
        onRunGemini={handleRunGemini}
        isLoadingGemini={isLoadingGemini}
        onExportPDF={handleExportPDF}
        ambientTemp={ambientTemp}
        coolingDelta={metrics.coolingDelta}
        interventionsCount={interventions.length}
      />

      {/* Main Console Workspace: Left Telemetry | Center Simulation | Right Analytics */}
      <div className="flex flex-1 w-full h-[calc(100vh-53px)] overflow-hidden">
        {/* Left Telemetry Sidebar */}
        <TelemetrySidebar
          preset={currentPreset}
          windSpeed={windSpeed}
          setWindSpeed={setWindSpeed}
          windDirection={windDirection}
          setWindDirection={setWindDirection}
          ambientTemp={ambientTemp}
          setAmbientTemp={setAmbientTemp}
          relativeHumidity={relativeHumidity}
          setRelativeHumidity={setRelativeHumidity}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onApplyPresetRecommendations={handleApplyPresetRecommendations}
          onFetchLiveWeather={handleFetchLiveWeather}
          isLoadingWeather={isLoadingWeather}
          interventionsCount={interventions.length}
        />

        {/* Central Urban CFD Simulation Canvas */}
        <UrbanCanvas
          engine={engine}
          preset={currentPreset}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          activeTool={activeTool}
          interventions={interventions}
          onAddIntervention={handleAddIntervention}
          onRemoveIntervention={handleRemoveIntervention}
          onClearInterventions={handleClearInterventions}
          isSimulatingWind={isSimulatingWind}
          setIsSimulatingWind={setIsSimulatingWind}
          splitCompare={splitCompare}
          setSplitCompare={setSplitCompare}
        />

        {/* Right Gemini AI & Analytics HUD */}
        <GeminiMitigationPanel
          preset={currentPreset}
          geminiData={geminiData}
          isLoadingGemini={isLoadingGemini}
          onRunGemini={handleRunGemini}
          metrics={metrics}
          interventions={interventions}
          onApplyRecommendation={handleApplyRecommendation}
          ambientTemp={ambientTemp}
          windSpeed={windSpeed}
          windDirection={windDirection}
          relativeHumidity={relativeHumidity}
        />
      </div>

      {/* Custom Coordinate Modal */}
      <CustomCoordinateModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onApplyCustomLocation={(custom) => {
          setCustomPreset(custom);
          setActivePresetId('custom');
        }}
      />
    </div>
  );
}
