/**
 * Renders only when something changes: `invalidate()` asks for a frame, and `frame` says whether more are needed
 * (an animation is running). It stops while the page is hidden and reports each frame's length to the monitor.
 */
export class RenderLoop {
  private handle: number | null = null;
  private last = 0;
  private disposed = false;
  private readonly onVisibility = (): void => {
    if (document.hidden) this.cancel();
    else this.invalidate();
  };

  constructor(
    private readonly frame: (seconds: number) => boolean,
    private readonly onFrameTime?: (milliseconds: number) => void,
  ) {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  invalidate(): void {
    if (this.disposed || this.handle !== null || document.hidden) return;
    this.handle = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.handle = null;
    const elapsed = this.last === 0 ? 16.7 : Math.min(100, now - this.last);
    this.last = now;
    const more = this.frame(elapsed / 1000);
    if (more) {
      this.onFrameTime?.(elapsed);
      this.invalidate();
    } else {
      this.last = 0;
    }
  }

  private cancel(): void {
    if (this.handle !== null) cancelAnimationFrame(this.handle);
    this.handle = null;
    this.last = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
