// Level layouts for Neon Breaker. Each level is 6 rows of 10 cells:
//   0 empty, 1 one-hit brick, 2 two-hit brick, 3 three-hit brick,
//   M unbreakable metal, X explosive (breaks its neighbours too).
// Rows are written top to bottom; the first row is the highest value, so the
// player earns the big points by reaching the back.

const L1 = [
  '0000000000',
  '0111111110',
  '0111111110',
  '0111111110',
  '0000000000',
  '0000000000',
];

const L2 = [
  '0222222220',
  '0200000002',
  '0111111110',
  '011M111M10',
  '0000000000',
  '0000000000',
];

const L3 = [
  '0333333330',
  '0302222203',
  '0011111100',
  '010X111X10',
  '0011111100',
  '0000000000',
];

const L4 = [
  '03M33333M30',
  '0222222220',
  '02X11111X20',
  '0111111110',
  '010M111M010',
  '0000000000',
];

const L5 = [
  '0333333330',
  '03M2222M30',
  '022X11X220',
  '0111111110',
  '01X11111X10',
  '011M111M110',
];

export const LEVELS = [L1, L2, L3, L4, L5];

/** Names shown on the level-clear and level-start banners. */
export const LEVEL_NAMES = [
  'Warm-up Alley',
  'Twin Towers',
  'The Vault',
  'Crossfire',
  'Neon Core',
];

/**
 * Build the endless level after the hand-built ones: a seeded pattern that
 * grows denser and tougher with the level number. Deterministic per seed.
 */
export function generateLevel(random, level) {
  const rows = [];
  const hardness = Math.min(3, 1 + Math.floor((level - LEVELS.length) / 2));
  for (let r = 0; r < 6; r += 1) {
    let row = '';
    for (let c = 0; c < 10; c += 1) {
      const roll = random();
      if (roll < 0.16) row += '0';
      else if (roll < 0.16 + 0.05 + level * 0.004) row += 'M';
      else if (roll < 0.4) row += 'X';
      else row += String(1 + Math.floor(random() * hardness));
    }
    rows.push(row);
  }
  // Never wall the player in completely: keep the bottom row open.
  rows[5] = '0000000000';
  return rows;
}
