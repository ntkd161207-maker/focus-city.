export class GameLoop {
  private frame = 0;
  private last = 0;
  constructor(private tick: (dt: number) => void) {}
  start() {
    const run = (now: number) => {
      const dt = this.last ? (now - this.last) / 1000 : 0;
      this.last = now;
      this.tick(dt);
      this.frame = requestAnimationFrame(run);
    };
    this.frame = requestAnimationFrame(run);
  }
  stop() {
    cancelAnimationFrame(this.frame);
    this.last = 0;
  }
}
