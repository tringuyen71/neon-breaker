// Input for Neon Breaker: keyboard, mouse and touch, all normalised to one
// small state the world reads each step. The paddle follows the pointer when
// the pointer moves, and the arrow keys (or A/D) steer it otherwise. Space (or
// a click/tap) serves the ball and fires the laser; P pauses, M mutes, R
// restarts from the game-over screen.

export class Input {
  constructor(canvas) {
    this.left = false;
    this.right = false;
    /** -1, 0 or 1: the direction the keys ask for this step. */
    this.axis = 0;
    /** Pointer x in logical field coordinates, or null when never moved. */
    this.pointerX = null;
    this.pointerActive = false;
    this.actionQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;
    this.restartQueued = false;
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    canvas.addEventListener('pointermove', (event) => this.onPointer(event));
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    canvas.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
  }

  onKeyDown(event) {
    if (event.repeat) return;
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.right = true;
        break;
      case 'Space':
      case 'Enter':
        this.actionQueued = true;
        event.preventDefault();
        break;
      case 'KeyP':
      case 'Escape':
        this.pauseQueued = true;
        break;
      case 'KeyM':
        this.muteQueued = true;
        break;
      case 'KeyR':
        this.restartQueued = true;
        break;
      default:
        break;
    }
    this.updateAxis();
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.right = false;
        break;
      default:
        break;
    }
    this.updateAxis();
  }

  updateAxis() {
    this.axis = (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }

  /** Map a client x to logical field x using the canvas's on-screen box. */
  toFieldX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    return ((clientX - rect.left) / rect.width) * 1280;
  }

  onPointer(event) {
    const x = this.toFieldX(event.clientX);
    if (x !== null) {
      this.pointerX = x;
      this.pointerActive = true;
    }
  }

  onPointerDown(event) {
    const x = this.toFieldX(event.clientX);
    if (x !== null) {
      this.pointerX = x;
      this.pointerActive = true;
    }
    this.actionQueued = true;
  }

  /** Consume the one-shot queues; the world calls this once per step. */
  take() {
    const taken = {
      action: this.actionQueued,
      pause: this.pauseQueued,
      mute: this.muteQueued,
      restart: this.restartQueued,
    };
    this.actionQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;
    this.restartQueued = false;
    return taken;
  }
}
