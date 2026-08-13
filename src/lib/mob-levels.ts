/** Level definitions for Mob Control. World space is 900×600 logical units. */

export interface MobHole {
  x: number;
  y: number;
  r: number;
}

export interface MobEnemy {
  x: number;
  y: number;
  count: number;
  /** [light, dark] hex pair for this enemy mob. */
  color: [string, string];
}

export interface MobPickup {
  x: number;
  y: number;
  value: number;
}

export interface MobLevel {
  id: number;
  name: string;
  player: number;
  holes: MobHole[];
  enemies: MobEnemy[];
  pickups: MobPickup[];
}

export const PLAYER_COLOR: [string, string] = ["#fb923c", "#ea580c"];

const TEAL: [string, string] = ["#2dd4bf", "#0d9488"];
const VIOLET: [string, string] = ["#a78bfa", "#7c3aed"];
const ROSE: [string, string] = ["#f472b6", "#db2777"];
const SKY: [string, string] = ["#38bdf8", "#0284c7"];

export const MOB_LEVELS: MobLevel[] = [
  {
    id: 1,
    name: "First March",
    player: 10,
    holes: [],
    enemies: [{ x: 680, y: 300, count: 5, color: TEAL }],
    pickups: [
      { x: 180, y: 180, value: 3 },
      { x: 420, y: 120, value: 3 },
      { x: 780, y: 500, value: 3 },
    ],
  },
  {
    id: 2,
    name: "Second Step",
    player: 10,
    holes: [{ x: 450, y: 140, r: 46 }],
    enemies: [{ x: 700, y: 440, count: 8, color: ROSE }],
    pickups: [
      { x: 200, y: 440, value: 3 },
      { x: 620, y: 160, value: 3 },
    ],
  },
  {
    id: 3,
    name: "Divide & Conquer",
    player: 12,
    holes: [
      { x: 300, y: 130, r: 46 },
      { x: 620, y: 470, r: 46 },
    ],
    enemies: [
      { x: 700, y: 180, count: 6, color: TEAL },
      { x: 640, y: 400, count: 9, color: VIOLET },
    ],
    pickups: [{ x: 450, y: 300, value: 3 }],
  },
  {
    id: 4,
    name: "Holes Ahead",
    player: 12,
    holes: [
      { x: 240, y: 300, r: 50 },
      { x: 660, y: 300, r: 50 },
    ],
    enemies: [
      { x: 460, y: 110, count: 10, color: ROSE },
      { x: 470, y: 490, count: 12, color: SKY },
    ],
    pickups: [
      { x: 110, y: 150, value: 4 },
      { x: 790, y: 460, value: 4 },
    ],
  },
  {
    id: 5,
    name: "Ambush",
    player: 14,
    holes: [
      { x: 150, y: 200, r: 48 },
      { x: 750, y: 200, r: 48 },
      { x: 450, y: 540, r: 52 },
    ],
    enemies: [
      { x: 300, y: 470, count: 8, color: TEAL },
      { x: 600, y: 140, count: 10, color: VIOLET },
      { x: 520, y: 340, count: 12, color: ROSE },
    ],
    pickups: [{ x: 300, y: 110, value: 4 }],
  },
  {
    id: 6,
    name: "The Gauntlet",
    player: 14,
    holes: [
      { x: 450, y: 100, r: 48 },
      { x: 180, y: 460, r: 48 },
      { x: 720, y: 460, r: 48 },
    ],
    enemies: [
      { x: 300, y: 220, count: 12, color: SKY },
      { x: 600, y: 220, count: 14, color: TEAL },
      { x: 450, y: 420, count: 10, color: ROSE },
    ],
    pickups: [
      { x: 110, y: 300, value: 4 },
      { x: 790, y: 300, value: 4 },
    ],
  },
  {
    id: 7,
    name: "Ring of Holes",
    player: 16,
    holes: [
      { x: 450, y: 300, r: 56 },
      { x: 200, y: 170, r: 44 },
      { x: 700, y: 170, r: 44 },
      { x: 300, y: 460, r: 44 },
      { x: 600, y: 460, r: 44 },
    ],
    enemies: [
      { x: 130, y: 340, count: 14, color: TEAL },
      { x: 770, y: 340, count: 14, color: VIOLET },
      { x: 450, y: 570, count: 16, color: ROSE },
    ],
    pickups: [{ x: 450, y: 90, value: 4 }],
  },
  {
    id: 8,
    name: "Four Corners",
    player: 16,
    holes: [
      { x: 200, y: 140, r: 46 },
      { x: 700, y: 140, r: 46 },
      { x: 200, y: 460, r: 46 },
      { x: 700, y: 460, r: 46 },
    ],
    enemies: [
      { x: 450, y: 120, count: 10, color: SKY },
      { x: 450, y: 480, count: 12, color: ROSE },
      { x: 250, y: 300, count: 14, color: TEAL },
      { x: 650, y: 300, count: 16, color: VIOLET },
    ],
    pickups: [{ x: 450, y: 300, value: 4 }],
  },
  {
    id: 9,
    name: "Swarm",
    player: 18,
    holes: [
      { x: 450, y: 300, r: 54 },
      { x: 250, y: 150, r: 44 },
      { x: 650, y: 150, r: 44 },
      { x: 250, y: 450, r: 44 },
      { x: 650, y: 450, r: 44 },
    ],
    enemies: [
      { x: 120, y: 300, count: 14, color: TEAL },
      { x: 780, y: 300, count: 16, color: SKY },
      { x: 450, y: 90, count: 14, color: ROSE },
      { x: 450, y: 520, count: 18, color: VIOLET },
    ],
    pickups: [{ x: 450, y: 150, value: 5 }],
  },
  {
    id: 10,
    name: "Final Stand",
    player: 18,
    holes: [
      { x: 450, y: 300, r: 54 },
      { x: 150, y: 150, r: 44 },
      { x: 750, y: 150, r: 44 },
      { x: 150, y: 450, r: 44 },
      { x: 750, y: 450, r: 44 },
      { x: 450, y: 90, r: 44 },
    ],
    enemies: [
      { x: 240, y: 300, count: 18, color: TEAL },
      { x: 660, y: 300, count: 20, color: ROSE },
      { x: 450, y: 560, count: 14, color: SKY },
      { x: 240, y: 40, count: 16, color: VIOLET },
    ],
    pickups: [{ x: 450, y: 180, value: 5 }],
  },
];
