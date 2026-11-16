// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (predict where the ball will land and move the paddle
// there), so the frame is what a short game really looks like and the same
// seed always gives the same frame.

import { FIELD, PADDLE, STEP } from './config.js';
import { EVENT_GAME_OVER } from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 60;

/** Where the ball will cross the paddle line, following wall bounces. */
function landingX(world) {
  const s = world.state;
  const ball = s.balls.find((b) => !b.stuck && b.vy > 0);
  if (!ball) return FIELD.width / 2;
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  const vy = ball.vy;
  for (let t = 0; t < 4; t += SAMPLE) {
    x += vx * SAMPLE;
    y += vy * SAMPLE;
    if (x < FIELD.wall + 9) {
      x = FIELD.wall + 9 + (FIELD.wall + 9 - x);
      vx = Math.abs(vx);
    } else if (x > FIELD.width - FIELD.wall - 9) {
      x = FIELD.width - FIELD.wall - 9 - (x - (FIELD.width - FIELD.wall - 9));
      vx = -Math.abs(vx);
    }
    if (y >= PADDLE.y) return x;
  }
  return x;
}

/** Move toward the predicted landing spot; serve when the ball is stuck. */
function autopilot(world) {
  const s = world.state;
  if (s.mode === 'serve') return { axis: 0, pointerX: null, pointerActive: false, action: true };
  const target = landingX(world);
  const centre = s.paddle.x + s.paddle.width / 2;
  const axis = target > centre + 10 ? 1 : target < centre - 10 ? -1 : 0;
  return { axis, pointerX: null, pointerActive: false, action: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title screen over a short attract demo: the world plays itself behind it.
    world.startAttract();
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world), false, null);
    }
    return { screen: 'title' };
  }
  world.state.screen = 'play';
  if (name === 'end') {
    // A hurried player: the paddle only reacts when the ball is close, so it
    // is caught out once the ball speeds up.
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const s = world.state;
      const ball = s.balls.find((b) => !b.stuck);
      const near = ball !== undefined && ball.y > PADDLE.y - 260;
      const move = near ? autopilot(world) : { axis: 0, pointerX: null, pointerActive: false, action: s.mode === 'serve' };
      const events = world.step(STEP, move, move.action, null);
      if (events & EVENT_GAME_OVER) break;
    }
    return { screen: world.state.screen };
  }
  for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
    const move = autopilot(world);
    const events = world.step(STEP, move, move.action, null);
    if (events & EVENT_GAME_OVER) break;
  }
  return { screen: world.state.screen };
}
