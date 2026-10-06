export class Room {
  constructor(data, building) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.boundary = data.boundary.map(point => [...point]);
    this.levelId = data.levelId ?? null;
    this.building = building;
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
