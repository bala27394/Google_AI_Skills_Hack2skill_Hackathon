# Urban Heat Island (UHI) Mitigation Planner

An agentic microclimate platform for city planners and architects that analyzes satellite imagery, building density, and historical weather data to identify microclimate heat hotspots. Simulates airflow and cross-ventilation to engineer natural cooling strategies—such as cool corridors, green roofs, and climate-adapted native tree canopies.

---

## Quick Start (Local Setup)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v20+
- npm v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Google Gemini API key:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
```
*(If no API key is set, the application automatically runs using the calibrated regional physics engine, ensuring full offline capability).*

### 4. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## Features
- **Geospatial Microclimate Layers**: Satellite Land Surface Temperature (LST), Normalized Difference Vegetation Index (NDVI), Normalized Difference Built-up Index (NDBI), and 3D building aspect ratios ($H/W$).
- **Multi-City & Custom Presets**: Pre-configured with Phoenix, Singapore, Athens, Tokyo, and a custom global coordinate search with live Open-Meteo weather.
- **2D Navier-Stokes CFD Simulation**: Real-time vector wind particle streamlines, building obstacle deflection, Venturi canyon acceleration, and stagnation zones.
- **Interactive Intervention Studio**: Paint cross-ventilation breezeways, native tree canopies, biosolar green roofs, and high-albedo cool pavements directly on the canvas.
- **Before vs. After Split Slider**: Visually compare baseline thermal hotspots with mitigated conditions.
- **D3.js 24-Hour Diurnal Cooling Curve**: Interactive chart tracking solar radiation phases, peak daytime shading, and nocturnal heat-dome clearance.
- **Gemini 3.8 Flash Agentic Planner**: Automated diagnostic report proposing prioritized actions and energy savings.
- **PDF Report Generator**: Downloadable multi-page publication-grade PDF impact report.
