import { calculatePolygonArea, calculatePolygonPerimeter, calculatePolygonCenter } from "../geometry/measurements.js";

export class Room {
  constructor(data, building) {
    this.id = data.id;
    this.name = data.name ?? data.id;
    this.type = data.type ?? "room";
    this.levelId = data.levelId ?? null;
    this.building = building;
    this.wallIds = data.wallIds ? [...data.wallIds] : null;

    if (data.boundary && Array.isArray(data.boundary) && data.boundary.length >= 3) {
      this.boundary = data.boundary.map(point => {
        if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];
        if (point && typeof point === "object") return [Number(point.x ?? 0), Number(point.y ?? 0)];
        return [0, 0];
      });
    } else if (this.wallIds && building) {
      this.boundary = this.deriveBoundaryFromWalls();
    } else {
      this.boundary = [];
    }
  }

  deriveBoundaryFromWalls() {
    if (!this.wallIds || !this.building) return [];
    const walls = this.wallIds.map(id => this.building.getWall(id)).filter(Boolean);
    if (walls.length === 0) return [];

    let segments = walls.map(w => ({ start: [...w.start], end: [...w.end] }));
    const polygon = [];
    let currentPt = segments[0].start;
    polygon.push(currentPt);

    let remaining = [...segments];

    while (remaining.length > 0) {
      let foundIndex = -1;
      let nextPt = null;

      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const distStart = Math.hypot(seg.start[0] - currentPt[0], seg.start[1] - currentPt[1]);
        const distEnd = Math.hypot(seg.end[0] - currentPt[0], seg.end[1] - currentPt[1]);

        if (distStart < 0.05) {
          foundIndex = i;
          nextPt = seg.end;
          break;
        } else if (distEnd < 0.05) {
          foundIndex = i;
          nextPt = seg.start;
          break;
        }
      }

      if (foundIndex === -1) {
        currentPt = remaining[0].start;
        polygon.push(currentPt);
        remaining.shift();
      } else {
        currentPt = nextPt;
        const startDist = Math.hypot(polygon[0][0] - currentPt[0], polygon[0][1] - currentPt[1]);
        if (startDist > 0.05 || remaining.length > 1) {
          polygon.push(currentPt);
        }
        remaining.splice(foundIndex, 1);
      }
    }

    return polygon;
  }

  calculateArea() {
    return calculatePolygonArea(this.boundary);
  }

  calculatePerimeter() {
    return calculatePolygonPerimeter(this.boundary);
  }

  calculateCenter() {
    return calculatePolygonCenter(this.boundary);
  }

  toJSON() {
    const result = {
      id: this.id,
      name: this.name,
      type: this.type,
      boundary: this.boundary.map(point => [...point])
    };

    if (this.wallIds) {
      result.wallIds = [...this.wallIds];
    }
    if (this.levelId) {
      result.levelId = this.levelId;
    }

    return result;
  }
}
