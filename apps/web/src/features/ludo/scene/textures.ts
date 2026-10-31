import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas is not available.');
  return { canvas, context };
}

function finish(canvas: HTMLCanvasElement, color: boolean, repeat = false): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (color) texture.colorSpace = SRGBColorSpace;
  if (repeat) { texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; }
  texture.anisotropy = 4;
  return texture;
}

/** Wood with a long grain: a base colour, darker streaks and a few fine knots. */
export function woodTexture(base: string, grain: string, seed: number, size = 512): CanvasTexture {
  const { canvas, context } = canvasOf(size);
  const random = mulberry32(seed);
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  context.globalAlpha = 0.22;
  context.strokeStyle = grain;
  for (let line = 0; line < 140; line += 1) {
    const x = random() * size;
    context.lineWidth = 0.6 + random() * 2.6;
    context.beginPath();
    context.moveTo(x, 0);
    for (let y = 0; y <= size; y += 32) context.lineTo(x + Math.sin(y * 0.02 + line) * (2 + random() * 5), y);
    context.stroke();
  }
  context.globalAlpha = 0.18;
  context.fillStyle = grain;
  for (let knot = 0; knot < 3; knot += 1) {
    context.beginPath();
    context.ellipse(random() * size, random() * size, 5 + random() * 8, 14 + random() * 20, 0, 0, Math.PI * 2);
    context.fill();
  }
  return finish(canvas, true, true);
}

/** A soft fabric or stone speckle in one colour, for felt, marble and frosted surfaces. */
export function speckleTexture(base: string, fleck: string, seed: number, amount = 2600, size = 256): CanvasTexture {
  const { canvas, context } = canvasOf(size);
  const random = mulberry32(seed);
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);
  context.fillStyle = fleck;
  for (let index = 0; index < amount; index += 1) {
    context.globalAlpha = 0.05 + random() * 0.18;
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  return finish(canvas, true, true);
}

// Pip centres on a face, as fractions of its width.
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
};

/** One die face: the colour map with painted pips, and a matching bump map where the pips are dimples. */
export function pipFace(face: number, ground: string, pip: string, seed: number, size = 256): { map: CanvasTexture; bump: CanvasTexture } {
  const color = canvasOf(size);
  const bump = canvasOf(size);
  const random = mulberry32(seed + face * 977);
  color.context.fillStyle = ground;
  color.context.fillRect(0, 0, size, size);
  color.context.globalAlpha = 0.06;
  color.context.fillStyle = '#7a6a50';
  for (let index = 0; index < 900; index += 1) color.context.fillRect(random() * size, random() * size, 1.5, 1.5);
  color.context.globalAlpha = 1;
  bump.context.fillStyle = '#d8d8d8';
  bump.context.fillRect(0, 0, size, size);
  for (const [x, y] of PIPS[face] ?? []) {
    const radius = size * 0.085;
    const gradient = color.context.createRadialGradient(x * size - radius * 0.3, y * size - radius * 0.3, radius * 0.1, x * size, y * size, radius);
    gradient.addColorStop(0, '#3a3a44');
    gradient.addColorStop(1, pip);
    color.context.fillStyle = gradient;
    color.context.beginPath();
    color.context.arc(x * size, y * size, radius, 0, Math.PI * 2);
    color.context.fill();
    const dimple = bump.context.createRadialGradient(x * size, y * size, 0, x * size, y * size, radius * 1.15);
    dimple.addColorStop(0, '#000000');
    dimple.addColorStop(1, '#d8d8d8');
    bump.context.fillStyle = dimple;
    bump.context.beginPath();
    bump.context.arc(x * size, y * size, radius * 1.15, 0, Math.PI * 2);
    bump.context.fill();
  }
  return { map: finish(color.canvas, true), bump: finish(bump.canvas, false) };
}

/** A pawn's number, drawn small on a transparent square, for the label above it. */
export function numberLabel(value: number, ink: string, halo: string, size = 96): CanvasTexture {
  const { canvas, context } = canvasOf(size);
  context.clearRect(0, 0, size, size);
  context.font = `700 ${Math.floor(size * 0.62)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = size * 0.12;
  context.strokeStyle = halo;
  context.strokeText(String(value), size / 2, size / 2 + size * 0.04);
  context.fillStyle = ink;
  context.fillText(String(value), size / 2, size / 2 + size * 0.04);
  return finish(canvas, true);
}
