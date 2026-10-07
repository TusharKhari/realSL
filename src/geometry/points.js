export function normalizePoint(p) {
  if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
  if (p && typeof p === "object") return [Number(p.x ?? 0), Number(p.y ?? 0)];
  return [0, 0];
}

export function toArrayPoint(p) {
  return normalizePoint(p);
}

export function distance(a, b) {
  const pA = normalizePoint(a);
  const pB = normalizePoint(b);
  const dx = pB[0] - pA[0];
  const dy = pB[1] - pA[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointAtDistance(start, angle, len) {
  const pStart = normalizePoint(start);
  return [
    pStart[0] + Math.cos(angle) * len,
    pStart[1] + Math.sin(angle) * len
  ];
}

export function roundTo(value, step = 0.25) {
  return Math.round(value / step) * step;
}

export function snapToGrid(point, gridSize = 0.25) {
  const p = normalizePoint(point);
  return [
    roundTo(p[0], gridSize),
    roundTo(p[1], gridSize)
  ];
}
