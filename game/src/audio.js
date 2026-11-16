// Procedural sound effects for Neon Breaker: every sound is a short WebAudio
// oscillator phrase, so the game ships no audio files at all. All calls are
// safe when there is no audio device (headless screenshots, muted tab): the
// context is created lazily on the first user gesture and every method guards
// for a missing or suspended context.

const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5 };

export class Sound {
  constructor() {
    this.context = null;
    this.muted = false;
    this.lastPaddle = 0;
  }

  /** Call from a user gesture; browsers refuse audio before one. */
  unlock() {
    if (this.context !== null) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
    } catch {
      this.context = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, seconds, type = 'sine', volume = 0.12, when = 0, slideTo = null) {
    if (this.context === null || this.muted) return;
    if (this.context.state !== 'running') return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  paddle() {
    // Throttle: the paddle can be hit many times a second at high speed.
    const now = performance.now();
    if (now - this.lastPaddle < 45) return;
    this.lastPaddle = now;
    this.tone(220, 0.07, 'square', 0.07, 0, 330);
  }

  wall() {
    this.tone(180, 0.05, 'square', 0.05);
  }

  /** Pitch climbs with the combo, so a hot streak sounds hot. */
  brick(combo) {
    const base = NOTES.C5 * (1 + Math.min(combo, 8) * 0.06);
    this.tone(base, 0.09, 'triangle', 0.14, 0, base * 1.5);
    this.tone(base * 2, 0.06, 'sine', 0.06);
  }

  metal() {
    this.tone(140, 0.06, 'sawtooth', 0.08, 0, 110);
  }

  boom() {
    this.tone(90, 0.35, 'sawtooth', 0.16, 0, 40);
    this.tone(55, 0.4, 'sine', 0.18, 0, 30);
  }

  power() {
    this.tone(NOTES.C5, 0.09, 'sine', 0.12);
    this.tone(NOTES.E5, 0.09, 'sine', 0.12, 0.08);
    this.tone(NOTES.G5, 0.14, 'sine', 0.12, 0.16);
  }

  laser() {
    this.tone(880, 0.12, 'sawtooth', 0.08, 0, 220);
  }

  loseLife() {
    this.tone(392, 0.16, 'triangle', 0.12, 0, 330);
    this.tone(311, 0.2, 'triangle', 0.12, 0.14, 262);
    this.tone(233, 0.32, 'triangle', 0.12, 0.28, 175);
  }

  levelClear() {
    const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6];
    seq.forEach((freq, i) => this.tone(freq, 0.16, 'triangle', 0.12, i * 0.09));
  }

  gameOver() {
    const seq = [NOTES.A5, NOTES.G5, NOTES.E5, NOTES.D5, NOTES.C5];
    seq.forEach((freq, i) => this.tone(freq, 0.28, 'triangle', 0.11, i * 0.16));
  }

  serve() {
    this.tone(NOTES.G5, 0.08, 'sine', 0.09);
  }
}
