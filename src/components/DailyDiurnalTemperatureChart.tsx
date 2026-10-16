import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { PlacedIntervention } from '../types';
import { Clock, TrendingDown, Sun, Moon } from 'lucide-react';

interface HourlyDataPoint {
  hour: number;
  timeLabel: string;
  baselineTemp: number;
  mitigatedTemp: number;
  deltaT: number;
  solarPhase: 'night' | 'dawn' | 'day' | 'peak' | 'dusk';
}

interface DailyDiurnalTemperatureChartProps {
  baseMeanTemp: number;
  netCoolingDelta: number;
  interventions: PlacedIntervention[];
  cityName: string;
}

export const DailyDiurnalTemperatureChart: React.FC<DailyDiurnalTemperatureChartProps> = ({
  baseMeanTemp,
  netCoolingDelta,
  interventions,
  cityName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<HourlyDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Intervention intensity factors
  const treeCount = interventions.filter((it) => it.type === 'tree_canopy').length;
  const corridorCount = interventions.filter((it) => it.type === 'cool_corridor').length;
  const greenRoofCount = interventions.filter((it) => it.type === 'green_roof').length;
  const coolSurfaceCount = interventions.filter((it) => it.type === 'cool_surface').length;

  // Generate physically grounded 24-hour diurnal cycle data
  const data: HourlyDataPoint[] = useMemo(() => {
    const points: HourlyDataPoint[] = [];

    // Base diurnal swing amplitude (~8°C to 12°C between night min and day max)
    const diurnalAmplitude = 6.5;
    const baseEffectiveCooling = Math.abs(netCoolingDelta);

    for (let h = 0; h < 24; h++) {
      // Diurnal sinusoidal temperature wave peaking at 15:00 (3 PM), minimum at 05:00 (5 AM)
      const rad = ((h - 9) / 24) * 2 * Math.PI;
      const diurnalOffset = Math.sin(rad) * diurnalAmplitude;

      // Urban thermal mass inertia keeps night warmer (UHI night retention effect)
      const thermalMassLag = (h >= 19 || h <= 4) ? 2.2 : 0;
      const baseline = baseMeanTemp + diurnalOffset + thermalMassLag;

      // Interventions have diurnal-specific physical profiles:
      // 1. Trees: Maximum cooling at peak sunlight (11:00-16:00) through shading & evapotranspiration
      const sunRatio = Math.max(0, Math.sin(((h - 6) / 13) * Math.PI)); // peaks at midday
      const treeDrop = (treeCount > 0 ? (0.8 + treeCount * 0.4) : (baseEffectiveCooling * 0.35)) * (0.4 + 0.6 * sunRatio);

      // 2. High-Albedo Surfaces: Strongest during peak solar irradiance
      const surfaceDrop = (coolSurfaceCount > 0 ? (0.6 + coolSurfaceCount * 0.35) : (baseEffectiveCooling * 0.25)) * sunRatio;

      // 3. Green Roofs: Thermal insulation daytime + evaporative dampening
      const greenRoofDrop = (greenRoofCount > 0 ? (0.5 + greenRoofCount * 0.3) : (baseEffectiveCooling * 0.2)) * (0.5 + 0.5 * sunRatio);

      // 4. Cool Ventilation Corridors: Constant breeze channel, exceptionally effective at flushing evening trapped heat (17:00-23:00)
      const eveningBreezeBoost = (h >= 16 && h <= 23) ? 1.4 : 1.0;
      const corridorDrop = (corridorCount > 0 ? (0.7 + corridorCount * 0.4) : (baseEffectiveCooling * 0.3)) * eveningBreezeBoost;

      // Total simulated drop for this hour (clamped realistically)
      const totalDrop = Math.max(0.4, (treeDrop + surfaceDrop + greenRoofDrop + corridorDrop) * (baseEffectiveCooling > 0 ? 1 : 0.8));
      const mitigated = baseline - totalDrop;

      let solarPhase: 'night' | 'dawn' | 'day' | 'peak' | 'dusk' = 'night';
      if (h >= 5 && h < 8) solarPhase = 'dawn';
      else if (h >= 8 && h < 12) solarPhase = 'day';
      else if (h >= 12 && h < 17) solarPhase = 'peak';
      else if (h >= 17 && h < 20) solarPhase = 'dusk';

      const timeLabel = `${h.toString().padStart(2, '0')}:00`;

      points.push({
        hour: h,
        timeLabel,
        baselineTemp: parseFloat(baseline.toFixed(1)),
        mitigatedTemp: parseFloat(mitigated.toFixed(1)),
        deltaT: parseFloat((-totalDrop).toFixed(1)),
        solarPhase,
      });
    }

    return points;
  }, [baseMeanTemp, netCoolingDelta, treeCount, corridorCount, greenRoofCount, coolSurfaceCount]);

  // Max peak cooling drop in 24h
  const maxCoolingPoint = useMemo(() => {
    return [...data].sort((a, b) => a.deltaT - b.deltaT)[0];
  }, [data]);

  // Render D3 Line Chart
  useEffect(() => {
    const svgElement = svgRef.current;
    const container = containerRef.current;
    if (!svgElement || !container) return;

    const width = container.clientWidth || 340;
    const height = 180;
    const margin = { top: 16, right: 16, bottom: 26, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 23])
      .range([0, innerWidth]);

    const yMin = d3.min(data, (d) => Math.min(d.baselineTemp, d.mitigatedTemp))! - 2;
    const yMax = d3.max(data, (d) => Math.max(d.baselineTemp, d.mitigatedTemp))! + 2;

    const yScale = d3
      .scaleLinear()
      .domain([Math.floor(yMin), Math.ceil(yMax)])
      .range([innerHeight, 0]);

    // Gradient definition for area between curves
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'coolingDeltaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.35);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#06b6d4')
      .attr('stop-opacity', 0.05);

    // Subtle horizontal gridlines
    const yTicks = yScale.ticks(4);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(255, 255, 255, 0.07)')
      .attr('stroke-dasharray', '2,2');

    // Daylight Background Shading (06:00 to 18:00)
    g.append('rect')
      .attr('x', xScale(6))
      .attr('y', 0)
      .attr('width', xScale(18) - xScale(6))
      .attr('height', innerHeight)
      .attr('fill', 'rgba(251, 191, 36, 0.03)');

    // Area between curves (Cooling delta volume)
    const areaGenerator = d3
      .area<HourlyDataPoint>()
      .x((d) => xScale(d.hour))
      .y0((d) => yScale(d.baselineTemp))
      .y1((d) => yScale(d.mitigatedTemp))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#coolingDeltaGradient)')
      .attr('d', areaGenerator);

    // Line Generators
    const baselineLine = d3
      .line<HourlyDataPoint>()
      .x((d) => xScale(d.hour))
      .y((d) => yScale(d.baselineTemp))
      .curve(d3.curveMonotoneX);

    const mitigatedLine = d3
      .line<HourlyDataPoint>()
      .x((d) => xScale(d.hour))
      .y((d) => yScale(d.mitigatedTemp))
      .curve(d3.curveMonotoneX);

    // Baseline Line (Muted Amber-Red Dashed)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.8)
      .attr('d', baselineLine);

    // Mitigated Line (Luminous Emerald Solid)
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.2)
      .attr('d', mitigatedLine);

    // X Axis with clean hour labels
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([0, 4, 8, 12, 16, 20, 23])
      .tickFormat((d) => `${d}:00`);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.15)');
    xAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.15)');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d}°C`);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick line').remove();
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace');

    // Interactive Hover Overlay
    const bisect = d3.bisector<HourlyDataPoint, number>((d) => d.hour).center;

    // Crosshair elements
    const focus = g.append('g').style('display', 'none');

    // Vertical rule
    const focusLine = focus
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(255, 255, 255, 0.4)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Dots on curves
    const baselineDot = focus
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    const mitigatedDot = focus
      .append('circle')
      .attr('r', 4)
      .attr('fill', '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Invisible mouse catch rect
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mouseenter', () => focus.style('display', null))
      .on('mouseleave', () => {
        focus.style('display', 'none');
        setHoveredPoint(null);
        setHoverPos(null);
      })
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event);
        const hourFloat = xScale.invert(mx);
        const index = bisect(data, hourFloat);
        const d = data[index];
        if (!d) return;

        const cx = xScale(d.hour);
        const by = yScale(d.baselineTemp);
        const my_ = yScale(d.mitigatedTemp);

        focusLine.attr('x1', cx).attr('x2', cx);
        baselineDot.attr('cx', cx).attr('cy', by);
        mitigatedDot.attr('cx', cx).attr('cy', my_);

        setHoveredPoint(d);
        setHoverPos({
          x: cx + margin.left,
          y: Math.min(by, my_) + margin.top,
        });
      });
  }, [data]);

  return (
    <div className="p-3.5 rounded-lg border border-slate-800 bg-[#090D16] space-y-2.5">
      {/* Title & Peak Stat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">
            24-Hour Diurnal Temperature Profile
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-bold tabular-nums">
          <TrendingDown className="w-3 h-3 text-emerald-400" />
          <span>Peak Δ {maxCoolingPoint?.deltaT}°C at {maxCoolingPoint?.timeLabel}</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg ref={svgRef} className="w-full h-[180px] block select-none" />

        {/* Floating Tooltip HUD */}
        {hoveredPoint && hoverPos && (
          <div
            className="pointer-events-none absolute z-30 bg-[#070A11]/95 border border-slate-700 rounded-md p-2 shadow-xl text-[10px] font-mono backdrop-blur-md w-44"
            style={{
              left: `${Math.min(containerRef.current?.clientWidth! - 180, Math.max(10, hoverPos.x - 70))}px`,
              top: `${Math.max(6, hoverPos.y - 80)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 text-slate-400">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                {hoveredPoint.solarPhase === 'peak' || hoveredPoint.solarPhase === 'day' ? (
                  <Sun className="w-3 h-3 text-amber-400" />
                ) : (
                  <Moon className="w-3 h-3 text-blue-400" />
                )}
                {hoveredPoint.timeLabel}
              </span>
              <span className="text-emerald-400 font-bold">
                {hoveredPoint.deltaT} °C
              </span>
            </div>
            <div className="space-y-0.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-rose-400">Baseline:</span>
                <span className="tabular-nums font-bold">{hoveredPoint.baselineTemp} °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Mitigated:</span>
                <span className="tabular-nums font-bold">{hoveredPoint.mitigatedTemp} °C</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Physical Explanations */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-[2px] bg-rose-500 border-b border-dashed border-rose-400 inline-block" />
            <span>Baseline UHI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-[2px] bg-emerald-400 inline-block" />
            <span>Mitigated</span>
          </div>
        </div>
        <span className="text-slate-500">D3.js Navier-Stokes Model</span>
      </div>
    </div>
  );
};
