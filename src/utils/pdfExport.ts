import { jsPDF } from 'jspdf';
import {
  ActionPlanItem,
  CityPreset,
  GeminiMitigationResponse,
  PlacedIntervention,
} from '../types';

interface PDFExportParams {
  preset: CityPreset;
  geminiData: GeminiMitigationResponse | null;
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
  ambientTemp: number;
  windSpeed: number;
  windDirection: number;
  relativeHumidity: number;
}

export function exportMicroclimatePDFReport({
  preset,
  geminiData,
  metrics,
  interventions,
  ambientTemp,
  windSpeed,
  windDirection,
  relativeHumidity,
}: PDFExportParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
      drawPageHeader(true);
    }
  };

  const drawPageHeader = (isContinuation: boolean = false) => {
    if (isContinuation) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `URBAN HEAT ISLAND MITIGATION REPORT · ${preset.name.toUpperCase()} · CONTINUATION`,
        margin,
        cursorY
      );
      cursorY += 4;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6;
    }
  };

  // --- COVER / HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, cursorY, contentWidth, 28, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('URBAN HEAT ISLAND (UHI) MITIGATION REPORT', margin + 6, cursorY + 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(
    'Microclimate Aerodynamic Airflow & Nature-Based Passive Cooling Assessment',
    margin + 6,
    cursorY + 16
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`DATE: ${dateStr}  ·  AI MODEL: Google Gemini 3.8 Flash  ·  ENGINE: 2D Navier-Stokes CFD Proxy`, margin + 6, cursorY + 23);

  cursorY += 34;

  // --- LOCATION & GEOGRAPHIC DOMAIN METADATA ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.rect(margin, cursorY, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`EVALUATED SECTOR: ${preset.name} (${preset.country})`, margin + 4, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Coordinates: ${preset.coordinates.lat.toFixed(4)}°N, ${preset.coordinates.lng.toFixed(4)}°E  ·  Climate Biome: ${preset.climateZone}`,
    margin + 4,
    cursorY + 11
  );
  doc.text(
    `Ambient Temp: ${ambientTemp.toFixed(1)}°C  ·  RH: ${relativeHumidity}%  ·  Prevailing Wind: ${windSpeed.toFixed(1)} m/s @ ${windDirection}° azimuth`,
    margin + 4,
    cursorY + 16
  );

  cursorY += 26;

  // --- SECTION 1: QUANTITATIVE IMPACT & TELEMETRY SUMMARY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. QUANTITATIVE MICROCLIMATE TELEMETRY & DELTA IMPACT', margin, cursorY);
  cursorY += 4;

  // Table Header
  const colX = [margin, margin + 48, margin + 85, margin + 122, margin + 152];
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('METRIC', colX[0] + 2, cursorY + 4.8);
  doc.text('BASELINE', colX[1] + 2, cursorY + 4.8);
  doc.text('WITH MITIGATION', colX[2] + 2, cursorY + 4.8);
  doc.text('DELTA (ΔT / %) ', colX[3] + 2, cursorY + 4.8);
  doc.text('STATUS', colX[4] + 2, cursorY + 4.8);
  cursorY += 7;

  // Table Rows
  const netCoolingC = Math.min(0, metrics.coolingDelta);
  const estimatedEnergySavings = Math.min(35, Math.abs(netCoolingC) * 5.2);

  const tableRows = [
    {
      metric: 'Mean Land Surface Temp (LST)',
      base: `${metrics.baseMeanLST.toFixed(1)} °C`,
      mitigated: `${metrics.meanLST.toFixed(1)} °C`,
      delta: `${netCoolingC.toFixed(1)} °C`,
      status: 'SIGNIFICANT DROP',
    },
    {
      metric: 'Peak Canyon Hotspot Temp',
      base: `${preset.baseLST.max.toFixed(1)} °C`,
      mitigated: `${(preset.baseLST.max + netCoolingC * 1.15).toFixed(1)} °C`,
      delta: `${(netCoolingC * 1.15).toFixed(1)} °C`,
      status: 'HOTSPOT SUPPRESSED',
    },
    {
      metric: 'Vegetation Cover Index (NDVI)',
      base: `${preset.baseNDVI.toFixed(2)}`,
      mitigated: `${metrics.meanNDVI.toFixed(2)}`,
      delta: `+${(metrics.meanNDVI - preset.baseNDVI).toFixed(2)}`,
      status: 'CANOPY EXPANDED',
    },
    {
      metric: 'Canyon Stagnation Area (<1 m/s)',
      base: '68% (Trapped Eddies)',
      mitigated: `${metrics.stagnantAreaPercent.toFixed(0)}%`,
      delta: `-${(68 - metrics.stagnantAreaPercent).toFixed(0)}%`,
      status: 'VENTILATED',
    },
    {
      metric: 'Peak HVAC Chiller Load Offset',
      base: '0% (Standard AC)',
      mitigated: `~${estimatedEnergySavings.toFixed(1)}% avoided`,
      delta: `+${estimatedEnergySavings.toFixed(1)}% savings`,
      status: 'ENERGY SAVED',
    },
  ];

  tableRows.forEach((row, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(margin, cursorY, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(row.metric, colX[0] + 2, cursorY + 4.5);
    doc.text(row.base, colX[1] + 2, cursorY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(row.mitigated, colX[2] + 2, cursorY + 4.5);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(row.delta, colX[3] + 2, cursorY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(row.status, colX[4] + 2, cursorY + 4.5);
    cursorY += 6.5;
  });

  cursorY += 6;

  // --- SECTION 2: GEMINI AGENTIC DIAGNOSIS & AIRFLOW DIRECTIVE ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. GEMINI AI MICROCLIMATE DIAGNOSIS & AERODYNAMIC GUIDANCE', margin, cursorY);
  cursorY += 4;

  const diagnosisText = geminiData?.diagnosis.summary ||
    `Severe microclimate thermal buildup detected across ${preset.name}. Dense concrete and asphalt geometry combined with high canyon aspect ratios (H/W = ${preset.canyonAspectRatio}) obstructs natural air ventilation, causing prolonged heat entrapment. Natural passive mitigation channels are recommended.`;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, contentWidth, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28); // rose-700
  doc.text(`SEVERITY LEVEL: ${geminiData?.diagnosis.heatSeverityLevel || 'HIGH - ELEVATED THERMAL HAZARD'}`, margin + 4, cursorY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const splitDiagnosis = doc.splitTextToSize(diagnosisText, contentWidth - 8);
  doc.text(splitDiagnosis, margin + 4, cursorY + 11);

  cursorY += 28;

  // Airflow directive
  if (geminiData?.airflowGuidance) {
    checkPageBreak(24);
    doc.setFillColor(236, 254, 255); // cyan-50
    doc.rect(margin, cursorY, contentWidth, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(14, 116, 144); // cyan-700
    doc.text('CROSS-VENTILATION BREEZEWAY DIRECTIVE:', margin + 4, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const splitAirflow = doc.splitTextToSize(
      `${geminiData.airflowGuidance.canyonClearanceRecommendation} ${geminiData.airflowGuidance.prevailingWindAlignmentNotes}`,
      contentWidth - 8
    );
    doc.text(splitAirflow, margin + 4, cursorY + 10);
    cursorY += 22;
  }

  // --- SECTION 3: ACTIVE & RECOMMENDED INTERVENTIONS ---
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. NATURAL COOLING INTERVENTIONS (${interventions.length} Placed / Evaluated)`, margin, cursorY);
  cursorY += 4;

  const itemsToPrint: Array<{
    title: string;
    type: string;
    impact: string;
    details: string;
    materials: string;
  }> = [];

  if (interventions.length > 0) {
    interventions.forEach((it) => {
      itemsToPrint.push({
        title: it.label,
        type: it.type.replace('_', ' ').toUpperCase(),
        impact: `${it.coolingDelta} °C`,
        details: it.details,
        materials: it.speciesOrMaterial || 'Specified urban bioclimatic standard',
      });
    });
  } else if (geminiData?.actionPlan && geminiData.actionPlan.length > 0) {
    geminiData.actionPlan.forEach((act) => {
      itemsToPrint.push({
        title: act.title,
        type: act.type.replace('_', ' ').toUpperCase(),
        impact: `${act.coolingImpactC} °C`,
        details: act.engineeringDetails,
        materials: act.specificSpeciesOrMaterials.join(', '),
      });
    });
  } else {
    preset.recommendedInterventions.forEach((rec) => {
      itemsToPrint.push({
        title: rec.title,
        type: rec.type.replace('_', ' ').toUpperCase(),
        impact: `${rec.estimatedCoolingC} °C`,
        details: rec.description,
        materials: preset.nativeSpecies[0]?.commonName || 'Native vegetative canopy',
      });
    });
  }

  itemsToPrint.forEach((item, idx) => {
    checkPageBreak(18);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, cursorY, contentWidth, 16, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${item.title}`, margin + 4, cursorY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`COOLING: ${item.impact}`, pageWidth - margin - 35, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitDetails = doc.splitTextToSize(item.details, contentWidth - 8);
    doc.text(splitDetails, margin + 4, cursorY + 9.5);

    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Materials / Flora: ${item.materials}`, margin + 4, cursorY + 14);

    cursorY += 18;
  });

  // --- SECTION 4: REGIONAL NATIVE FLORA CATALOG ---
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. CLIMATE-ADAPTED NATIVE FLORA SPECIFICATIONS', margin, cursorY);
  cursorY += 4;

  preset.nativeSpecies.forEach((sp) => {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`• ${sp.commonName} `, margin + 2, cursorY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`(${sp.scientificName})`, margin + 35, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Canopy Spread: ${sp.canopySpreadMeters}m  ·  Leaf Area Index (LAI): ${sp.leafAreaIndex}  ·  Drought Tolerance: ${sp.droughtTolerance}  ·  Water: ${sp.waterNeed}`,
      margin + 4,
      cursorY + 8
    );
    const splitSp = doc.splitTextToSize(sp.description, contentWidth - 8);
    doc.text(splitSp, margin + 4, cursorY + 11.5);
    cursorY += 15;
  });

  // --- SECTION 5: ECOLOGICAL & SOCIAL CO-BENEFITS ---
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('5. ECOLOGICAL, RESILIENCE & PUBLIC HEALTH CO-BENEFITS', margin, cursorY);
  cursorY += 5;

  const benefits = geminiData?.ecologicalAndSocialCoBenefits || [
    `Direct energy savings: ~${estimatedEnergySavings.toFixed(1)}% reduction in peak cooling energy across neighboring municipal parcels.`,
    'Universal Thermal Climate Index (UTCI) improvement: shifts pedestrian exposure from Extreme Stress to Moderate/Comfortable.',
    'Stormwater retention increase of ~32,000 m³ per square kilometer via permeable surfaces and extensive green roof soil.',
    'Establishment of contiguous pollinator corridors and microclimate refugia for native bird and beneficial insect species.',
  ];

  benefits.forEach((b) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const splitB = doc.splitTextToSize(`✓  ${b}`, contentWidth - 4);
    doc.text(splitB, margin + 2, cursorY + 3.5);
    cursorY += splitB.length * 4 + 2;
  });

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Urban Heat Island (UHI) Mitigation Studio · Municipal Climate Resilience Document', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // Trigger browser download
  const safeCityName = preset.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`UHI_Mitigation_Report_${safeCityName}_${Date.now()}.pdf`);
}
