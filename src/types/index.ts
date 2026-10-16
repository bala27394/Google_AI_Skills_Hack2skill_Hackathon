export type LayerType = 'lst' | 'ndvi' | 'ndbi' | 'wind' | 'combined';

export type InterventionType = 'cool_corridor' | 'green_roof' | 'tree_canopy' | 'cool_surface';

export interface PlacedIntervention {
  id: string;
  type: InterventionType;
  x: number; // grid normalized 0..100
  y: number; // grid normalized 0..100
  radius?: number; // for circular tree canopies
  width?: number; // for rectangular corridors/roofs
  height?: number;
  label: string;
  details: string;
  coolingDelta: number; // e.g. -1.2 °C
  speciesOrMaterial?: string;
}

export interface BuildingFootprint {
  id: string;
  x: number; // 0..100
  y: number; // 0..100
  width: number;
  height: number;
  stories: number;
  heightMeters: number;
  roofType: 'flat' | 'gable';
  hasGreenRoof?: boolean;
  hasCoolRoof?: boolean;
}

export interface NativeSpecies {
  commonName: string;
  scientificName: string;
  canopySpreadMeters: number;
  leafAreaIndex: number; // LAI
  droughtTolerance: 'High' | 'Very High' | 'Moderate';
  coolingPotentialC: number;
  waterNeed: 'Low' | 'Xeriscape' | 'Moderate';
  description: string;
}

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  climateZone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  baseLST: {
    mean: number;
    max: number;
    min: number;
  };
  ambientTemp: number;
  relativeHumidity: number;
  baseNDVI: number;
  baseNDBI: number;
  defaultWind: {
    speed: number; // m/s
    direction: number; // degrees (0=N, 90=E, 180=S, 270=W)
  };
  canyonAspectRatio: number; // H/W
  buildingDensity: number; // %
  description: string;
  nativeSpecies: NativeSpecies[];
  buildings: BuildingFootprint[];
  recommendedInterventions: Array<{
    type: InterventionType;
    title: string;
    description: string;
    estimatedCoolingC: number;
  }>;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  type: 'cool_corridor' | 'green_roof' | 'tree_canopy' | 'cool_surface';
  locationLabel: string;
  coolingImpactC: number;
  implementationPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  specificSpeciesOrMaterials: string[];
  engineeringDetails: string;
}

export interface GeminiMitigationResponse {
  success: boolean;
  model?: string;
  diagnosis: {
    summary: string;
    heatSeverityLevel: string;
    stagnationFactor: string;
    vulnerabilityContext: string;
  };
  predictedCoolingDeltaC: number;
  coolingEnergyOffsetPercent: number;
  airflowGuidance: {
    canyonClearanceRecommendation: string;
    prevailingWindAlignmentNotes: string;
    stagnationZoneMitigation: string;
  };
  actionPlan: ActionPlanItem[];
  ecologicalAndSocialCoBenefits: string[];
}
