export function calculatePolygonArea(pts) {
  if (!pts || pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area) / 2;
}

export function calculatePolygonPerimeter(pts) {
  if (!pts || pts.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

export function calculatePolygonCenter(pts) {
  if (!pts || pts.length === 0) return [0, 0];
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
