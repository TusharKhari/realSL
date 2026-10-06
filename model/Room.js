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
    let area = 0;
    const points = this.boundary;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      area += current[0] * next[1] - next[0] * current[1];
    }
    return Math.abs(area) / 2;
  }

  calculatePerimeter() {
    let perimeter = 0;
    for (let i = 0; i < this.boundary.length; i++) {
      const current = this.boundary[i];
      const next = this.boundary[(i + 1) % this.boundary.length];
      const dx = next[0] - current[0];
      const dy = next[1] - current[1];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  calculateCenter() {
    const pts = this.boundary;
    let areaFactor = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const cross = a[0] * b[1] - b[0] * a[1];
      areaFactor += cross;
      cx += (a[0] + b[0]) * cross;
      cy += (a[1] + b[1]) * cross;
    }

    const signedArea = areaFactor / 2;
    if (Math.abs(signedArea) < 0.0001) {
      let x = 0, y = 0;
      for (const point of pts) {
        x += point[0];
        y += point[1];
      }
      return [x / pts.length, y / pts.length];
    }

    return [
      cx / (6 * signedArea),
      cy / (6 * signedArea)
    ];
  }
}
