import { isLand } from "@/lib/globeLand";

/**
 * A dotted globe drawn on a 2D canvas with its own 3D projection: land as lit dots on a dark sphere, a soft atmosphere, and great-circle arcs that rise off the surface
 * with a bright head travelling along each. It is a pure function of time, so the page animates it live and the same code renders the looping video.
 * Decorative only: the arcs are not data and carry no labels.
 */
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

type V3 = [number, number, number];
const ll = (lat: number, lon: number): V3 => { const la = lat * RAD, lo = lon * RAD; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; };

const HUB = ll(51.05, -114.07);   // Calgary, where the company is based
const SPOKES: V3[] = [
  ll(43.65, -79.38), ll(51.5, -0.12), ll(6.52, 3.38), ll(-1.29, 36.82), ll(19.08, 72.88),
  ll(1.35, 103.82), ll(-23.55, -46.63), ll(-33.87, 151.21), ll(-26.2, 28.05), ll(35.68, 139.69), ll(25.2, 55.27),
];

let dots: V3[] | null = null;
function landDots(): V3[] {
  if (dots) return dots;
  const n = 15000, golden = Math.PI * (3 - Math.sqrt(5)), out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = golden * i;
    const p: V3 = [Math.cos(th) * r, y, Math.sin(th) * r];
    const lat = Math.asin(p[1]) / RAD, lon = Math.atan2(p[0], p[2]) / RAD;
    if (isLand(lat, lon)) out.push(p);
  }
  return (dots = out);
}

/** turn about the vertical axis (yaw) and then tip the north pole toward the viewer (tilt) */
function rot(p: V3, yaw: number, tilt: number): V3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  const x = p[0] * cy - p[2] * sy, z = p[0] * sy + p[2] * cy;
  return [x, p[1] * ct - z * st, p[1] * st + z * ct];
}

function slerp(a: V3, b: V3, t: number): V3 {
  const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(d), s = Math.sin(om) || 1;
  const k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

export interface GlobeOptions {
  /** radians the globe has turned at t = 0 */
  yaw0?: number;
  /** seconds for one full turn */
  turnSecs?: number;
  /** tip of the north pole toward the viewer, radians */
  tilt?: number;
  /** extra turn and tip from the pointer, radians */
  nudgeYaw?: number;
  nudgeTilt?: number;
  /** seconds for one arc to travel; every phase repeats with this period */
  arcSecs?: number;
  /** radius as a fraction of the shorter side */
  radius?: number;
  /** centre as a fraction of the canvas */
  cx?: number;
  cy?: number;
}

const LIGHT: V3 = (() => { const v: V3 = [-0.55, 0.6, 0.58]; const m = Math.hypot(...v); return [v[0] / m, v[1] / m, v[2] / m]; })();

export function drawGlobe(g: CanvasRenderingContext2D, w: number, h: number, t: number, o: GlobeOptions = {}): void {
  const { yaw0 = 0.9, turnSecs = 120, tilt = 0.38, nudgeYaw = 0, nudgeTilt = 0, arcSecs = 8, radius = 0.42, cx = 0.5, cy = 0.5 } = o;
  const R = Math.min(w, h) * radius, X = w * cx, Y = h * cy;
  const yaw = yaw0 + (TAU * t) / turnSecs + nudgeYaw, tl = tilt + nudgeTilt;
  g.clearRect(0, 0, w, h);

  // atmosphere behind the sphere
  const halo = g.createRadialGradient(X, Y, R * 0.92, X, Y, R * 1.35);
  halo.addColorStop(0, "rgba(120,120,255,0.38)"); halo.addColorStop(0.35, "rgba(110,90,250,0.14)"); halo.addColorStop(1, "rgba(100,90,250,0)");
  g.fillStyle = halo; g.fillRect(X - R * 1.4, Y - R * 1.4, R * 2.8, R * 2.8);

  // the sphere: dark body, lit from the upper left
  const body = g.createRadialGradient(X - R * 0.38, Y - R * 0.42, R * 0.05, X, Y, R);
  body.addColorStop(0, "#232552"); body.addColorStop(0.55, "#12132e"); body.addColorStop(1, "#0a0a1a");
  g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fillStyle = body; g.fill();

  // graticule, every 30 degrees, front side only
  g.lineWidth = 1; g.strokeStyle = "rgba(150,160,255,0.10)";
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath(); let pen = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = rot(ll(lat, lon), yaw, tl);
      if (p[2] > 0) { const x = X + p[0] * R, y = Y - p[1] * R; pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
    }
    g.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    g.beginPath(); let pen = false;
    for (let lat = -88; lat <= 88; lat += 4) {
      const p = rot(ll(lat, lon), yaw, tl);
      if (p[2] > 0) { const x = X + p[0] * R, y = Y - p[1] * R; pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
    }
    g.stroke();
  }

  // land dots, shaded by the light and faded toward the limb; the far side shows faintly through
  for (const d of landDots()) {
    const p = rot(d, yaw, tl);
    const lit = Math.max(0, p[0] * LIGHT[0] + p[1] * LIGHT[1] + p[2] * LIGHT[2]);
    if (p[2] > 0) {
      const a = 0.34 + 0.66 * Math.pow(lit, 0.75), size = 0.9 + 1.25 * p[2];
      g.fillStyle = `rgba(${150 + 90 * lit | 0},${160 + 80 * lit | 0},255,${a})`;
      g.fillRect(X + p[0] * R - size / 2, Y - p[1] * R - size / 2, size, size);
    } else if (p[2] > -0.5) {
      g.fillStyle = "rgba(120,125,230,0.07)";
      g.fillRect(X + p[0] * R - 0.5, Y - p[1] * R - 0.5, 1, 1);
    }
  }

  // arcs from the hub: lifted off the surface, with a bright head that repeats every arcSecs
  const lift = 0.2;
  SPOKES.forEach((dest, i) => {
    const offset = (i / SPOKES.length), head = ((t / arcSecs + offset) % 1 + 1) % 1;
    const steps = 48;
    let prev: { x: number; y: number; vis: boolean } | null = null;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps, base = slerp(HUB, dest, u), k = 1 + lift * Math.sin(Math.PI * u) * Math.min(1, Math.acos(Math.max(-1, Math.min(1, HUB[0] * dest[0] + HUB[1] * dest[1] + HUB[2] * dest[2]))) / 1.2);
      const p = rot([base[0] * k, base[1] * k, base[2] * k], yaw, tl);
      const vis = p[2] > -0.02;
      const cur = { x: X + p[0] * R, y: Y - p[1] * R, vis };
      if (prev && prev.vis && cur.vis) {
        const behind = ((head - u) % 1 + 1) % 1;                       // 0 at the head, growing behind it
        const trail = behind < 0.35 ? Math.pow(1 - behind / 0.35, 1.6) : 0;
        g.strokeStyle = `rgba(170,150,255,${0.10 + 0.8 * trail})`;
        g.lineWidth = 0.8 + 1.8 * trail;
        g.beginPath(); g.moveTo(prev.x, prev.y); g.lineTo(cur.x, cur.y); g.stroke();
      }
      prev = cur;
    }
  });

  // nodes: the hub pulses, the destinations glow softly
  const node = (p: V3, r: number, pulse: number) => {
    const q = rot(p, yaw, tl);
    if (q[2] <= 0.02) return;
    const x = X + q[0] * R, y = Y - q[1] * R;
    const gl = g.createRadialGradient(x, y, 0, x, y, r * 5); gl.addColorStop(0, "rgba(190,175,255,0.85)"); gl.addColorStop(1, "rgba(150,130,255,0)");
    g.fillStyle = gl; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = "#fff"; g.fill();
    if (pulse > 0) { g.beginPath(); g.arc(x, y, r * (1.5 + 5 * pulse), 0, TAU); g.strokeStyle = `rgba(200,190,255,${0.6 * (1 - pulse)})`; g.lineWidth = 1.2; g.stroke(); }
  };
  SPOKES.forEach((d) => node(d, 1.6, 0));
  node(HUB, 2.8, ((t / (arcSecs / 2)) % 1 + 1) % 1);

  // rim light along the lit edge
  const rim = g.createRadialGradient(X, Y, R * 0.9, X, Y, R * 1.01);
  rim.addColorStop(0, "rgba(140,140,255,0)"); rim.addColorStop(1, "rgba(150,150,255,0.35)");
  g.beginPath(); g.arc(X, Y, R, 0, TAU); g.fillStyle = rim; g.fill();
}
