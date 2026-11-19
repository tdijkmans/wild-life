import type { InteractiveWorld, WorldCanvasRenderer } from './world-protocol';

/** Canvas setup and drawing primitives; no model stepping or biological rules. */
export abstract class LivingCanvas<T extends InteractiveWorld> implements WorldCanvasRenderer {
  protected readonly ctx: CanvasRenderingContext2D;
  constructor(
    protected readonly canvas: HTMLCanvasElement,
    protected world: T,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This world requires Canvas 2D');
    this.ctx = ctx;
  }
  setWorld(world: InteractiveWorld): void {
    this.world = world as T;
  }
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }
  protected begin(hue: number): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#050a13';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const s = Math.min(this.canvas.width / 1200, this.canvas.height / 720);
    c.setTransform(
      s,
      0,
      0,
      s,
      (this.canvas.width - 1200 * s) / 2,
      (this.canvas.height - 720 * s) / 2,
    );
    const g = c.createRadialGradient(600, 330, 20, 600, 330, 720);
    g.addColorStop(0, `hsl(${hue},42%,13%)`);
    g.addColorStop(1, '#050a13');
    c.fillStyle = g;
    c.fillRect(0, 0, 1200, 720);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = `hsla(${hue},50%,78%,${0.04 + (i % 4) * 0.02})`;
      c.beginPath();
      c.arc((i * 173.21) % 1200, (i * 97.71) % 720, 0.5 + (i % 3) * 0.3, 0, Math.PI * 2);
      c.fill();
    }
  }
  protected glow(x: number, y: number, r: number, hue: number, alpha = 0.2): void {
    const c = this.ctx,
      g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue},85%,68%,${alpha})`);
    g.addColorStop(1, `hsla(${hue},85%,50%,0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  protected dot(x: number, y: number, r: number, hue: number, alpha = 0.8): void {
    const c = this.ctx;
    c.fillStyle = `hsla(${hue},75%,72%,${alpha})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  protected fields(
    fields: readonly { x: number; y: number; radius: number; life: number }[],
    hue: number,
  ): void {
    for (const f of fields) this.glow(f.x, f.y, f.radius, hue, Math.min(0.12, f.life * 0.025));
  }
  abstract render(nowMs: number): void;
}
