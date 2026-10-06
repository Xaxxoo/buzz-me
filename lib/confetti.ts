/* A small canvas particle burst. The Backdrop component attaches the canvas. */
interface Bit { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number }

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let bits: Bit[] = [];
let raf = 0;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function size() {
  if (!canvas || !ctx) return;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * d;
  canvas.height = window.innerHeight * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}

function draw() {
  if (!ctx) { raf = 0; return; }
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  bits = bits.filter(b => b.life > 0 && b.y < window.innerHeight + 30);
  for (const b of bits) {
    b.vy += 0.28; b.vx *= 0.985; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life--;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.r);
    ctx.globalAlpha = Math.min(1, b.life / 20);
    ctx.fillStyle = b.c;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();
  }
  raf = bits.length ? requestAnimationFrame(draw) : 0;
}

export const confetti = {
  /** Returns a cleanup function. */
  attach(el: HTMLCanvasElement) {
    canvas = el; ctx = el.getContext('2d');
    size();
    window.addEventListener('resize', size);
    return () => { window.removeEventListener('resize', size); cancelAnimationFrame(raf); raf = 0; bits = []; canvas = null; ctx = null; };
  },
  burst(x: number, y: number, n: number, colors: string[], spread = 9) {
    if (!ctx || calm()) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(2, spread);
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rand(2, 7), r: rand(0, 6), vr: rand(-0.3, 0.3), w: rand(6, 12), h: rand(4, 9), c: colors[Math.floor(Math.random() * colors.length)], life: rand(50, 95) });
    }
    if (!raf) raf = requestAnimationFrame(draw);
  },
  burstFrom(el: Element | null, n: number, colors: string[]) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.burst(r.left + r.width / 2, r.top + r.height / 2, n, colors);
  },
  /** Several bursts across the top of the screen, for a win. */
  rain(colors: string[], waves = 6) {
    for (let i = 0; i < waves; i++) setTimeout(() => this.burst(rand(0.1, 0.9) * window.innerWidth, rand(-10, 120), 34, colors, 11), i * 220);
  },
};
