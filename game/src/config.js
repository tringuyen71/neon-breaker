// Neon Breaker — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, wall: 16, top: 84 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PADDLE = {
  width: 132,
  height: 18,
  y: 668,
  speed: 760,
  wideWidth: 196,
  wideSeconds: 14,
};

export const BALL = {
  radius: 9,
  speed: 460,
  speedPerLevel: 26,
  speedPerBrick: 1.6,
  maxSpeed: 780,
  serveAngle: 0.6,
};

export const BRICK = {
  cols: 10,
  rows: 6,
  width: 112,
  height: 30,
  gapX: 10,
  gapY: 12,
  top: 132,
  left: 14,
};

export const LIVES = 3;

/** Points for a brick of each hit-point value, before the combo multiplier. */
export const POINTS = { 1: 50, 2: 120, 3: 250, metal: 0, boom: 200 };

/** Combo multiplier caps at x5; it grows by one step every 4 bricks without a drop. */
export const COMBO = { perBricks: 4, max: 5 };

export const POWER = {
  fallSpeed: 210,
  width: 30,
  height: 30,
  /** Chance a broken brick drops a power-up (before the pity rule). */
  chance: 0.14,
  /** After this many broken bricks with no drop, the next brick drops one. */
  pity: 9,
  wideSeconds: 14,
  laserShots: 8,
  slowSeconds: 10,
  multiBalls: 2,
};

export const LEVEL = {
  /** Hand-built levels, then the generator takes over (endless, faster). */
  count: 5,
  clearBonus: 500,
  lifeBonusPerLevel: 250,
};

export const POOL = { particles: 420, popups: 24, bolts: 24 };

export const PALETTE = {
  backdrop: '#070a18',
  skyTop: '#0b1030',
  skyBottom: '#131a3d',
  wall: '#1d2547',
  wallGlow: '#2c3a6e',
  paddle: '#39d0ff',
  paddleWide: '#7ef0c1',
  ball: '#f5f7ff',
  ballTrail: '#39d0ff',
  brick1: '#ff5d8f',
  brick2: '#ffb020',
  brick3: '#8b5cf6',
  metal: '#8d99ae',
  boom: '#ff3b30',
  laser: '#39ff88',
  text: '#eef1f5',
  muted: '#9aa3bd',
  gold: '#ffd166',
  panel: 'rgba(10, 14, 34, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-breaker.best';
