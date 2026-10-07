import { normalizePoint, distance, pointAtDistance, snapToGrid } from "../geometry/points.js";
import { angleBetween } from "../geometry/vectors.js";
import { getLineIntersection } from "../geometry/lines.js";

export class SnapManager {
  constructor(options = {}) {
    this.gridSize = options.gridSize ?? 0.25;
    this.snapDistance = options.snapDistance ?? 0.35;
    this.angleSnap = options.angleSnap ?? (Math.PI / 4);
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

    if (angles && startPoint) {
      const snappedAnglePt = this.snapAngle(startPoint, p);
      const distToAngleLine = distance(p, snappedAnglePt);

      if (distToAngleLine <= this.snapDistance) {
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
      point: [p[0], p[1]],
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
        const intersection = getLineIntersection(walls[i], walls[j]);
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
}
