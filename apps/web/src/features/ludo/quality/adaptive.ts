/**
 * Watches frame lengths while something is animating and says when the device cannot keep up: it fires once after about
 * 2 seconds of frames averaging over 33 ms (under 30 frames per second), then starts a new window. It only ever asks
 * for a lower level; it never raises quality on its own.
 */
export class FrameMonitor {
  private total = 0;
  private count = 0;
  private spent = 0;

  constructor(
    private readonly onSlow: () => void,
    private readonly thresholdMs = 33,
    private readonly windowMs = 2000,
  ) {}

  /** Records one frame of an animation; frames shorter than 250 ms count, anything longer is a pause and is ignored. */
  record(milliseconds: number): void {
    if (milliseconds > 250) { this.reset(); return; }
    this.total += milliseconds;
    this.count += 1;
    this.spent += milliseconds;
    if (this.spent < this.windowMs) return;
    const average = this.total / this.count;
    this.reset();
    if (average > this.thresholdMs) this.onSlow();
  }

  reset(): void {
    this.total = 0;
    this.count = 0;
    this.spent = 0;
  }
}
