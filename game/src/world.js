// Neon Breaker — the simulation. Pure rules, no drawing, no sound calls of its
// own: step() takes the input for this step and a Sound to play through, and
// returns an event bitmask the shell (main.js) reacts to. Everything random
// comes from the seeded generator, and the step is fixed, so the same seed and
// the same inputs always give the same game — that is what makes the
// screenshot scenes repeatable.

import { BALL, BRICK, COMBO, FIELD, LEVEL, LIVES, PADDLE, POINTS, POOL, POWER, STEP } from './config.js';
import { LEVELS, LEVEL_NAMES, generateLevel } from './levels.js';
import { createRandom, pickWeighted } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_LIFE_LOST = 1;
export const EVENT_LEVEL_CLEAR = 2;
export const EVENT_GAME_OVER = 4;
export const EVENT_POWER = 8;

export const KIND_BRICK = 'brick';
export const KIND_METAL = 'metal';
export const KIND_BOOM = 'boom';

const POWER_KINDS = [
  { value: 'wide', weight: 30 },
  { value: 'multi', weight: 26 },
  { value: 'laser', weight: 24 },
  { value: 'slow', weight: 20 },
];

function brickColor(hp) {
  if (hp >= 3) return 'brick3';
  if (hp === 2) return 'brick2';
  return 'brick1';
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.random = createRandom(seed);
    this.state = null;
    this.reset();
  }

  reset() {
    this.random = createRandom(this.seed);
    this.state = {
      mode: 'serve',
      screen: 'title',
      level: 1,
      score: 0,
      best: 0,
      lives: LIVES,
      combo: 1,
      comboCount: 0,
      time: 0,
      levelTime: 0,
      banner: '',
      bannerUntil: 0,
      clearTimer: 0,
      paddle: { x: (FIELD.width - PADDLE.width) / 2, width: PADDLE.width, wideUntil: 0 },
      balls: [],
      bricks: [],
      powers: [],
      bolts: [],
      particles: [],
      popups: [],
      shake: 0,
      laserShots: 0,
      slowUntil: 0,
      sinceDrop: 0,
      attract: false,
    };
    this.loadLevel(1);
    this.serveBall();
  }

  /** Start the attract demo behind the title screen: autopilot, endless lives. */
  startAttract() {
    this.reset();
    this.state.screen = 'title';
    this.state.attract = true;
    this.state.mode = 'play';
    this.launchBall(-0.4);
  }

  loadLevel(number) {
    const s = this.state;
    s.level = number;
    const layout = number <= LEVELS.length ? LEVELS[number - 1] : generateLevel(this.random, number);
    s.bricks = [];
    for (let r = 0; r < layout.length; r += 1) {
      for (let c = 0; c < layout[r].length; c += 1) {
        const ch = layout[r][c];
        if (ch === '0') continue;
        const kind = ch === 'M' ? KIND_METAL : ch === 'X' ? KIND_BOOM : KIND_BRICK;
        const hp = kind === KIND_METAL ? Infinity : kind === KIND_BOOM ? 1 : Number(ch);
        s.bricks.push({
          x: BRICK.left + c * (BRICK.width + BRICK.gapX),
          y: BRICK.top + r * (BRICK.height + BRICK.gapY),
          width: BRICK.width,
          height: BRICK.height,
          hp,
          maxHp: hp === Infinity ? 1 : hp,
          kind,
          active: true,
          flash: 0,
        });
      }
    }
    s.balls = [];
    s.powers = [];
    s.bolts = [];
    s.particles = [];
    s.popups = [];
    s.combo = 1;
    s.comboCount = 0;
    s.levelTime = 0;
    s.laserShots = 0;
    s.slowUntil = 0;
    s.mode = 'serve';
    const name = number <= LEVELS.length ? LEVEL_NAMES[number - 1] : `Endless ${number - LEVELS.length}`;
    s.banner = `LEVEL ${number} — ${name.toUpperCase()}`;
    s.bannerUntil = s.time + 2.2;
    this.serveBall();
  }

  serveBall() {
    const s = this.state;
    const paddle = s.paddle;
    s.balls = [{
      x: paddle.x + paddle.width / 2,
      y: PADDLE.y - BALL.radius - 1,
      vx: 0,
      vy: 0,
      stuck: true,
    }];
    s.mode = 'serve';
  }

  ballSpeed() {
    const s = this.state;
    let speed = BALL.speed + (s.level - 1) * BALL.speedPerLevel;
    if (s.time < s.slowUntil) speed *= 0.7;
    return Math.min(speed, BALL.maxSpeed);
  }

  launchBall(angle = null) {
    const s = this.state;
    const ball = s.balls[0];
    if (!ball) return;
    const dir = angle === null ? (this.random() < 0.5 ? -1 : 1) * (0.25 + this.random() * 0.45) : angle;
    const speed = this.ballSpeed();
    ball.vx = Math.sin(dir) * speed;
    ball.vy = -Math.cos(dir) * speed;
    ball.stuck = false;
    s.mode = 'play';
  }

  movePaddle(move, dt) {
    const s = this.state;
    const paddle = s.paddle;
    if (move.pointerActive && move.pointerX !== null) {
      paddle.x = move.pointerX - paddle.width / 2;
    } else if (move.axis !== 0) {
      paddle.x += move.axis * PADDLE.speed * dt;
    }
    paddle.x = Math.max(FIELD.wall, Math.min(FIELD.width - FIELD.wall - paddle.width, paddle.x));
    if (s.mode === 'serve') {
      const ball = s.balls[0];
      if (ball) ball.x = paddle.x + paddle.width / 2;
    }
    if (s.time < paddle.wideUntil) paddle.width = PADDLE.wideWidth;
    else paddle.width = PADDLE.width;
  }

  spawnParticles(x, y, color, count, speed = 260) {
    const s = this.state;
    for (let i = 0; i < count; i += 1) {
      if (s.particles.length >= POOL.particles) s.particles.shift();
      const angle = this.random() * Math.PI * 2;
      const v = speed * (0.3 + this.random() * 0.9);
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 60,
        life: 0.45 + this.random() * 0.35,
        age: 0,
        size: 2 + this.random() * 4,
        color,
      });
    }
  }

  spawnPopup(x, y, text, color = '#ffd166') {
    const s = this.state;
    if (s.popups.length >= POOL.popups) s.popups.shift();
    s.popups.push({ x, y, text, color, age: 0, life: 0.9 });
  }

  addScore(base, x, y) {
    const s = this.state;
    const gained = base * s.combo;
    s.score += gained;
    if (gained > 0) this.spawnPopup(x, y, `+${gained}`, s.combo > 1 ? '#7ef0c1' : '#ffd166');
    s.comboCount += 1;
    if (s.comboCount >= COMBO.perBricks && s.combo < COMBO.max) {
      s.combo += 1;
      s.comboCount = 0;
      this.spawnPopup(s.paddle.x + s.paddle.width / 2, PADDLE.y - 40, `COMBO x${s.combo}!`, '#39d0ff');
    }
    return gained;
  }

  maybeDrop(x, y) {
    const s = this.state;
    s.sinceDrop += 1;
    const due = s.sinceDrop >= POWER.pity || this.random() < POWER.chance;
    if (!due) return;
    s.sinceDrop = 0;
    const kind = pickWeighted(this.random, POWER_KINDS);
    s.powers.push({ x: x - POWER.width / 2, y, kind, vy: POWER.fallSpeed, active: true });
  }

  damageBrick(brick, sound, byBolt = false) {
    const s = this.state;
    if (!brick.active) return;
    if (brick.kind === KIND_METAL) {
      brick.flash = 0.12;
      if (sound) sound.metal();
      return;
    }
    brick.hp -= 1;
    brick.flash = 0.12;
    if (brick.hp > 0) {
      if (sound) sound.brick(s.combo);
      this.spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ffb020', 5, 160);
      return;
    }
    brick.active = false;
    const cx = brick.x + brick.width / 2;
    const cy = brick.y + brick.height / 2;
    if (brick.kind === KIND_BOOM) {
      if (sound) sound.boom();
      s.shake = Math.max(s.shake, 9);
      this.spawnParticles(cx, cy, '#ff3b30', 26, 380);
      this.spawnParticles(cx, cy, '#ffb020', 14, 300);
      this.addScore(POINTS.boom, cx, cy);
      this.explodeNeighbours(brick, sound);
    } else {
      if (sound) sound.brick(s.combo);
      const color = brick.maxHp >= 3 ? '#8b5cf6' : brick.maxHp === 2 ? '#ffb020' : '#ff5d8f';
      this.spawnParticles(cx, cy, color, 14, 280);
      this.addScore(POINTS[brick.maxHp] ?? POINTS[1], cx, cy);
      this.maybeDrop(cx, cy);
    }
    this.checkClear(sound);
  }

  explodeNeighbours(source, sound) {
    const s = this.state;
    const queue = [source];
    const seen = new Set([source]);
    while (queue.length > 0) {
      const brick = queue.shift();
      for (const other of s.bricks) {
        if (!other.active || seen.has(other)) continue;
        const dx = Math.abs((other.x + other.width / 2) - (brick.x + brick.width / 2));
        const dy = Math.abs((other.y + other.height / 2) - (brick.y + brick.height / 2));
        if (dx <= BRICK.width + BRICK.gapX + 2 && dy <= BRICK.height + BRICK.gapY + 2) {
          seen.add(other);
          if (other.kind === KIND_BOOM) queue.push(other);
          else if (other.kind !== KIND_METAL) {
            other.active = false;
            const cx = other.x + other.width / 2;
            const cy = other.y + other.height / 2;
            this.spawnParticles(cx, cy, '#ffb020', 8, 240);
            this.addScore(POINTS[other.maxHp] ?? POINTS[1], cx, cy);
          }
        }
      }
    }
  }

  checkClear(sound) {
    const s = this.state;
    if (s.mode === 'clear' || s.screen !== 'play') return;
    const left = s.bricks.some((b) => b.active && b.kind !== KIND_METAL);
    if (left) return;
    s.mode = 'clear';
    s.clearTimer = 2.4;
    const bonus = LEVEL.clearBonus + (s.level - 1) * LEVEL.lifeBonusPerLevel;
    s.score += bonus;
    s.banner = `LEVEL CLEAR!  +${bonus}`;
    s.bannerUntil = s.time + 2.4;
    if (sound) sound.levelClear();
  }

  applyPower(kind, sound) {
    const s = this.state;
    if (kind === 'wide') {
      s.paddle.wideUntil = s.time + POWER.wideSeconds;
    } else if (kind === 'multi') {
      const speed = this.ballSpeed();
      const source = s.balls.find((b) => !b.stuck) ?? s.balls[0];
      for (let i = 0; i < POWER.multiBalls && s.balls.length < 4; i += 1) {
        const angle = (this.random() - 0.5) * 1.2;
        s.balls.push({
          x: source ? source.x : FIELD.width / 2,
          y: source ? source.y : PADDLE.y - 40,
          vx: Math.sin(angle) * speed,
          vy: -Math.cos(angle) * speed,
          stuck: false,
        });
      }
    } else if (kind === 'laser') {
      s.laserShots = POWER.laserShots;
    } else if (kind === 'slow') {
      s.slowUntil = s.time + POWER.slowSeconds;
    }
    if (sound) sound.power();
    this.spawnPopup(s.paddle.x + s.paddle.width / 2, PADDLE.y - 40, kind.toUpperCase() + '!', '#7ef0c1');
  }

  fireLaser(sound) {
    const s = this.state;
    if (s.laserShots <= 0 || s.mode !== 'play') return;
    s.laserShots -= 1;
    const paddle = s.paddle;
    for (const dx of [-paddle.width / 2 + 8, paddle.width / 2 - 8]) {
      if (s.bolts.length >= POOL.bolts) break;
      s.bolts.push({ x: paddle.x + paddle.width / 2 + dx, y: PADDLE.y - 6, vy: -820, active: true });
    }
    if (sound) sound.laser();
  }

  stepBalls(dt, sound) {
    const s = this.state;
    let events = EVENT_NONE;
    const speed = this.ballSpeed();
    for (const ball of s.balls) {
      if (ball.stuck) continue;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      // Walls.
      if (ball.x < FIELD.wall + BALL.radius) {
        ball.x = FIELD.wall + BALL.radius;
        ball.vx = Math.abs(ball.vx);
        if (sound) sound.wall();
      } else if (ball.x > FIELD.width - FIELD.wall - BALL.radius) {
        ball.x = FIELD.width - FIELD.wall - BALL.radius;
        ball.vx = -Math.abs(ball.vx);
        if (sound) sound.wall();
      }
      if (ball.y < FIELD.top + BALL.radius) {
        ball.y = FIELD.top + BALL.radius;
        ball.vy = Math.abs(ball.vy);
        if (sound) sound.wall();
      }
      // Paddle: bounce angle follows where the ball lands on it.
      const p = s.paddle;
      if (ball.vy > 0 && ball.y + BALL.radius >= PADDLE.y && ball.y - BALL.radius <= PADDLE.y + PADDLE.height
        && ball.x >= p.x - BALL.radius && ball.x <= p.x + p.width + BALL.radius) {
        const rel = Math.max(-1, Math.min(1, ((ball.x - p.x) / p.width) * 2 - 1));
        const angle = rel * 1.05;
        const sp = Math.min(Math.max(Math.hypot(ball.vx, ball.vy), speed), BALL.maxSpeed);
        ball.vx = Math.sin(angle) * sp;
        ball.vy = -Math.cos(angle) * sp;
        ball.y = PADDLE.y - BALL.radius - 0.5;
        if (sound) sound.paddle();
        this.spawnParticles(ball.x, PADDLE.y, '#39d0ff', 4, 120);
      }
      // Bricks.
      for (const brick of s.bricks) {
        if (!brick.active) continue;
        if (ball.x + BALL.radius < brick.x || ball.x - BALL.radius > brick.x + brick.width
          || ball.y + BALL.radius < brick.y || ball.y - BALL.radius > brick.y + brick.height) continue;
        const overlapLeft = ball.x + BALL.radius - brick.x;
        const overlapRight = brick.x + brick.width - (ball.x - BALL.radius);
        const overlapTop = ball.y + BALL.radius - brick.y;
        const overlapBottom = brick.y + brick.height - (ball.y - BALL.radius);
        const minX = Math.min(overlapLeft, overlapRight);
        const minY = Math.min(overlapTop, overlapBottom);
        if (minX < minY) {
          ball.vx = overlapLeft < overlapRight ? -Math.abs(ball.vx) : Math.abs(ball.vx);
          ball.x += overlapLeft < overlapRight ? -minX : minX;
        } else {
          ball.vy = overlapTop < overlapBottom ? -Math.abs(ball.vy) : Math.abs(ball.vy);
          ball.y += overlapTop < overlapBottom ? -minY : minY;
        }
        // Slight speed-up per brick so late levels feel urgent.
        const sp = Math.hypot(ball.vx, ball.vy);
        const target = Math.min(sp + BALL.speedPerBrick, BALL.maxSpeed);
        if (sp > 0) {
          ball.vx = (ball.vx / sp) * target;
          ball.vy = (ball.vy / sp) * target;
        }
        this.damageBrick(brick, sound);
        break;
      }
    }
    // Lost balls: the last one costs a life.
    const alive = s.balls.filter((b) => b.y - BALL.radius <= FIELD.height + 40);
    if (alive.length < s.balls.length) {
      s.balls = alive;
      if (s.balls.length === 0) {
        if (s.attract) {
          this.serveBall();
          this.launchBall();
        } else {
          events |= this.loseLife(sound);
        }
      }
    }
    return events;
  }

  loseLife(sound) {
    const s = this.state;
    s.lives -= 1;
    s.combo = 1;
    s.comboCount = 0;
    s.shake = Math.max(s.shake, 12);
    s.laserShots = 0;
    s.powers = [];
    s.bolts = [];
    if (sound) sound.loseLife();
    if (s.lives <= 0) {
      s.mode = 'over';
      s.screen = 'over';
      if (sound) sound.gameOver();
      return EVENT_GAME_OVER;
    }
    this.serveBall();
    return EVENT_LIFE_LOST;
  }

  stepPowers(dt) {
    const s = this.state;
    for (const power of s.powers) {
      if (!power.active) continue;
      power.y += power.vy * dt;
      const p = s.paddle;
      if (power.y + POWER.height >= PADDLE.y && power.y <= PADDLE.y + PADDLE.height
        && power.x + POWER.width >= p.x && power.x <= p.x + p.width) {
        power.active = false;
        this.applyPower(power.kind, this.soundRef);
      } else if (power.y > FIELD.height) {
        power.active = false;
      }
    }
    s.powers = s.powers.filter((p) => p.active);
  }

  stepBolts(dt, sound) {
    const s = this.state;
    for (const bolt of s.bolts) {
      if (!bolt.active) continue;
      bolt.y += bolt.vy * dt;
      if (bolt.y < FIELD.top) {
        bolt.active = false;
        continue;
      }
      for (const brick of s.bricks) {
        if (!brick.active) continue;
        if (bolt.x >= brick.x && bolt.x <= brick.x + brick.width && bolt.y >= brick.y && bolt.y <= brick.y + brick.height) {
          bolt.active = false;
          this.damageBrick(brick, sound, true);
          break;
        }
      }
    }
    s.bolts = s.bolts.filter((b) => b.active);
  }

  stepParticles(dt) {
    const s = this.state;
    for (const p of s.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
    }
    s.particles = s.particles.filter((p) => p.age < p.life);
    for (const p of s.popups) p.age += dt;
    s.popups = s.popups.filter((p) => p.age < p.life);
    for (const b of s.bricks) if (b.flash > 0) b.flash -= dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - 34 * dt);
  }

  /**
   * Advance the simulation one fixed step. `move` is {axis, pointerX,
   * pointerActive}, `action` is true on serve/fire this step. Returns events.
   */
  step(dt, move, action, sound) {
    const s = this.state;
    this.soundRef = sound;
    s.time += dt;
    s.levelTime += dt;
    if (s.screen === 'play' || s.attract) {
      this.movePaddle(move, dt);
      if (s.mode === 'serve' && action) {
        this.launchBall();
        if (sound) sound.serve();
      } else if (s.mode === 'play' && action) {
        this.fireLaser(sound);
      }
      if (s.mode === 'play') {
        let events = this.stepBalls(dt, sound);
        this.stepBolts(dt, sound);
        this.stepPowers(dt);
        if (s.mode === 'clear') {
          s.clearTimer -= dt;
          if (s.clearTimer <= 0) {
            this.loadLevel(s.level + 1);
            events |= EVENT_LEVEL_CLEAR;
          }
        }
        this.stepParticles(dt);
        return events;
      }
      if (s.mode === 'clear') {
        s.clearTimer -= dt;
        if (s.clearTimer <= 0) {
          this.loadLevel(s.level + 1);
          this.stepParticles(dt);
          return EVENT_LEVEL_CLEAR;
        }
      }
    }
    this.stepParticles(dt);
    return EVENT_NONE;
  }
}
