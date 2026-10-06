import { distance, normalizePoint } from "./Geometry.js";

export class Dimension {
  constructor(start, end, options = {}) {
    this.start = start;
    this.end = end;
    this.offset = options.offset ?? 0.6; // Meters offset from wall line
    this.unit = options.unit ?? "m";
  }

  getValue() {
    return distance(this.start, this.end);
  }

  getLabel() {
    return `${this.getValue().toFixed(2)} ${this.unit}`;
  }

  getOffsetPoints() {
    const pStart = normalizePoint(this.start);
    const pEnd = normalizePoint(this.end);

    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return {
        start: [pStart.x, pStart.y],
        end: [pEnd.x, pEnd.y],
        dimStart: [pStart.x, pStart.y],
        dimEnd: [pEnd.x, pEnd.y]
      };
    }

    const perp = [-dy / len, dx / len];
    const offX = perp[0] * this.offset;
    const offY = perp[1] * this.offset;

    return {
      start: [pStart.x, pStart.y],
      end: [pEnd.x, pEnd.y],
      dimStart: [pStart.x + offX, pStart.y + offY],
      dimEnd: [pEnd.x + offX, pEnd.y + offY]
    };
  }
}
