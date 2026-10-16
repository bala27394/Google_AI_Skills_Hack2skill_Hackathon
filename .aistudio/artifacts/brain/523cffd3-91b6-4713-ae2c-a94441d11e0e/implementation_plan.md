# Urban Heat Island (UHI) Mitigation Planner

An agentic AI microclimate platform for city planners, landscape architects, and municipal engineers to diagnose urban heat island (UHI) hotspots and engineer nature-based, passive cooling interventions—including cross-ventilation breezeways, high-albedo retrofits, green roofs, and microclimate-optimized native tree canopies.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural direction and user experience were aligned during Phase 1 clarification:

- **Confirmed Decision 1 (Geographic Presets & Coordinates)**: Multi-city showcase featuring diverse climatic zones—**Phoenix** (Arid / Desert extreme), **Singapore** (Tropical dense equatorial), **Athens** (Mediterranean heatwave), and **Tokyo** (Dense high-rise temperate metropolis)—along with custom coordinate bounding box entry connected to Open-Meteo live atmospheric winds.
- **Confirmed Decision 2 (Simulation & Viewport)**: High-performance interactive 2.5D canvas featuring dynamic CFD wind particle streamlines, interactive thermal Land Surface Temperature (LST) heat maps, building block footprints with height extrusions, and hover crosshairs for point-level microclimate telemetry.
- **Confirmed Decision 3 (Mitigation Strategy Suite)**: Comprehensive multi-intervention toolkit supporting cool ventilation corridors, green roofs, native shade tree placement with canopy evapotranspiration physics, and high-albedo surface coatings with solar reflectance index (SRI) calculations.

---

### 1. Overview & Core Concept

- **What It Does**: The Urban Heat Island (UHI) Mitigation Planner aggregates multi-source geospatial indices (Land Surface Temperature [LST], Normalized Difference Vegetation Index [NDVI], Normalized Difference Built-up Index [NDBI], building footprint density, and hyper-local hourly wind vectors) to pinpoint microclimate thermal hotspots. It simulates air velocity and thermal dispersion across urban street canyons, then deploys a Google Gemini-powered agentic planner to evaluate and propose nature-based cooling interventions, computing simulated $\Delta T$ temperature reductions and energy-saving impacts.
- **Target Audience / Persona**: Municipal urban planners, climate resilience officers, landscape architects, and civil engineering consultants looking to replace energy-intensive mechanical air conditioning with passive urban cooling.
- **Key Value Proposition**: Transforms complex remote-sensing datasets (Yale YCEO UHI, Landsat-8/MODIS LST, OSM/Google Open Buildings, ERA5/Open-Meteo) into actionable, simulated cooling interventions that prove how cross-ventilation corridors, urban canopy geometry, and green infrastructure lower ambient temperatures by up to $3.5^\circ\text{C}$ to $6.0^\circ\text{C}$.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Explore & Diagnose**: The user selects an urban sector (e.g., Downtown Phoenix, Singapore Marina Bay, Central Athens, or Shinjuku Tokyo) or enters custom latitude/longitude coordinates. The interactive console loads satellite thermal imagery, NDVI vegetation coverage, built-up density, and atmospheric wind fields.
2. **Interactive Microclimate Simulation**: The central viewport renders building footprints, thermal hotspots (color-calibrated from $24^\circ\text{C}$ to $52^\circ\text{C}$), and an animated particle wind tunnel showing how building clusters cause wind stagnation and heat buildup in narrow urban street canyons.
3. **Point & Polygon Thermal Telemetry**: Clicking or hovering anywhere on the grid provides instant telemetry: local LST, building height/aspect ratio ($H/W$), surface albedo, and wind velocity reduction factor.
4. **Agentic Mitigation Analysis**: The user triggers the **Gemini Natural Cooling Advisor**. Gemini evaluates the microclimate metrics, aerodynamic stagnation zones, and local climate vulnerabilities, returning structured intervention zones (e.g., North-South wind canyon clearance, green roof retrofits, and species-specific native shade trees like *Palo Verde* for Phoenix or *Rain Tree* for Singapore).
5. **Interactive Intervention Studio & Live Delta ($\Delta T$) Comparison**: Users can toggle proposed interventions or paint custom interventions directly onto the urban canvas (placing green roofs, opening breezeways, planting tree clusters). The simulation recalculates surface temperature, wind velocity, and ambient air cooling in real time with side-by-side Before vs. After metrics.
6. **Executive Export & PDF/Report Summary**: Planners can export a comprehensive microclimate impact assessment detailing cooling deltas, peak cooling energy offset, stormwater retention benefits, and recommended native species catalogs.

#### Visual Identity & Theme (Science & Telemetry Precision)
- **Palette & Atmosphere**: Adheres to the **60-30-10 Rule** from the Science & Biotech Design Constitution:
  - **60% Clinical Canvas**: Deep slate obsidian workspace (`#0A0D14` / `#0F172A`) providing high contrast for thermal heatmaps and luminous particle flows.
  - **30% Structural Panels**: Hairline-divided slate consoles (`#131B2E` / `#1E293B`) with 1px border lines (`rgba(255,255,255,0.08)`), coordinate axes, and structured grid rulers.
  - **10% Calibrated Telemetry Accents**: Emerald cooling accent (`#10B981`) for nature interventions, Thermal Amber-to-Crimson gradient (`#F59E0B` to `#EF4444`) for heat islands, and Cyan streamline accents (`#06B6D4`) for ventilation vectors.
- **Typography & Precision Notation**:
  - Display face: `Plus Jakarta Sans` for clean, modern title hierarchy.
  - Telemetry & Measurements: `font-mono tabular-nums` for coordinates, temperatures ($^{\circ}\text{C}$), wind speeds ($\text{m/s}$), vegetation fraction ($\text{NDVI}$), and cooling deltas ($\Delta T$).
- **Anti-Slop Discipline**:
  - No decorative pulsing dots or unlinked status pills.
  - Strict Top Bar Contract: 3 zones (Brand wordmark, single-line navigation links, and 1 primary action button: `Run AI Mitigation Planner`).
  - Unboxed metadata with typographic separators (`·` or `/`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Vector CFD & Navier-Stokes 2D Stagnation Proxy**
  - *Chosen Approach*: A fast, lightweight 2D grid wind-relaxation solver running at 60 FPS on HTML5 Canvas using discrete boundary conditions for building footprints.
  - *Why*: Allows instantaneous user feedback when drawing green roofs or altering building corridors without cloud server bottlenecks or WebAssembly startup latency.
  - *Alternatives Considered*: Heavy server-side OpenFOAM simulations (too slow for an interactive hackathon prototype) or static pre-rendered heatmaps (lacks interactive what-if scenarios).
- **Decision 2: Server-Side Gemini API Proxy with Structured Reasoning**
  - *Chosen Approach*: Node/Express server route (`/api/gemini/mitigate`) utilizing `@google/genai` with `gemini-3.8-flash` and strict JSON schemas to output targeted urban design interventions.
  - *Why*: Keeps API keys secure on the backend, guarantees valid structured intervention data (coordinates, cooling $\Delta T$, vegetation indices, tree species recommendations, and rationale), and streams explanatory engineering commentary.
- **Decision 3: Multi-Layer Geospatial Data Model (LST, NDVI, NDBI, Building LoD)**
  - *Chosen Approach*: Pre-calibrated high-resolution spatial matrices representative of real Landsat-8/MODIS thermal runs and Yale YCEO UHI benchmarks for Phoenix, Singapore, Athens, and Tokyo, paired with live Open-Meteo wind vectors.
  - *Why*: Delivers scientifically authentic baseline data without requiring costly Google Earth Engine private authentication tokens while enabling live wind updates.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Top Navigation Bar (3-Zone Contract)                  │
│  [UHI Mitigation Studio] ─── [Phoenix | Singapore | Athens | Tokyo] ─── [Run AI Planner]
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌─────────────────────────┬────────────┴─────────────────┬────────────────────┐
│ Left Control Console    │ Central Interactive Viewport │ Right Analysis HUD │
│ ─────────────────────── │ ──────────────────────────── │ ────────────────── │
│ • Region & Coordinates  │ • 2.5D Urban Canvas View     │ • Microclimate KPI │
│ • Wind Vector Sliders   │ • Thermal LST Heatmap Layer  │   (Mean LST, ΔT)   │
│   (Direction, Velocity) │ • Building Geometry & LoD    │ • Airflow Profiles │
│ • Layer Visibilities    │ • Vector CFD Streamlines     │ • Gemini Agentic   │
│   (Heat, NDVI, Wind)    │ • Interactive Crosshair HUD  │   Recommendations  │
│ • Intervention Painter  │ • Before / After Split Slider│ • Native Species   │
│   (Green Roof, Tree,    │                              │   Flora Catalog    │
│    Cool Corridor)       │                              │ • Export Plan PDF  │
└─────────────────────────┴──────────────────────────────┴────────────────────┘
                                       │
                        Express Backend Proxy (`/api/*`)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     Google Gemini 3.8 Flash                        Open-Meteo Climate API
   (Natural Cooling Strategy Engine)             (Live Hourly Wind & Temp)
```

#### Key Components & State Flow
- `App.tsx`: Main application shell with workspace state, active city preset, active simulation layers, and intervention state.
- `UrbanCanvas.tsx`: High-resolution HTML5 canvas rendering building footprints, interpolated thermal LST heatmaps, and real-time CFD wind streamlines with obstacle deflection.
- `TelemetrySidebar.tsx`: Real-time sensor metrics (`LST`, `NDVI`, `NDBI`, `Surface Albedo`, `Wind Velocity`) with tabular typography.
- `InterventionStudio.tsx`: Interactive tool palette allowing planners to place green corridors, plant climate-specific native tree species, and apply cool roof coatings.
- `GeminiMitigationPanel.tsx`: Agentic AI report card showing synthesized microclimate diagnosis, prioritized cooling zones, and estimated ambient $\Delta T$ impact.
- `server.ts`: Express server handling `/api/gemini/mitigate` and proxying environmental calculations.

---

### 5. Verification Plan

- Run `compile_applet` to verify clean TypeScript compilation and bundle creation.
- Test interactive CFD streamline simulation across all 4 city presets and custom coordinates.
- Verify Gemini server-side endpoint with structured output schema for realistic microclimate interventions and species suggestions.
- Ensure zero-pill typography and Science/Biotech design compliance across all viewports.
