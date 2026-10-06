// One Euro filter (Casiez, Roussel & Vogel, CHI 2012) — adaptive low-pass for
// the pen tip.
//
// This replaced a fixed 5-frame moving average, which smeared every point a
// couple of frames behind the hand: the pen visually trailed the fingertip and
// never landed where you pointed. One Euro smooths hard when the finger is
// still (killing landmark jitter) and opens up as soon as it moves, so fast
// strokes stay glued to the fingertip.

export class OneEuro {
  private xf = 0;
  private dxPrev = 0;
  private prevRaw = 0;
  private started = false;
  // Hz — lower minCutoff = steadier when still; beta = how fast the smoothing
  // opens up with speed; dCutoff = cutoff of the speed estimate itself.
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  // Defaults measured with scripts/one-euro.mjs: ~3x less jitter than the raw
  // landmarks while the hand is still, under ~1.5 frames of lag on a fast
  // 20px/frame sweep.
  constructor(minCutoff = 1.5, beta = 0.1, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  reset() {
    this.started = false;
  }

  // x in canvas pixels, dt in milliseconds.
  filter(x: number, dt: number): number {
    if (!this.started) {
      this.started = true;
      this.xf = this.prevRaw = x;
      this.dxPrev = 0;
      return x;
    }
    // Clamp dt: a duplicated/stalled timestamp would divide by zero and poison
    // the state with NaN forever.
    dt = Math.min(200, Math.max(1, dt));
    const dtS = dt / 1000; // alpha() works in seconds
    // Speed in px per 30fps frame so the tuning constants don't depend on the
    // actual frame rate.
    const speed = ((x - this.prevRaw) / dt) * 33.3;
    this.prevRaw = x;
    const aD = this.alpha(this.dCutoff, dtS);
    this.dxPrev = aD * speed + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev);
    const a = this.alpha(cutoff, dtS);
    this.xf = a * x + (1 - a) * this.xf;
    return this.xf;
  }

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
}