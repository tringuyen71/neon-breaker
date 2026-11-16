// Neon Breaker — the renderer. Canvas 2D, one fixed 1280x720 logical field
// scaled to the window. Everything is drawn with shapes and gradients, so the
// game needs no image assets. Screens: title (with the attract demo behind
// it), play, pause, level-clear banner and game over.

import { BALL, BRICK, FIELD, PADDLE, PALETTE, POWER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

const POWER_LABEL = { wide: 'W', multi: 'M', laser: 'L', slow: 'S' };
const POWER_COLOR = { wide: '#7ef0c1', multi: '#ff9de2', laser: '#39ff88', slow: '#39d0ff' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    let seed = 1234567;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 110; i += 1) {
      this.stars.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: 0.6 + next() * 1.6, tw: next() * Math.PI * 2 });
    }
  }

  resize() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    const w = Math.floor(FIELD.width * scale);
    const h = Math.floor(FIELD.height * scale);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(FIELD.width * dpr);
    this.canvas.height = Math.floor(FIELD.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state, screen, time) {
    const ctx = this.ctx;
    ctx.save();
    if (state.shake > 0.2) {
      // Deterministic jitter from the clock, so a screenshot scene replays
      // pixel-identical: the shake is visual only, never part of the rules.
      const m = state.shake;
      ctx.translate(Math.sin(time * 61.7) * m * 0.5, Math.cos(time * 47.3) * m * 0.5);
    }
    this.drawBackground(time);
    this.drawWalls();
    this.drawBricks(state);
    this.drawPowers(state);
    this.drawBolts(state);
    this.drawBalls(state, time);
    this.drawPaddle(state);
    this.drawParticles(state);
    this.drawPopups(state);
    ctx.restore();
    this.drawHud(state, screen);
    if (screen === SCREEN_TITLE) this.drawTitle(state, time);
    else if (screen === SCREEN_PAUSE) this.drawPause();
    else if (screen === SCREEN_OVER) this.drawGameOver(state);
    else if (state.banner && time < state.bannerUntil) this.drawBanner(state);
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(time * 0.7 + star.tw));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint neon grid, fading toward the top.
    ctx.strokeStyle = 'rgba(57, 208, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
    }
    for (let y = 0; y <= FIELD.height; y += 64) {
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
    }
    ctx.stroke();
  }

  drawWalls() {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, FIELD.top, FIELD.wall, FIELD.height - FIELD.top);
    ctx.fillRect(FIELD.width - FIELD.wall, FIELD.top, FIELD.wall, FIELD.height - FIELD.top);
    ctx.fillRect(0, FIELD.top - 6, FIELD.width, 6);
    ctx.fillStyle = PALETTE.wallGlow;
    ctx.fillRect(FIELD.wall, FIELD.top, 2, FIELD.height - FIELD.top);
    ctx.fillRect(FIELD.width - FIELD.wall - 2, FIELD.top, 2, FIELD.height - FIELD.top);
  }

  brickFill(brick) {
    if (brick.kind === 'metal') return PALETTE.metal;
    if (brick.kind === 'boom') return PALETTE.boom;
    if (brick.maxHp >= 3) return PALETTE.brick3;
    if (brick.maxHp === 2) return PALETTE.brick2;
    return PALETTE.brick1;
  }

  drawBricks(state) {
    const ctx = this.ctx;
    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const x = brick.x;
      const y = brick.y;
      ctx.save();
      ctx.shadowColor = this.brickFill(brick);
      ctx.shadowBlur = brick.flash > 0 ? 18 : 10;
      ctx.fillStyle = this.brickFill(brick);
      roundRect(ctx, x, y, brick.width, brick.height, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      roundRect(ctx, x + 3, y + 3, brick.width - 6, 8, 4);
      ctx.fill();
      if (brick.kind === 'metal') {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + brick.height - 8);
        ctx.lineTo(x + brick.width - 8, y + 8);
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + brick.width - 8, y + brick.height - 8);
        ctx.stroke();
      } else if (brick.kind === 'boom') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✸', x + brick.width / 2, y + brick.height / 2 + 1);
      } else if (brick.hp < brick.maxHp) {
        // Cracks show the remaining hits.
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + brick.width * 0.3, y + 4);
        ctx.lineTo(x + brick.width * 0.45, y + brick.height * 0.55);
        ctx.lineTo(x + brick.width * 0.35, y + brick.height - 4);
        ctx.moveTo(x + brick.width * 0.7, y + 4);
        ctx.lineTo(x + brick.width * 0.6, y + brick.height * 0.5);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(brick.hp), x + brick.width - 14, y + brick.height / 2);
      }
      ctx.restore();
    }
  }

  drawPowers(state) {
    const ctx = this.ctx;
    for (const power of state.powers) {
      if (!power.active) continue;
      const color = POWER_COLOR[power.kind];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#0b1030';
      roundRect(ctx, power.x, power.y, POWER.width, POWER.height, 8);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundRect(ctx, power.x, power.y, POWER.width, POWER.height, 8);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWER_LABEL[power.kind], power.x + POWER.width / 2, power.y + POWER.height / 2 + 1);
      ctx.restore();
    }
  }

  drawBolts(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = PALETTE.laser;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#baffce';
    for (const bolt of state.bolts) {
      roundRect(ctx, bolt.x - 3, bolt.y - 14, 6, 18, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBalls(state, time) {
    const ctx = this.ctx;
    for (const ball of state.balls) {
      if (ball.stuck) continue;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = PALETTE.ballTrail;
      ctx.beginPath();
      ctx.arc(ball.x - ball.vx * 0.03, ball.y - ball.vy * 0.03, BALL.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.ball;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    void time;
  }

  drawPaddle(state) {
    const ctx = this.ctx;
    const p = state.paddle;
    const wide = state.time < p.wideUntil;
    ctx.save();
    ctx.shadowColor = wide ? PALETTE.paddleWide : PALETTE.paddle;
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
    grad.addColorStop(0, wide ? '#7ef0c1' : '#2aa8e0');
    grad.addColorStop(0.5, wide ? '#c8ffe9' : '#7ee2ff');
    grad.addColorStop(1, wide ? '#7ef0c1' : '#2aa8e0');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x, PADDLE.y, p.width, PADDLE.height, 9);
    ctx.fill();
    ctx.restore();
    // Laser barrels while armed.
    if (state.laserShots > 0) {
      ctx.fillStyle = '#baffce';
      ctx.fillRect(p.x + 4, PADDLE.y - 8, 6, 10);
      ctx.fillRect(p.x + p.width - 10, PADDLE.y - 8, 6, 10);
    }
    // Stuck ball rides on the paddle.
    for (const ball of state.balls) {
      if (!ball.stuck) continue;
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = PALETTE.ball;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(state) {
    const ctx = this.ctx;
    ctx.save();
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  drawPopups(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of state.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - p.age * 46);
    }
    ctx.restore();
  }

  drawHud(state, screen) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.top - 6);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 24, 38);
    ctx.textAlign = 'center';
    ctx.fillStyle = state.combo > 1 ? '#7ef0c1' : PALETTE.muted;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(state.combo > 1 ? `COMBO x${state.combo}` : `LEVEL ${state.level}`, FIELD.width / 2, 38);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(state.best, state.score).toLocaleString('en-US')}`, FIELD.width - 24, 38);
    // Lives as pips, bottom-left; laser shots bottom-right.
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.lives ? '#ff5d8f' : 'rgba(255,93,143,0.22)';
      ctx.beginPath();
      ctx.arc(30 + i * 26, FIELD.height - 18, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.laserShots > 0) {
      ctx.fillStyle = '#39ff88';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`LASER ${state.laserShots}  [SPACE]`, FIELD.width - 24, FIELD.height - 18);
    }
    if (screen === SCREEN_PLAY && state.mode === 'serve') {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Move with mouse or ← →  •  SPACE / click to serve', FIELD.width / 2, FIELD.height - 52);
    }
    ctx.restore();
  }

  drawBanner(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, FIELD.width / 2 - 320, 300, 640, 72, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(57, 208, 255, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, FIELD.width / 2 - 320, 300, 640, 72, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.banner, FIELD.width / 2, 336);
    ctx.restore();
  }

  drawTitle(state, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const bob = Math.sin(time * 1.6) * 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#39d0ff';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#eaf6ff';
    ctx.font = '900 96px system-ui, sans-serif';
    ctx.fillText('NEON', FIELD.width / 2, 218 + bob);
    ctx.shadowColor = '#ff5d8f';
    ctx.fillStyle = '#ffe3ee';
    ctx.fillText('BREAKER', FIELD.width / 2, 316 + bob);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('Break every brick. Chain the combo. Don’t drop the ball.', FIELD.width / 2, 396);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px system-ui, sans-serif';
    const blink = 0.55 + 0.45 * Math.sin(time * 4);
    ctx.globalAlpha = blink;
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY', FIELD.width / 2, 470);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Mouse / ← → move  •  SPACE serves & fires the laser  •  P pause  •  M mute  •  R restart', FIELD.width / 2, 528);
    ctx.fillText('Power-ups:  W wide paddle   M multiball   L laser   S slow ball', FIELD.width / 2, 560);
    if (state.best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(`BEST  ${state.best.toLocaleString('en-US')}`, FIELD.width / 2, 612);
    }
    ctx.restore();
  }

  drawPause() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Press P or ESC to resume', FIELD.width / 2, 396);
    ctx.restore();
  }

  drawGameOver(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffe3ee';
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.fillText('GAME OVER', FIELD.width / 2, 280);
    ctx.shadowBlur = 0;
    const isBest = state.score > 0 && state.score >= state.best;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 366);
    ctx.fillStyle = isBest ? '#7ef0c1' : PALETTE.muted;
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText(isBest ? '★ NEW BEST! ★' : `BEST  ${state.best.toLocaleString('en-US')}`, FIELD.width / 2, 412);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px system-ui, sans-serif';
    const blink = 0.55 + 0.45 * Math.sin(state.time * 4);
    ctx.globalAlpha = blink;
    ctx.fillText('PRESS R OR ENTER TO PLAY AGAIN', FIELD.width / 2, 486);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
