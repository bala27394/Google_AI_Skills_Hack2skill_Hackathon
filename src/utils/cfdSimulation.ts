import { BuildingFootprint, PlacedIntervention } from '../types';

export interface GridCell {
  x: number; // 0..100
  y: number; // 0..100
  isBuilding: boolean;
  buildingHeight: number;
  baseLST: number;
  currentLST: number;
  ndvi: number;
  ndbi: number;
  u: number; // wind X
  v: number; // wind Y
  speed: number;
  isStagnant: boolean;
  interventionType?: string;
}

export interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  speed: number;
}

export class CFDMicroclimateEngine {
  public gridSize: number = 36;
  public grid: GridCell[][] = [];
  public particles: WindParticle[] = [];
  public maxParticles: number = 220;

  constructor() {
    this.initGrid();
  }

  private initGrid() {
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < this.gridSize; c++) {
        row.push({
          x: (c / (this.gridSize - 1)) * 100,
          y: (r / (this.gridSize - 1)) * 100,
          isBuilding: false,
          buildingHeight: 0,
          baseLST: 38,
          currentLST: 38,
          ndvi: 0.15,
          ndbi: 0.6,
          u: 2.0,
          v: 0.0,
          speed: 2.0,
          isStagnant: false,
        });
      }
      this.grid.push(row);
    }
  }

  public updateScenario(
    buildings: BuildingFootprint[],
    baseMeanLST: number,
    baseNDVI: number,
    baseNDBI: number,
    windSpeed: number,
    windDirectionDeg: number,
    interventions: PlacedIntervention[]
  ) {
    const rad = (windDirectionDeg * Math.PI) / 180;
    // Mathematical wind vector:
    // windDirectionDeg is meteorological azimuth: 0° is North (blowing South, +y), 90° is East (blowing West, -x)
    const baseU = -Math.sin(rad) * windSpeed;
    const baseV = Math.cos(rad) * windSpeed;

    // Reset grid
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.grid[r][c];
        cell.isBuilding = false;
        cell.buildingHeight = 0;
        cell.interventionType = undefined;

        // Spatial thermal gradient with micro-noise
        const distFromCenter = Math.hypot(cell.x - 50, cell.y - 50) / 70;
        const heatIslandCore = Math.max(0, 1 - distFromCenter * 0.8);
        const variation = Math.sin(cell.x * 0.1) * Math.cos(cell.y * 0.1) * 2.2;
        cell.baseLST = baseMeanLST + (heatIslandCore * 6.5) + variation;
        cell.ndvi = Math.max(0.02, Math.min(0.85, baseNDVI - (heatIslandCore * 0.08)));
        cell.ndbi = Math.max(0.1, Math.min(0.9, baseNDBI + (heatIslandCore * 0.12)));

        cell.u = baseU;
        cell.v = baseV;
        cell.speed = windSpeed;
        cell.isStagnant = false;
      }
    }

    // Overlay buildings
    for (const b of buildings) {
      const minC = Math.max(0, Math.floor((b.x / 100) * this.gridSize));
      const maxC = Math.min(this.gridSize - 1, Math.ceil(((b.x + b.width) / 100) * this.gridSize));
      const minR = Math.max(0, Math.floor((b.y / 100) * this.gridSize));
      const maxR = Math.min(this.gridSize - 1, Math.ceil(((b.y + b.height) / 100) * this.gridSize));

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = this.grid[r][c];
          cell.isBuilding = true;
          cell.buildingHeight = b.heightMeters;
          // Buildings absorb heat and block wind
          cell.baseLST += Math.min(7.5, b.stories * 0.25);
          cell.ndbi = Math.min(0.95, cell.ndbi + 0.25);
          cell.ndvi = Math.max(0.02, cell.ndvi - 0.08);
        }
      }
    }

    // Apply fluid obstacle deflection & Navier-Stokes relaxation proxy
    this.solveWindField(baseU, baseV, windSpeed);

    // Overlay Interventions and compute modified LST
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.grid[r][c];
        let deltaT = 0;
        let deltaNDVI = 0;

        // Check active interventions touching this cell
        for (const it of interventions) {
          const dx = cell.x - it.x;
          const dy = cell.y - it.y;
          const dist = Math.hypot(dx, dy);

          if (it.type === 'tree_canopy') {
            const radius = it.radius || 12;
            if (dist <= radius) {
              const falloff = 1 - (dist / radius);
              deltaT -= (3.8 * falloff);
              deltaNDVI += (0.42 * falloff);
              cell.interventionType = 'tree_canopy';
              // Trees increase aerodynamic drag slightly but purge heat
              cell.speed = Math.max(0.6, cell.speed * (1 - 0.2 * falloff));
            }
          } else if (it.type === 'cool_corridor') {
            const w = it.width || 24;
            const h = it.height || 18;
            if (Math.abs(dx) <= w / 2 && Math.abs(dy) <= h / 2) {
              deltaT -= 2.8;
              cell.interventionType = 'cool_corridor';
              // Corridors boost laminar airflow flushing hot stagnation
              cell.speed = Math.min(windSpeed * 1.4, cell.speed * 1.5 + 0.8);
              cell.isStagnant = false;
            }
          } else if (it.type === 'green_roof') {
            const w = it.width || 18;
            const h = it.height || 18;
            if (Math.abs(dx) <= w / 2 && Math.abs(dy) <= h / 2 && cell.isBuilding) {
              deltaT -= 4.2;
              deltaNDVI += 0.35;
              cell.interventionType = 'green_roof';
            }
          } else if (it.type === 'cool_surface') {
            const w = it.width || 20;
            const h = it.height || 20;
            if (Math.abs(dx) <= w / 2 && Math.abs(dy) <= h / 2) {
              deltaT -= 3.2;
              cell.interventionType = 'cool_surface';
            }
          }
        }

        // Convective wind cooling effect: higher local wind speed flushes more heat
        const windCooling = (cell.speed - 1.0) * 0.7;
        const stagnationHeating = cell.isStagnant ? 2.4 : 0;

        cell.currentLST = Math.max(22, cell.baseLST + deltaT - Math.max(0, windCooling) + stagnationHeating);
        cell.ndvi = Math.max(0.02, Math.min(0.95, cell.ndvi + deltaNDVI));
      }
    }
  }

  private solveWindField(baseU: number, baseV: number, ambientSpeed: number) {
    const N = this.gridSize;

    // Boundary obstacle damping and deflection passes
    for (let pass = 0; pass < 6; pass++) {
      for (let r = 1; r < N - 1; r++) {
        for (let c = 1; c < N - 1; c++) {
          const cell = this.grid[r][c];

          if (cell.isBuilding) {
            // Air cannot penetrate buildings directly; velocity is strongly suppressed
            cell.u = baseU * 0.12;
            cell.v = baseV * 0.12;
            cell.speed = Math.hypot(cell.u, cell.v);
            continue;
          }

          // Check surrounding obstacle boundaries
          const leftIsB = this.grid[r][c - 1].isBuilding;
          const rightIsB = this.grid[r][c + 1].isBuilding;
          const topIsB = this.grid[r - 1][c].isBuilding;
          const bottomIsB = this.grid[r + 1][c].isBuilding;

          // Average fluid relaxation from neighbors
          let avgU = (this.grid[r][c - 1].u + this.grid[r][c + 1].u + this.grid[r - 1][c].u + this.grid[r + 1][c].v) / 4;
          let avgV = (this.grid[r][c - 1].v + this.grid[r][c + 1].v + this.grid[r - 1][c].v + this.grid[r + 1][c].v) / 4;

          // Venturi acceleration in narrow street canyons (between two buildings)
          const isEastWestCanyon = (topIsB && bottomIsB);
          const isNorthSouthCanyon = (leftIsB && rightIsB);

          if (isEastWestCanyon && Math.abs(baseU) > 0.5) {
            avgU *= 1.35; // Venturi funnel
          } else if (isNorthSouthCanyon && Math.abs(baseV) > 0.5) {
            avgV *= 1.35;
          }

          // Deflect around frontal building edges
          if (leftIsB && baseU > 0) avgV += baseU * 0.5;
          if (rightIsB && baseU < 0) avgV += -baseU * 0.5;
          if (topIsB && baseV > 0) avgU += baseV * 0.5;
          if (bottomIsB && baseV < 0) avgU += -baseV * 0.5;

          cell.u = (cell.u * 0.4) + (avgU * 0.6);
          cell.v = (cell.v * 0.4) + (avgV * 0.6);
          cell.speed = Math.hypot(cell.u, cell.v);

          // Stagnation classification
          if (cell.speed < ambientSpeed * 0.35) {
            cell.isStagnant = true;
          }
        }
      }
    }
  }

  public getGridMetrics(): {
    meanLST: number;
    maxLST: number;
    baseMeanLST: number;
    coolingDelta: number;
    meanNDVI: number;
    meanSpeed: number;
    stagnantAreaPercent: number;
  } {
    let sumLST = 0;
    let sumBaseLST = 0;
    let maxLST = -999;
    let sumNDVI = 0;
    let sumSpeed = 0;
    let stagnantCount = 0;
    const total = this.gridSize * this.gridSize;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.grid[r][c];
        sumLST += cell.currentLST;
        sumBaseLST += cell.baseLST;
        if (cell.currentLST > maxLST) maxLST = cell.currentLST;
        sumNDVI += cell.ndvi;
        sumSpeed += cell.speed;
        if (cell.isStagnant) stagnantCount++;
      }
    }

    const meanLST = sumLST / total;
    const baseMeanLST = sumBaseLST / total;
    const coolingDelta = meanLST - baseMeanLST;

    return {
      meanLST,
      maxLST,
      baseMeanLST,
      coolingDelta,
      meanNDVI: sumNDVI / total,
      meanSpeed: sumSpeed / total,
      stagnantAreaPercent: (stagnantCount / total) * 100,
    };
  }

  // Particle Streamline System
  public initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.spawnParticle());
    }
  }

  private spawnParticle(): WindParticle {
    return {
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: 0,
      vy: 0,
      age: Math.random() * 60,
      maxAge: 70 + Math.random() * 70,
      speed: 2.0,
    };
  }

  public updateParticles(deltaTime: number = 1.0) {
    if (this.particles.length === 0) {
      this.initParticles();
    }

    const N = this.gridSize;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += deltaTime;

      if (p.age >= p.maxAge || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) {
        this.particles[i] = this.spawnParticle();
        continue;
      }

      // Sample velocity from grid with bilinear interpolation
      const gx = (p.x / 100) * (N - 1);
      const gy = (p.y / 100) * (N - 1);
      const c0 = Math.max(0, Math.min(N - 2, Math.floor(gx)));
      const r0 = Math.max(0, Math.min(N - 2, Math.floor(gy)));
      const fx = gx - c0;
      const fy = gy - r0;

      const c11 = this.grid[r0][c0];
      const c21 = this.grid[r0][c0 + 1];
      const c12 = this.grid[r0 + 1][c0];
      const c22 = this.grid[r0 + 1][c0 + 1];

      const u = (1 - fx) * (1 - fy) * c11.u +
                fx * (1 - fy) * c21.u +
                (1 - fx) * fy * c12.u +
                fx * fy * c22.u;

      const v = (1 - fx) * (1 - fy) * c11.v +
                fx * (1 - fy) * c21.v +
                (1 - fx) * fy * c12.v +
                fx * fy * c22.v;

      p.vx = u;
      p.vy = v;
      p.speed = Math.hypot(u, v);

      p.x += u * 0.42 * deltaTime;
      p.y += v * 0.42 * deltaTime;
    }
  }
}
