export function normalizePoint(p) {
  if (Array.isArray(p)) return { x: p[0], y: p[1] };
  return { x: p.x, y: p.y };
}

export function toArrayPoint(p) {
  if (Array.isArray(p)) return [p[0], p[1]];
  return [p.x, p.y];
}

export function distance(a, b) {
  const pA = normalizePoint(a);
  const pB = normalizePoint(b);
  const dx = pB.x - pA.x;
  const dy = pB.y - pA.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(a, b) {
  const pA = normalizePoint(a);
  const pB = normalizePoint(b);
  return Math.atan2(pB.y - pA.y, pB.x - pA.x);
}

export function pointAtDistance(start, angle, len) {
  const pStart = normalizePoint(start);
  return [
    pStart.x + Math.cos(angle) * len,
    pStart.y + Math.sin(angle) * len
  ];
}

export function roundTo(value, step) {
  return Math.round(value / step) * step;
}

export function snapToGrid(point, gridSize = 0.25) {
  const p = normalizePoint(point);
  return [
    roundTo(p.x, gridSize),
    roundTo(p.y, gridSize)
  ];
}
