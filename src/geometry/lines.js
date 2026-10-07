import { normalizePoint } from "./points.js";

export function distancePointToSegment(point, start, end) {
  const p = normalizePoint(point);
  const s = normalizePoint(start);
  const e = normalizePoint(end);

  const dx = e[0] - s[0];
  const dy = e[1] - s[1];

  if (dx === 0 && dy === 0) {
    return Math.hypot(p[0] - s[0], p[1] - s[1]);
  }

  const t = Math.max(0, Math.min(1, ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / (dx * dx + dy * dy)));
  const closest = [s[0] + t * dx, s[1] + t * dy];

  return Math.hypot(p[0] - closest[0], p[1] - closest[1]);
}

export function getLineIntersection(wallA, wallB) {
  const sA = normalizePoint(wallA.start);
  const eA = normalizePoint(wallA.end);
  const sB = normalizePoint(wallB.start);
  const eB = normalizePoint(wallB.end);

  const x1 = sA[0], y1 = sA[1];
  const x2 = eA[0], y2 = eA[1];
  const x3 = sB[0], y3 = sB[1];
  const x4 = eB[0], y4 = eB[1];

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;

  const onSegmentA = px >= Math.min(x1, x2) - 0.01 && px <= Math.max(x1, x2) + 0.01 &&
                     py >= Math.min(y1, y2) - 0.01 && py <= Math.max(y1, y2) + 0.01;
  const onSegmentB = px >= Math.min(x3, x4) - 0.01 && px <= Math.max(x3, x4) + 0.01 &&
                     py >= Math.min(y3, y4) - 0.01 && py <= Math.max(y3, y4) + 0.01;

  if (onSegmentA && onSegmentB) {
    return [px, py];
  }

  return null;
}
