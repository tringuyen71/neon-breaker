// Neon Breaker — boot and main loop. Fixed 60 Hz simulation steps, rendering
// on requestAnimationFrame, and a ?shot=start|play|end&seed=N mode that stages
// one deterministic frame for screenshots (the game then holds that frame).

import { BEST_KEY, FIELD, STEP } from './config.js';
import { Input } from './input.js';
import { Renderer, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { Sound } from './audio.js';
import { World, EVENT_GAME_OVER, EVENT_LEVEL_CLEAR, EVENT_LIFE_LOST } from './world.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sound = new Sound();
const world = new World(seed);

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
} catch {
  best = 0;
}
world.state.best = best;

function saveBest() {
  if (world.state.score <= best) return;
  best = world.state.score;
  world.state.best = best;
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode: the score just does not persist.
  }
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startGame() {
  sound.unlock();
  world.reset();
  world.state.best = best;
  world.state.screen = SCREEN_PLAY;
  screen = SCREEN_PLAY;
  setStatus('Game started. Break the bricks.');
}

function togglePause() {
  if (screen !== SCREEN_PLAY && screen !== SCREEN_PAUSE) return;
  screen = screen === SCREEN_PLAY ? SCREEN_PAUSE : SCREEN_PLAY;
  world.state.screen = screen;
  setStatus(screen === SCREEN_PAUSE ? 'Paused.' : 'Resumed.');
}

function quitToTitle() {
  world.startAttract();
  world.state.best = best;
  screen = SCREEN_TITLE;
  setStatus('Neon Breaker. Press Enter to play.');
}

// A screenshot scene: stage it once and hold the frame still.
if (shotName !== null) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  world.state.best = best;
  renderer.resize();
  renderer.draw(world.state, screen, world.state.time);
} else {
  world.startAttract();
  world.state.best = best;
  setStatus('Neon Breaker. Press Enter to play.');
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    accumulator += elapsed;
    const taken = input.take();
    if (taken.mute) {
      const muted = sound.toggleMute();
      setStatus(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (taken.pause) togglePause();
    if (screen === SCREEN_TITLE && (taken.action || taken.restart)) startGame();
    else if (screen === SCREEN_OVER && (taken.action || taken.restart)) startGame();
    else if (screen === SCREEN_PAUSE && taken.restart) quitToTitle();

    if (screen === SCREEN_PLAY) {
      const move = { axis: input.axis, pointerX: input.pointerX, pointerActive: input.pointerActive };
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        const events = world.step(STEP, move, taken.action, sound);
        taken.action = false;
        accumulator -= STEP;
        guard += 1;
        if (events & EVENT_LIFE_LOST) setStatus(`Life lost. ${world.state.lives} left.`);
        if (events & EVENT_LEVEL_CLEAR) setStatus(`Level ${world.state.level} clear!`);
        if (events & EVENT_GAME_OVER) {
          screen = SCREEN_OVER;
          world.state.screen = SCREEN_OVER;
          saveBest();
          setStatus(`Game over. Score ${world.state.score}. Press R to play again.`);
          break;
        }
      }
      if (guard >= 8) accumulator = 0;
    }
    renderer.draw(world.state, screen, world.state.time);
  }

  // First gesture unlocks audio on every browser that needs one.
  window.addEventListener('pointerdown', () => sound.unlock(), { once: true });
  window.addEventListener('keydown', () => sound.unlock(), { once: true });
  requestAnimationFrame(frame);
}
