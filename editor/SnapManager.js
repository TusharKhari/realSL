import {
  distance,
  angleBetween,
  pointAtDistance,
  snapToGrid,
  normalizePoint
} from "../model/Geometry.js";

export class SnapManager {
  constructor(options = {}) {
    this.gridSize = options.gridSize ?? 0.25; // 0.25m grid snapping step
    this.snapDistance = options.snapDistance ?? 0.35; // 0.35m snap radius threshold
    this.angleSnap = options.angleSnap ?? (Math.PI / 4); // 45 degree increments
  }

  snap(point, building, options = {}) {
    const {
      grid = true,
      endpoints = true,
      intersections = true,
      angles = true,
      startPoint = null
    } = options;

    const p = normalizePoint(point);

    // 1. Priority: Intersections
    if (intersections && building) {
      const intersectionCandidates = this.getIntersectionCandidates(building);
      const closestIntersection = this.findClosest(p, intersectionCandidates);
      if (closestIntersection) {
        return {
          point: closestIntersection.point,
          type: "intersection",
          label: "Intersection"
        };
      }
    }

    // 2. Priority: Endpoints
    if (endpoints && building) {
      const endpointCandidates = this.getEndpointCandidates(building);
      const closestEndpoint = this.findClosest(p, endpointCandidates);
      if (closestEndpoint) {
        return {
          point: closestEndpoint.point,
          type: "endpoint",
          label: "Endpoint"
        };
      }
    }

    // 3. Priority: Angle Snapping (0°, 45°, 90°, 135°, 180°, etc. from startPoint)
    if (angles && startPoint) {
      const snappedAnglePt = this.snapAngle(startPoint, p);
      const distToAngleLine = distance(p, snappedAnglePt);

      if (distToAngleLine <= this.snapDistance) {
        // If grid snapping is also enabled, snap distance along angle line
        let finalPoint = snappedAnglePt;
        if (grid) {
          const len = distance(startPoint, snappedAnglePt);
          const snappedLen = Math.round(len / this.gridSize) * this.gridSize;
          const angle = angleBetween(startPoint, p);
          const snappedAngle = Math.round(angle / this.angleSnap) * this.angleSnap;
          finalPoint = pointAtDistance(startPoint, snappedAngle, snappedLen);
        }

        return {
          point: finalPoint,
          type: "angle",
          label: `${Math.round((Math.atan2(finalPoint[1] - startPoint[1], finalPoint[0] - startPoint[0]) * 180 / Math.PI + 360) % 360)}°`
        };
      }
    }

    // 4. Priority: Grid Snapping
    if (grid) {
      const gridPt = snapToGrid(p, this.gridSize);
      if (distance(p, gridPt) <= this.snapDistance) {
        return {
          point: gridPt,
          type: "grid",
          label: "Grid"
        };
      }
    }

    return {
      point: [p.x, p.y],
      type: null,
      label: null
    };
  }

  getEndpointCandidates(building) {
    const candidates = [];
    for (const wall of building.getWalls()) {
      candidates.push({ point: wall.start, type: "endpoint" });
      candidates.push({ point: wall.end, type: "endpoint" });
    }
    return candidates;
  }

  getIntersectionCandidates(building) {
    const candidates = [];
    const walls = building.getWalls();

    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const intersection = this.getLineIntersection(walls[i], walls[j]);
        if (intersection) {
          candidates.push({ point: intersection, type: "intersection" });
        }
      }
    }
    return candidates;
  }

  findClosest(point, candidates) {
    let closest = null;
    let closestDistance = this.snapDistance;

    for (const candidate of candidates) {
      const d = distance(point, candidate.point);
      if (d <= closestDistance) {
        closest = candidate;
        closestDistance = d;
      }
    }

    return closest;
  }

  snapAngle(start, end) {
    const angle = angleBetween(start, end);
    const snappedAngle = Math.round(angle / this.angleSnap) * this.angleSnap;
    const len = distance(start, end);
    return pointAtDistance(start, snappedAngle, len);
  }

  getLineIntersection(wallA, wallB) {
    const x1 = wallA.start[0], y1 = wallA.start[1];
    const x2 = wallA.end[0], y2 = wallA.end[1];
    const x3 = wallB.start[0], y3 = wallB.start[1];
    const x4 = wallB.end[0], y4 = wallB.end[1];

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return null;

    const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator;
    const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator;

    // Check if intersection point lies within segment bounding boxes
    const onSegmentA = px >= Math.min(x1, x2) - 0.01 && px <= Math.max(x1, x2) + 0.01 &&
                       py >= Math.min(y1, y2) - 0.01 && py <= Math.max(y1, y2) + 0.01;
    const onSegmentB = px >= Math.min(x3, x4) - 0.01 && px <= Math.max(x3, x4) + 0.01 &&
                       py >= Math.min(y3, y4) - 0.01 && py <= Math.max(y3, y4) + 0.01;

    if (onSegmentA && onSegmentB) {
      return [px, py];
    }

    return null;
  }
}
