import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  BuildingFootprint,
  CityPreset,
  InterventionType,
  LayerType,
  PlacedIntervention,
} from '../types';
import { CFDMicroclimateEngine } from '../utils/cfdSimulation';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Maximize2,
  TreePine,
  Layers,
  Wind,
  ShieldCheck,
  Split,
  Eye,
  Trash2,
  Flame,
  Thermometer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface UrbanCanvasProps {
  engine: CFDMicroclimateEngine;
  preset: CityPreset;
  activeLayer: LayerType;
  setActiveLayer: (layer: LayerType) => void;
  activeTool: 'inspect' | InterventionType | 'erase';
  interventions: PlacedIntervention[];
  onAddIntervention: (intervention: PlacedIntervention) => void;
  onRemoveIntervention: (id: string) => void;
  onClearInterventions: () => void;
  isSimulatingWind: boolean;
  setIsSimulatingWind: (val: boolean) => void;
  splitCompare: boolean;
  setSplitCompare: (val: boolean) => void;
}

export const UrbanCanvas: React.FC<UrbanCanvasProps> = ({
  engine,
  preset,
  activeLayer,
  setActiveLayer,
  activeTool,
  interventions,
  onAddIntervention,
  onRemoveIntervention,
  onClearInterventions,
  isSimulatingWind,
  setIsSimulatingWind,
  splitCompare,
  setSplitCompare,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    temp: number;
    baseTemp: number;
    speed: number;
    ndvi: number;
    building?: BuildingFootprint;
    intervention?: PlacedIntervention;
  } | null>(null);

  const [splitPos, setSplitPos] = useState<number>(50); // 0..100%
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(true);
  const animationFrameId = useRef<number | null>(null);

  // Dynamic Land Surface Temperature (LST) Extremes across active grid
  const thermalExtremes = useMemo(() => {
    let minT = 999;
    let maxT = -999;
    let sumT = 0;
    let count = 0;
    const N = engine.gridSize;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = engine.grid[r]?.[c];
        if (cell) {
          const t = cell.currentLST;
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
          sumT += t;
          count++;
        }
      }
    }
    return {
      min: minT === 999 ? 24.0 : minT,
      max: maxT === -999 ? 52.0 : maxT,
      mean: count > 0 ? sumT / count : 38.0,
      range: (maxT !== -999 && minT !== 999) ? Math.max(0, maxT - minT) : 28.0,
    };
  }, [engine, preset, interventions]);

  // Convert LST temperature to RGB color ramp
  const getLSTColor = (t: number): [number, number, number] => {
    // Range roughly 24°C (cool blue) to 52°C+ (extreme red)
    const norm = Math.max(0, Math.min(1, (t - 26) / 26));
    if (norm < 0.25) {
      // 0.0 - 0.25: Deep Navy to Teal
      const f = norm / 0.25;
      return [Math.round(20 + 15 * f), Math.round(40 + 130 * f), Math.round(90 + 80 * f)];
    } else if (norm < 0.5) {
      // 0.25 - 0.5: Teal to Lime/Yellow
      const f = (norm - 0.25) / 0.25;
      return [Math.round(35 + 185 * f), Math.round(170 + 60 * f), Math.round(170 - 130 * f)];
    } else if (norm < 0.75) {
      // 0.5 - 0.75: Yellow to Orange/Amber
      const f = (norm - 0.5) / 0.25;
      return [Math.round(220 + 25 * f), Math.round(230 - 100 * f), Math.round(40 - 20 * f)];
    } else {
      // 0.75 - 1.0: Orange to Crimson
      const f = (norm - 0.75) / 0.25;
      return [Math.round(245 + 10 * f), Math.round(130 - 100 * f), Math.round(20 + 40 * f)];
    }
  };

  const getNDVIColor = (val: number): [number, number, number] => {
    const norm = Math.max(0, Math.min(1, val));
    // Ochre/concrete to lush emerald
    return [
      Math.round(180 - norm * 150),
      Math.round(140 + norm * 80),
      Math.round(90 - norm * 50),
    ];
  };

  const getNDBIColor = (val: number): [number, number, number] => {
    const norm = Math.max(0, Math.min(1, val));
    // Soft slate to dense purple-gray
    return [
      Math.round(70 + norm * 120),
      Math.round(80 + norm * 40),
      Math.round(110 + norm * 130),
    ];
  };

  // Main Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const N = engine.gridSize;
    const cellW = width / (N - 1);
    const cellH = height / (N - 1);

    const splitDividerX = (splitPos / 100) * width;

    // 1. Draw Background Thermal / Index Matrix
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        const x = c * cellW;
        const y = r * cellH;
        const cell = engine.grid[r][c];

        // If splitCompare is enabled: left side is Baseline, right side is Mitigated
        const isLeftOfSplit = splitCompare && x < splitDividerX;
        const tempToUse = isLeftOfSplit ? cell.baseLST : cell.currentLST;

        if (activeLayer === 'lst' || activeLayer === 'combined') {
          const [R, G, B] = getLSTColor(tempToUse);
          ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        } else if (activeLayer === 'ndvi') {
          const [R, G, B] = getNDVIColor(cell.ndvi);
          ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        } else if (activeLayer === 'ndbi') {
          const [R, G, B] = getNDBIColor(cell.ndbi);
          ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        } else if (activeLayer === 'wind') {
          const spdNorm = Math.min(1, cell.speed / 6.0);
          const R = Math.round(15 + spdNorm * 40);
          const G = Math.round(35 + spdNorm * 180);
          const B = Math.round(80 + spdNorm * 150);
          ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        }

        ctx.fillRect(x, y, cellW + 1, cellH + 1);
      }
    }

    // 2. Draw Street Grid Lines / Urban Cadastre
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += cellW * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += cellH * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Draw Placed Interventions (on ground level before buildings)
    for (const it of interventions) {
      const px = (it.x / 100) * width;
      const py = (it.y / 100) * height;

      if (it.type === 'tree_canopy') {
        const radius = ((it.radius || 12) / 100) * width;
        // Dappled foliage canopy
        const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
        grad.addColorStop(0.7, 'rgba(5, 150, 105, 0.65)');
        grad.addColorStop(1, 'rgba(4, 120, 87, 0.05)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();

        // Canopy border
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trunk dot
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.type === 'cool_corridor') {
        const w = ((it.width || 24) / 100) * width;
        const h = ((it.height || 18) / 100) * height;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(px - w / 2, py - h / 2, w, h);
        ctx.fillRect(px - w / 2, py - h / 2, w, h);
        ctx.setLineDash([]);

        // Flow chevron icon
        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('➔ VENTILATION BREEZEWAY', px, py + 4);
      } else if (it.type === 'cool_surface') {
        const w = ((it.width || 20) / 100) * width;
        const h = ((it.height || 20) / 100) * height;
        ctx.fillStyle = 'rgba(241, 245, 249, 0.35)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(px - w / 2, py - h / 2, w, h);
        ctx.strokeRect(px - w / 2, py - h / 2, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HIGH-SRI PAVEMENT', px, py + 3);
      }
    }

    // 4. Draw 2.5D Building Footprints & Rooftops
    for (const b of preset.buildings) {
      const bx = (b.x / 100) * width;
      const by = (b.y / 100) * height;
      const bw = (b.width / 100) * width;
      const bh = (b.height / 100) * height;

      // Isometric depth offset based on stories
      const depth = Math.min(24, Math.max(4, b.stories * 0.45));

      // Check if green roof or cool roof intervention placed on this building
      const hasGreenRoofIntervention = interventions.some(
        (it) => it.type === 'green_roof' && Math.hypot(it.x - (b.x + b.width / 2), it.y - (b.y + b.height / 2)) < 15
      );
      const hasCoolRoofIntervention = interventions.some(
        (it) => it.type === 'cool_surface' && Math.hypot(it.x - (b.x + b.width / 2), it.y - (b.y + b.height / 2)) < 15
      );

      // Building Cast Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(bx + depth * 0.8, by + depth * 0.8, bw, bh);

      // Extruded Facade Walls
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by + bh);
      ctx.lineTo(bx - depth * 0.5, by + bh - depth);
      ctx.lineTo(bx - depth * 0.5, by - depth);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - depth * 0.5, by - depth);
      ctx.lineTo(bx + bw - depth * 0.5, by - depth);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // Rooftop Face
      if (hasGreenRoofIntervention) {
        // Living Green Roof
        ctx.fillStyle = '#065f46';
        ctx.fillRect(bx - depth * 0.5, by - depth, bw, bh);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - depth * 0.5, by - depth, bw, bh);

        // Sedum pattern
        ctx.fillStyle = '#10b981';
        ctx.font = '10px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌿 GREEN ROOF', bx + bw / 2 - depth * 0.5, by + bh / 2 - depth + 3);
      } else if (hasCoolRoofIntervention) {
        // Cool Titanium White Roof
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(bx - depth * 0.5, by - depth, bw, bh);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - depth * 0.5, by - depth, bw, bh);

        ctx.fillStyle = '#0f172a';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SRI 92 COOL ROOF', bx + bw / 2 - depth * 0.5, by + bh / 2 - depth + 3);
      } else {
        // Standard Impervious Dark Thermal Concrete Roof
        ctx.fillStyle = '#334155';
        ctx.fillRect(bx - depth * 0.5, by - depth, bw, bh);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - depth * 0.5, by - depth, bw, bh);

        // Height notation
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${b.heightMeters}m · ${b.stories}F`, bx + bw / 2 - depth * 0.5, by + bh / 2 - depth + 3);
      }
    }

    // 5. Draw Animated CFD Wind Particle Streamlines
    if (isSimulatingWind) {
      engine.updateParticles(1.0);

      for (const p of engine.particles) {
        const px = (p.x / 100) * width;
        const py = (p.y / 100) * height;

        // Skip particles on the baseline side if split view is enabled
        if (splitCompare && px < splitDividerX) continue;

        const lifeRatio = 1 - (p.age / p.maxAge);
        const trailLen = Math.max(4, Math.min(22, p.speed * 4.5));

        const angle = Math.atan2(p.vy, p.vx);
        const tailX = px - Math.cos(angle) * trailLen;
        const tailY = py - Math.sin(angle) * trailLen;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(px, py);

        // Color based on wind speed (Cyan fast -> Teal moderate -> Amber stagnant)
        if (p.speed > 3.0) {
          ctx.strokeStyle = `rgba(6, 182, 212, ${lifeRatio * 0.85})`;
          ctx.lineWidth = 1.8;
        } else if (p.speed > 1.2) {
          ctx.strokeStyle = `rgba(16, 185, 129, ${lifeRatio * 0.7})`;
          ctx.lineWidth = 1.4;
        } else {
          ctx.strokeStyle = `rgba(245, 158, 11, ${lifeRatio * 0.6})`;
          ctx.lineWidth = 1.1;
        }
        ctx.stroke();

        // Particle head glow
        ctx.fillStyle = p.speed > 2.0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(245, 158, 11, 0.8)';
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Split Screen Comparison Overlay
    if (splitCompare) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitDividerX, 0);
      ctx.lineTo(splitDividerX, height);
      ctx.stroke();

      // Split labels
      ctx.fillStyle = 'rgba(7, 10, 17, 0.85)';
      ctx.fillRect(splitDividerX - 110, 14, 100, 24);
      ctx.fillRect(splitDividerX + 10, 14, 110, 24);

      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText('BEFORE (BASELINE)', splitDividerX - 18, 30);

      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'left';
      ctx.fillText('AFTER (MITIGATED)', splitDividerX + 18, 30);

      // Split dragger handle
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(splitDividerX, height / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀▶', splitDividerX, height / 2 + 3);
    }

    animationFrameId.current = requestAnimationFrame(renderCanvas);
  }, [engine, preset, activeLayer, interventions, isSimulatingWind, splitCompare, splitPos]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(renderCanvas);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [renderCanvas]);

  // Canvas Resize observer
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Move / Hover Telemetry Inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (isDraggingSplit) {
      const pct = Math.max(5, Math.min(95, (clientX / rect.width) * 100));
      setSplitPos(pct);
      return;
    }

    const normX = (clientX / rect.width) * 100;
    const normY = (clientY / rect.height) * 100;

    const N = engine.gridSize;
    const gridC = Math.max(0, Math.min(N - 1, Math.round((normX / 100) * (N - 1))));
    const gridR = Math.max(0, Math.min(N - 1, Math.round((normY / 100) * (N - 1))));
    const cell = engine.grid[gridR]?.[gridC];

    const hoveredBuilding = preset.buildings.find(
      (b) => normX >= b.x && normX <= b.x + b.width && normY >= b.y && normY <= b.y + b.height
    );

    const hoveredIntervention = interventions.find(
      (it) => Math.hypot(normX - it.x, normY - it.y) < 8
    );

    if (cell) {
      setHoverData({
        x: normX,
        y: normY,
        screenX: e.clientX,
        screenY: e.clientY,
        temp: cell.currentLST,
        baseTemp: cell.baseLST,
        speed: cell.speed,
        ndvi: cell.ndvi,
        building: hoveredBuilding,
        intervention: hoveredIntervention,
      });
    }
  };

  // Canvas Click / Place Intervention
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width) * 100;
    const normY = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'erase') {
      const target = interventions.find(
        (it) => Math.hypot(normX - it.x, normY - it.y) < 10
      );
      if (target) onRemoveIntervention(target.id);
      return;
    }

    if (activeTool === 'inspect') return;

    // Place selected intervention
    const id = `int-${Date.now()}`;
    if (activeTool === 'tree_canopy') {
      const species = preset.nativeSpecies[0]?.commonName || 'Native Shade Canopy';
      onAddIntervention({
        id,
        type: 'tree_canopy',
        x: normX,
        y: normY,
        radius: 12,
        label: `${species} Grove`,
        speciesOrMaterial: species,
        details: 'Native evapotranspiration shade cluster with high LAI',
        coolingDelta: -1.6,
      });
    } else if (activeTool === 'cool_corridor') {
      onAddIntervention({
        id,
        type: 'cool_corridor',
        x: normX,
        y: normY,
        width: 24,
        height: 16,
        label: 'Cross-Ventilation Channel',
        speciesOrMaterial: 'Aerodynamic street setback & porous buffers',
        details: 'Channels prevailing wind through stagnant street canyons',
        coolingDelta: -1.8,
      });
    } else if (activeTool === 'green_roof') {
      onAddIntervention({
        id,
        type: 'green_roof',
        x: normX,
        y: normY,
        width: 18,
        height: 18,
        label: 'Extensive Biosolar Green Roof',
        speciesOrMaterial: 'Sedum album & drought-tolerant succulents',
        details: 'Lowers rooftop thermal absorption and eliminates thermal plumes',
        coolingDelta: -1.2,
      });
    } else if (activeTool === 'cool_surface') {
      onAddIntervention({
        id,
        type: 'cool_surface',
        x: normX,
        y: normY,
        width: 20,
        height: 20,
        label: 'High-Albedo Surface (SRI 88)',
        speciesOrMaterial: 'Solar-reflective elastomeric slurry',
        details: 'Shifts surface albedo from 0.08 to 0.45',
        coolingDelta: -0.9,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-[460px] bg-[#0A0D15] overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Viewport Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Layer Mode Segmented Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg shadow-lg pointer-events-auto">
          <button
            onClick={() => setActiveLayer('combined')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeLayer === 'combined'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Combined Microclimate
          </button>
          <button
            onClick={() => setActiveLayer('lst')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeLayer === 'lst'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Thermal LST Heatmap
          </button>
          <button
            onClick={() => setActiveLayer('wind')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeLayer === 'wind'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            CFD Wind Vectors
          </button>
          <button
            onClick={() => setActiveLayer('ndvi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeLayer === 'ndvi'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            NDVI Vegetation
          </button>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Split Mode Toggle */}
          <button
            onClick={() => setSplitCompare(!splitCompare)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              splitCompare
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle Before vs After Split Comparison"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Before / After Split</span>
          </button>

          {/* Wind Simulation Pause/Play */}
          <button
            onClick={() => setIsSimulatingWind(!isSimulatingWind)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isSimulatingWind
                ? 'bg-slate-900/90 border-slate-800 text-cyan-400 hover:text-cyan-300'
                : 'bg-amber-950/70 border-amber-800 text-amber-300'
            }`}
            title={isSimulatingWind ? 'Pause Wind Particle Stream' : 'Resume Wind Stream'}
          >
            {isSimulatingWind ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Clear Interventions */}
          {interventions.length > 0 && (
            <button
              onClick={onClearInterventions}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
              title="Clear all painted interventions"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear ({interventions.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverData(null)}
        onClick={handleCanvasClick}
        onMouseDown={() => {
          if (splitCompare && hoverData && Math.abs(hoverData.x - splitPos) < 4) {
            setIsDraggingSplit(true);
          }
        }}
        onMouseUp={() => setIsDraggingSplit(false)}
        className="w-full h-full flex-1 cursor-crosshair block"
      />

      {/* Dynamic Color-Coded Heat Intensity Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl text-xs overflow-hidden transition-all duration-200">
        {/* Legend Header with Dynamic Extremes & Expand/Collapse Toggle */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            {activeLayer === 'wind' ? (
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
            ) : activeLayer === 'ndvi' ? (
              <TreePine className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              {activeLayer === 'wind'
                ? 'Airflow Velocity Spectrum'
                : activeLayer === 'ndvi'
                ? 'Vegetation Index (NDVI) Scale'
                : 'LST Heat Intensity Spectrum'}
            </span>
          </div>

          <button
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={isLegendExpanded ? 'Collapse Legend Details' : 'Expand Heat Intensity Details'}
          >
            <span className="tabular-nums font-semibold text-slate-300">
              {thermalExtremes.min.toFixed(1)}° – {thermalExtremes.max.toFixed(1)}°C
            </span>
            {isLegendExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Gradient Bar with Real-Time Pointer */}
        <div className="p-3 space-y-2">
          {activeLayer === 'wind' ? (
            <div>
              <div className="w-full h-2.5 rounded-sm bg-gradient-to-r from-[#0f172a] via-[#10b981] via-[#06b6d4] to-[#ffffff]" />
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
                <span>0.0 m/s (Stagnant)</span>
                <span>2.5 m/s</span>
                <span>6.0+ m/s (Ventilated)</span>
              </div>
            </div>
          ) : activeLayer === 'ndvi' ? (
            <div>
              <div className="w-full h-2.5 rounded-sm bg-gradient-to-r from-[#b48c5a] via-[#84a055] via-[#22c55e] to-[#047857]" />
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
                <span>0.02 (Impervious)</span>
                <span>0.40 (Target)</span>
                <span>0.85+ (Dense Forest)</span>
              </div>
            </div>
          ) : (
            <div>
              {/* Thermal Gradient Bar with Current Mean Temperature Needle */}
              <div className="relative w-full">
                <div className="w-full h-3 rounded-sm bg-gradient-to-r from-[#14285a] via-[#0d9488] via-[#f59e0b] to-[#dc2626]" />

                {/* Real-time Dynamic Mean Pointer Needle */}
                {(() => {
                  const meanPct = Math.max(0, Math.min(100, ((thermalExtremes.mean - 24) / (52 - 24)) * 100));
                  return (
                    <div
                      className="absolute -top-1 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
                      style={{ left: `${meanPct}%` }}
                    >
                      <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[5px] border-t-white shadow-md" />
                      <div className="w-[1.5px] h-3.5 bg-white/90 shadow-sm" />
                    </div>
                  );
                })()}
              </div>

              {/* Min, Mean, Max Tick Readouts */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1.5">
                <span className="text-cyan-400 tabular-nums">24°C</span>
                <span className="text-emerald-400 tabular-nums font-semibold flex items-center gap-1">
                  <span>Mean: {thermalExtremes.mean.toFixed(1)}°C</span>
                </span>
                <span className="text-rose-400 tabular-nums font-semibold">52°C+</span>
              </div>
            </div>
          )}

          {/* Expanded Heat Intensity Classification Tiers */}
          {isLegendExpanded && (activeLayer === 'lst' || activeLayer === 'combined') && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              {/* Tier 1: Severe Hotspot */}
              <div className="flex items-center justify-between text-[11px] p-1 rounded bg-rose-950/20 border border-rose-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626] shrink-0" />
                  <span className="text-slate-200 font-medium">Severe Hotspot / Danger</span>
                </div>
                <span className="font-mono text-rose-400 font-bold tabular-nums">≥ 46.0°C</span>
              </div>

              {/* Tier 2: High Thermal Buildup */}
              <div className="flex items-center justify-between text-[11px] p-1 rounded bg-amber-950/20 border border-amber-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] shrink-0" />
                  <span className="text-slate-200 font-medium">High Thermal Buildup</span>
                </div>
                <span className="font-mono text-amber-400 font-bold tabular-nums">38.0 – 45.9°C</span>
              </div>

              {/* Tier 3: Moderate Buffer */}
              <div className="flex items-center justify-between text-[11px] p-1 rounded bg-teal-950/20 border border-teal-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488] shrink-0" />
                  <span className="text-slate-200 font-medium">Moderate Microclimate Buffer</span>
                </div>
                <span className="font-mono text-teal-400 font-bold tabular-nums">30.0 – 37.9°C</span>
              </div>

              {/* Tier 4: Cool Refugia */}
              <div className="flex items-center justify-between text-[11px] p-1 rounded bg-indigo-950/20 border border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#14285a] border border-cyan-500/40 shrink-0" />
                  <span className="text-slate-200 font-medium">Cool Canopy Refugia</span>
                </div>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">&lt; 30.0°C</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tool Active Prompt Banner */}
      {activeTool !== 'inspect' && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-600/70 text-emerald-200 rounded-lg text-xs shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            {activeTool === 'tree_canopy' && 'Click canvas to plant Native Shade Tree Canopy'}
            {activeTool === 'cool_corridor' && 'Click canvas to create Cross-Ventilation Breezeway'}
            {activeTool === 'green_roof' && 'Click building roof to install Biosolar Green Roof'}
            {activeTool === 'cool_surface' && 'Click asphalt ground to apply High-Albedo Coating'}
            {activeTool === 'erase' && 'Click any placed intervention to remove it'}
          </span>
        </div>
      )}

      {/* Point Telemetry Hover Inspector Card */}
      {hoverData && (
        <div
          className="pointer-events-none fixed z-50 bg-[#070A11]/95 border border-slate-700/80 shadow-2xl rounded-lg p-3 text-xs w-60 backdrop-blur-md"
          style={{
            left: `${Math.min(window.innerWidth - 260, hoverData.screenX + 16)}px`,
            top: `${Math.min(window.innerHeight - 180, hoverData.screenY + 16)}px`,
          }}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 font-mono text-[11px] text-slate-400">
            <span>GRID LOC: {hoverData.x.toFixed(1)}%, {hoverData.y.toFixed(1)}%</span>
            <span className={hoverData.temp < hoverData.baseTemp ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
              Δ {(hoverData.temp - hoverData.baseTemp).toFixed(1)}°C
            </span>
          </div>

          <div className="space-y-1 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current LST:</span>
              <span className={`font-bold tabular-nums ${hoverData.temp > 44 ? 'text-rose-400' : hoverData.temp > 36 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {hoverData.temp.toFixed(1)} °C
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Baseline LST:</span>
              <span className="tabular-nums text-slate-300">{hoverData.baseTemp.toFixed(1)} °C</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Local Airflow:</span>
              <span className="text-cyan-400 tabular-nums">{hoverData.speed.toFixed(2)} m/s</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Vegetation (NDVI):</span>
              <span className="text-emerald-400 tabular-nums">{hoverData.ndvi.toFixed(2)}</span>
            </div>
          </div>

          {hoverData.building && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[11px] text-slate-300">
              <span className="text-cyan-400 font-medium">Urban Footprint:</span> {hoverData.building.heightMeters}m ({hoverData.building.stories} Stories)
            </div>
          )}

          {hoverData.intervention && (
            <div className="mt-2 pt-1.5 border-t border-emerald-900/50 text-[11px] text-emerald-300">
              <span className="font-semibold text-emerald-400">Active Mitigation:</span> {hoverData.intervention.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
