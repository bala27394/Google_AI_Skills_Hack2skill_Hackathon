import React, { useState } from 'react';
import {
  ActionPlanItem,
  CityPreset,
  GeminiMitigationResponse,
  NativeSpecies,
  PlacedIntervention,
} from '../types';
import { DailyDiurnalTemperatureChart } from './DailyDiurnalTemperatureChart';
import { exportMicroclimatePDFReport } from '../utils/pdfExport';
import {
  Sparkles,
  Wind,
  TreePine,
  Layers,
  Sun,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Download,
  Info,
  ChevronRight,
  TrendingDown,
  Droplets,
  ExternalLink,
  Clock,
  Printer,
} from 'lucide-react';

interface GeminiMitigationPanelProps {
  preset: CityPreset;
  geminiData: GeminiMitigationResponse | null;
  isLoadingGemini: boolean;
  onRunGemini: () => void;
  metrics: {
    meanLST: number;
    maxLST: number;
    baseMeanLST: number;
    coolingDelta: number;
    meanNDVI: number;
    meanSpeed: number;
    stagnantAreaPercent: number;
  };
  interventions: PlacedIntervention[];
  onApplyRecommendation: (item: ActionPlanItem) => void;
  ambientTemp: number;
  windSpeed: number;
  windDirection: number;
  relativeHumidity: number;
}

export const GeminiMitigationPanel: React.FC<GeminiMitigationPanelProps> = ({
  preset,
  geminiData,
  isLoadingGemini,
  onRunGemini,
  metrics,
  interventions,
  onApplyRecommendation,
  ambientTemp,
  windSpeed,
  windDirection,
  relativeHumidity,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'diurnal' | 'flora' | 'report'>('diagnosis');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Compute cooling and energy offsets
  const netCoolingC = Math.min(0, metrics.coolingDelta);
  const estimatedEnergySavings = Math.min(35, Math.abs(netCoolingC) * 5.2);

  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    try {
      exportMicroclimatePDFReport({
        preset,
        geminiData,
        metrics,
        interventions,
        ambientTemp,
        windSpeed,
        windDirection,
        relativeHumidity,
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <aside className="w-96 border-l border-slate-800 bg-[#0B0F1A] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Top Telemetry Header & Tab Navigation */}
      <div className="p-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Microclimate Analysis & AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Download Formatted PDF Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <span className="text-slate-600 font-mono text-xs">·</span>
            <span className="font-mono text-xs text-slate-400">
              {geminiData?.model || 'Gemini 3.8 Flash'}
            </span>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'diagnosis'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Plan
          </button>
          <button
            onClick={() => setActiveTab('diurnal')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'diurnal'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            24H Cycle
          </button>
          <button
            onClick={() => setActiveTab('flora')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'flora'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flora
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'report'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Brief
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="p-4 border-b border-slate-800 bg-[#080B13] shrink-0">
        <div className="grid grid-cols-2 gap-3">
          {/* Mean LST Delta */}
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-[11px] text-slate-400">Mean Surface Temp</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-100 tabular-nums">
                {metrics.meanLST.toFixed(1)}°C
              </span>
              <span
                className={`text-xs font-mono font-semibold tabular-nums ${
                  netCoolingC < -0.1 ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {netCoolingC.toFixed(1)}°C
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Baseline: {metrics.baseMeanLST.toFixed(1)}°C
            </div>
          </div>

          {/* Cooling Energy Offset */}
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-[11px] text-slate-400">Cooling Load Offset</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                ~{estimatedEnergySavings.toFixed(1)}%
              </span>
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              AC energy reduction
            </div>
          </div>

          {/* Vegetation NDVI */}
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-[11px] text-slate-400">Vegetation (NDVI)</div>
            <div className="text-base font-bold font-mono text-emerald-400 tabular-nums mt-0.5">
              {metrics.meanNDVI.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Target: ≥ 0.40
            </div>
          </div>

          {/* Stagnant Airflow Zone */}
          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
            <div className="text-[11px] text-slate-400">Stagnant Hotspot Area</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums mt-0.5">
              {metrics.stagnantAreaPercent.toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Wind &lt; 1.0 m/s
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: AI Strategy & Recommendations */}
        {activeTab === 'diagnosis' && (
          <>
            {/* Embedded D3 24-Hour Diurnal Temperature Chart */}
            <DailyDiurnalTemperatureChart
              baseMeanTemp={preset.ambientTemp}
              netCoolingDelta={netCoolingC}
              interventions={interventions}
              cityName={preset.name}
            />

            {/* If no Gemini run yet */}
            {!geminiData && !isLoadingGemini && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Run AI Natural Cooling Planner
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Deploy Google Gemini 3.8 Flash to analyze aerodynamic wake vortices, heat accumulation, and propose concrete passive cooling solutions.
                  </p>
                </div>
                <button
                  onClick={onRunGemini}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                >
                  Analyze & Generate Plan
                </button>
              </div>
            )}

            {isLoadingGemini && (
              <div className="p-8 text-center space-y-3 text-xs text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
                <p className="font-mono text-slate-300">
                  Synthesizing satellite thermal metrics & aerodynamic vector fields...
                </p>
              </div>
            )}

            {geminiData && (
              <div className="space-y-4">
                {/* Executive Diagnosis Banner */}
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">Microclimate Assessment</span>
                    <span className="font-mono text-[11px] text-rose-400 font-bold">
                      {geminiData.diagnosis.heatSeverityLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {geminiData.diagnosis.summary}
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-semibold">Aerodynamic Drag: </span>
                    {geminiData.diagnosis.stagnationFactor}
                  </div>
                </div>

                {/* Airflow Guidance */}
                <div className="p-3.5 rounded-lg border border-cyan-900/40 bg-cyan-950/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <Wind className="w-3.5 h-3.5" />
                    <span>Ventilation & Cross-Breeze Directive</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {geminiData.airflowGuidance.canyonClearanceRecommendation}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {geminiData.airflowGuidance.prevailingWindAlignmentNotes}
                  </p>
                </div>

                {/* Actionable Natural Cooling Plan Items */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Proposed Interventions
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {geminiData.actionPlan.length} Actions
                    </span>
                  </div>

                  {geminiData.actionPlan.map((action) => {
                    const isAlreadyApplied = interventions.some((it) => it.type === action.type);
                    return (
                      <div
                        key={action.id}
                        className="p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/70 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase ${
                                  action.implementationPriority === 'CRITICAL'
                                    ? 'text-rose-400'
                                    : action.implementationPriority === 'HIGH'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {action.implementationPriority}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px]">·</span>
                              <span className="text-[10px] font-mono text-cyan-400">
                                Δ {action.coolingImpactC} °C
                              </span>
                            </div>
                            <h5 className="text-xs font-semibold text-slate-100 mt-0.5">
                              {action.title}
                            </h5>
                          </div>

                          <button
                            onClick={() => onApplyRecommendation(action)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                              isAlreadyApplied
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                                : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
                            }`}
                          >
                            {isAlreadyApplied ? 'Applied' : '+ Apply'}
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {action.engineeringDetails}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1 text-[10px]">
                          <span className="text-slate-400">Materials / Flora:</span>
                          <span className="text-slate-200 font-medium">
                            {action.specificSpeciesOrMaterials.join(', ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ecological & Social Co-Benefits */}
                <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Ecological & Public Health Benefits
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {geminiData.ecologicalAndSocialCoBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Dedicated 24H Diurnal Simulation Focus */}
        {activeTab === 'diurnal' && (
          <div className="space-y-4">
            <DailyDiurnalTemperatureChart
              baseMeanTemp={preset.ambientTemp}
              netCoolingDelta={netCoolingC}
              interventions={interventions}
              cityName={preset.name}
            />

            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Diurnal Microclimate Dynamics
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                The D3.js line chart renders a full 24-hour cycle showing the divergence between baseline Urban Heat Island temperatures and mitigated conditions.
              </p>
              <div className="space-y-1.5 pt-1 text-[11px] text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-semibold shrink-0">11:00 - 16:00 (Midday):</span>
                  <span>Native tree canopy shading and high-albedo pavements block solar radiation, achieving peak temperature suppression.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-semibold shrink-0">18:00 - 02:00 (Nighttime):</span>
                  <span>Cross-ventilation corridors flush trapped canyon eddies, breaking the nocturnal heat dome that plagues dense cities.</span>
                </div>
              </div>
            </div>

            {/* Active Interventions Breakdown */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Interventions ({interventions.length})
              </span>
              {interventions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No interventions placed. Use the left toolbar to plant tree groves, carve breezeways, or install green roofs to see the diurnal curve adjust dynamically.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {interventions.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-slate-900 border border-slate-800"
                    >
                      <span className="text-slate-200 truncate max-w-[180px]">{it.label}</span>
                      <span className="text-emerald-400 font-bold">{it.coolingDelta} °C</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Regional Native Flora Catalog */}
        {activeTab === 'flora' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">
                Climate-Adapted Native Tree Species
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Optimized for {preset.name} biome ({preset.climateZone}). Selected for high Leaf Area Index (LAI) and drought resilience.
              </p>
            </div>

            <div className="space-y-3">
              {preset.nativeSpecies.map((sp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-900/70 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-100">{sp.commonName}</h5>
                      <span className="text-[11px] italic text-emerald-400">{sp.scientificName}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-400 tabular-nums">
                      {sp.coolingPotentialC} °C
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {sp.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Canopy:</span>
                      <span className="text-slate-200">{sp.canopySpreadMeters}m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">LAI Index:</span>
                      <span className="text-slate-200">{sp.leafAreaIndex}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Water:</span>
                      <span className="text-slate-200">{sp.waterNeed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Executive Impact Brief & Export */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/80 space-y-2">
              <h4 className="text-xs font-bold text-slate-100">
                Microclimate Planning Commission Brief
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Summary of simulated passive cooling strategies for {preset.name}. Ready for municipal council review and climate resilience filings.
              </p>
              <div className="space-y-1 pt-2 border-t border-slate-800 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Geographic Domain:</span>
                  <span className="text-slate-200">{preset.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Projected Cooling (ΔT):</span>
                  <span className="text-emerald-400 font-bold">{netCoolingC.toFixed(1)} °C</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Peak AC Chiller Offset:</span>
                  <span className="text-emerald-400 font-bold">~{estimatedEnergySavings.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Interventions:</span>
                  <span className="text-cyan-400 font-bold">{interventions.length} Placed</span>
                </div>
              </div>
            </div>

            {/* Direct PDF Download Action */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Generating Document...' : 'Download Formatted PDF Report (.pdf)'}</span>
            </button>

            {/* In-Browser Preview Modal Trigger */}
            <button
              onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Preview Microclimate Report Modal</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Executive Microclimate Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0F1A] border border-slate-700 rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Urban Microclimate Mitigation Report
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1 font-mono">
                <div>LOCATION: {preset.name} ({preset.country})</div>
                <div>COORDINATES: {preset.coordinates.lat}° N, {preset.coordinates.lng}° E</div>
                <div>CLIMATE ZONE: {preset.climateZone}</div>
                <div>EVALUATION MODEL: Google Gemini 3.8 Flash + 2D Navier-Stokes CFD Proxy + D3.js Diurnal Engine</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1">1. Executive Microclimate Summary</h4>
                <p className="text-slate-300 leading-relaxed">
                  {geminiData?.diagnosis.summary ||
                    `Simulated microclimate modeling indicates dense impervious surfaces and aerodynamic street canyon aspect ratios contribute to severe heat island buildup. Introducing passive nature-based corridors reduces surface temperatures by ${Math.abs(netCoolingC).toFixed(1)}°C.`}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1">2. Quantitative Microclimate Impact</h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block">Baseline Surface Temp:</span>
                    <span className="text-rose-400 font-bold">{metrics.baseMeanLST.toFixed(1)} °C</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block">Mitigated Surface Temp:</span>
                    <span className="text-emerald-400 font-bold">{metrics.meanLST.toFixed(1)} °C</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block">Net Cooling Achieved:</span>
                    <span className="text-emerald-400 font-bold">{netCoolingC.toFixed(1)} °C</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block">Peak HVAC Energy Offset:</span>
                    <span className="text-emerald-400 font-bold">~{estimatedEnergySavings.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Diurnal Chart in Report */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">3. 24-Hour Diurnal Cooling Projection</h4>
                <DailyDiurnalTemperatureChart
                  baseMeanTemp={preset.ambientTemp}
                  netCoolingDelta={netCoolingC}
                  interventions={interventions}
                  cityName={preset.name}
                />
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1">4. Recommended Species & Material Specifications</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {preset.nativeSpecies.map((sp, i) => (
                    <li key={i}>
                      <span className="font-semibold text-slate-200">{sp.commonName}</span> ({sp.scientificName}): LAI {sp.leafAreaIndex}, {sp.canopySpreadMeters}m canopy spread.
                    </li>
                  ))}
                  <li>High-Albedo Cool Coating: Titanium Dioxide elastomeric slurry (Solar Reflectance Index SRI ≥ 85).</li>
                  <li>Extensive Green Roof: Sedum mix with 120mm volcanic pumice substratum.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print System Dialog</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Formatted PDF (.pdf)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
