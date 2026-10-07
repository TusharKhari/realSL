import { normalizePoint } from "./points.js";

export function vectorLength(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

export function normalizeVector(v) {
  const len = vectorLength(v);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function dotProduct(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1];
}

export function crossProduct(v1, v2) {
  return v1[0] * v2[1] - v1[1] * v2[0];
}

export function angleBetween(a, b) {
  const pA = normalizePoint(a);
  const pB = normalizePoint(b);
  return Math.atan2(pB[1] - pA[1], pB[0] - pA[0]);
}

export function perpendicularVector(v) {
  return [-v[1], v[0]];
}
