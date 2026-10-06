// ============================================================
// JSON → 2D SVG BUILDING RENDERER
// ============================================================

const canvas = document.getElementById("canvas");
const grid = document.getElementById("grid");
const rooms = document.getElementById("rooms");
const building = document.getElementById("building");
const doors = document.getElementById("doors");
const windows = document.getElementById("windows");
const labels = document.getElementById("labels");

const jsonInput = document.getElementById("json-input");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const wallCountBadge = document.getElementById("wall-count-badge");
const errorBanner = document.getElementById("error-banner");
const cameraInfo = document.getElementById("camera-info");
const scaleVal = document.getElementById("scale-val");
const centerVal = document.getElementById("center-val");

const SVG_NS = "http://www.w3.org/2000/svg";

// State
let buildingData = null;
let rawJsonText = "";
let viewMode = "simple"; // "simple" (2D Lines), "plan" (2D Floorplan), "isometric" (2.5D)

// Camera State
let scale = 40; // Pixels per meter
let offsetX = window.innerWidth / 2 - 200; // Center offset X
let offsetY = window.innerHeight / 2 + 100; // Center offset Y
let heightScale = 25;

// ============================================================
// COORDINATE TRANSFORMATIONS (World -> Screen -> World)
// ============================================================

function worldToScreen(point) {
  return [
    offsetX + point[0] * scale,
    offsetY - point[1] * scale
  ];
}

function screenToWorld(pixel) {
  return [
    (pixel[0] - offsetX) / scale,
    (offsetY - pixel[1]) / scale
  ];
}

function heightToScreen(h) {
  return h * heightScale;
}

// ============================================================
// VECTOR MATH HELPERS
// ============================================================

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function multiply(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar];
}

function length(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function normalize(v) {
  const len = length(v);
  return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function getWallDirection(wall) {
  return normalize(subtract(wall.end, wall.start));
}

function getWallCorners(wall) {
  const thick = wall.thickness || 0.2;
  const dir = getWallDirection(wall);
  const perp = [-dir[1], dir[0]];
  const offset = multiply(perp, thick / 2);

  return {
    startLeft: add(wall.start, offset),
    endLeft: add(wall.end, offset),
    endRight: subtract(wall.end, offset),
    startRight: subtract(wall.start, offset)
  };
}

function findWall(wallId) {
  if (!buildingData || !buildingData.walls) return null;
  return buildingData.walls.find(w => w.id === wallId);
}

// ============================================================
// SVG CREATION HELPERS
// ============================================================

function createSVGElement(tag, attrs = {}, parent = null) {
  const elem = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    elem.setAttribute(key, val);
  }
  if (parent) parent.appendChild(elem);
  return elem;
}

function createLine(p1, p2, className, parent) {
  const line = createSVGElement("line", {
    x1: p1[0],
    y1: p1[1],
    x2: p2[0],
    y2: p2[1]
  }, parent);
  if (className) line.setAttribute("class", className);
  return line;
}

function createPolygon(points, className, parent) {
  const poly = createSVGElement("polygon", {
    points: points.map(p => `${p[0]},${p[1]}`).join(" ")
  }, parent);
  if (className) poly.setAttribute("class", className);
  return poly;
}

function createText(x, y, text, className, parent) {
  const elem = createSVGElement("text", {
    x: x,
    y: y
  }, parent);
  if (className) elem.setAttribute("class", className);
  elem.textContent = text;
  return elem;
}

function createPath(d, className, parent) {
  const path = createSVGElement("path", { d: d }, parent);
  if (className) path.setAttribute("class", className);
  return path;
}

// ============================================================
// GRID & COORDINATE LABELS
// ============================================================

function drawGrid() {
  grid.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Compute dynamic visible WORLD viewport bounds
  const topLeft = screenToWorld([0, 0]);
  const bottomRight = screenToWorld([width, height]);

  const minX = Math.floor(Math.min(topLeft[0], bottomRight[0])) - 1;
  const maxX = Math.ceil(Math.max(topLeft[0], bottomRight[0])) + 1;

  const minY = Math.floor(Math.min(topLeft[1], bottomRight[1])) - 1;
  const maxY = Math.ceil(Math.max(topLeft[1], bottomRight[1])) + 1;

  // Vertical grid lines
  for (let x = minX; x <= maxX; x++) {
    const isMajor = x % 5 === 0;
    const isAxis = x === 0;

    const p1 = worldToScreen([x, minY]);
    const p2 = worldToScreen([x, maxY]);

    const line = createLine(p1, p2, null, grid);
    line.setAttribute("class", isAxis ? "axis-y" : isMajor ? "grid-line-major" : "grid-line");

    // X-axis coordinate labels
    if (x % 5 === 0 && !isAxis) {
      const originY = worldToScreen([x, 0])[1];
      const labelText = createText(p1[0], originY + 14, `${x}m`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "middle");
    } else if (!isAxis && scale >= 30) {
      const originY = worldToScreen([x, 0])[1];
      const labelText = createText(p1[0], originY + 14, `${x}`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "middle");
    }
  }

  // Horizontal grid lines
  for (let y = minY; y <= maxY; y++) {
    const isMajor = y % 5 === 0;
    const isAxis = y === 0;

    const p1 = worldToScreen([minX, y]);
    const p2 = worldToScreen([maxX, y]);

    const line = createLine(p1, p2, null, grid);
    line.setAttribute("class", isAxis ? "axis-x" : isMajor ? "grid-line-major" : "grid-line");

    // Y-axis coordinate labels
    if (y % 5 === 0 && !isAxis) {
      const originX = worldToScreen([0, y])[0];
      const labelText = createText(originX - 8, p1[1] + 4, `${y}m`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "end");
    } else if (!isAxis && scale >= 30) {
      const originX = worldToScreen([0, y])[0];
      const labelText = createText(originX - 8, p1[1] + 4, `${y}`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "end");
    }
  }

  // Origin Marker (0,0)
  const originScreen = worldToScreen([0, 0]);
  const originText = createText(originScreen[0] - 8, originScreen[1] + 16, "(0,0)", "origin-label", grid);
  originText.setAttribute("text-anchor", "end");

  // Axis direction indicators
  const arrowX = worldToScreen([3, 0]);
  createText(arrowX[0] + 10, arrowX[1] + 4, "+X", "origin-label", grid);

  const arrowY = worldToScreen([0, 3]);
  createText(arrowY[0] - 14, arrowY[1] - 8, "+Y", "origin-label", grid);
}

// ============================================================
// ROOM GEOMETRY (Shoelace Area, Perimeter, Polygon Centroid)
// ============================================================

function calculateRoomArea(room) {
  let area = 0;
  const pts = room.boundary;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

function calculateRoomPerimeter(room) {
  let perimeter = 0;
  const pts = room.boundary;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

function calculateRoomCentroid(room) {
  const pts = room.boundary;
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
    // Fallback to vertex average if degenerate
    let avgX = 0, avgY = 0;
    for (const pt of pts) { avgX += pt[0]; avgY += pt[1]; }
    return [avgX / pts.length, avgY / pts.length];
  }

  return [
    cx / (6 * signedArea),
    cy / (6 * signedArea)
  ];
}

function drawRooms(data) {
  rooms.innerHTML = "";
  if (!data.rooms || viewMode === "simple") return;

  for (const room of data.rooms) {
    const screenPts = room.boundary.map(worldToScreen);
    createPolygon(screenPts, "room-plan", rooms);

    const centroid = calculateRoomCentroid(room);
    const centerScreen = worldToScreen(centroid);
    const area = calculateRoomArea(room);
    const perimeter = calculateRoomPerimeter(room);

    createText(centerScreen[0], centerScreen[1] - 4, room.name || room.id, "room-label", rooms);
    createText(centerScreen[0], centerScreen[1] + 14, `${area.toFixed(2)} m² • ${perimeter.toFixed(2)} m`, "room-info", rooms);
  }
}

// ============================================================
// WALL RENDERING
// ============================================================

function drawWallSimple(wall) {
  // Directly render line from start to end (Pure 2D SVG <line>)
  const p1 = worldToScreen(wall.start);
  const p2 = worldToScreen(wall.end);

  createLine(p1, p2, "wall-line-simple", building);

  // Endpoint circles
  createSVGElement("circle", { cx: p1[0], cy: p1[1], r: 4, fill: "#38bdf8" }, building);
  createSVGElement("circle", { cx: p2[0], cy: p2[1], r: 4, fill: "#38bdf8" }, building);

  // Wall ID and length label
  const wallVec = subtract(wall.end, wall.start);
  const wallLen = length(wallVec);
  const mid = [ (wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2 ];
  const midScreen = worldToScreen(mid);

  const labelStr = wall.id ? `${wall.id} (${wallLen.toFixed(1)}m)` : `${wallLen.toFixed(1)}m`;
  createText(midScreen[0], midScreen[1] - 10, labelStr, "wall-line-simple-label", building);
}

function drawWallPlan(wall) {
  // Render 2D top-down wall rectangle with thickness
  const corners = getWallCorners(wall);
  const polyPts = [
    worldToScreen(corners.startLeft),
    worldToScreen(corners.endLeft),
    worldToScreen(corners.endRight),
    worldToScreen(corners.startRight)
  ];

  createPolygon(polyPts, "wall-plan", building);

  // Centerline
  const p1 = worldToScreen(wall.start);
  const p2 = worldToScreen(wall.end);
  createLine(p1, p2, "wall-centerline", building);

  // Wall Label (ID, length, thickness)
  const mid = [ (wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2 ];
  const midScreen = worldToScreen(mid);
  const wallLen = length(subtract(wall.end, wall.start));
  const thick = wall.thickness || 0.2;
  createText(midScreen[0], midScreen[1] - thick * scale / 2 - 6, `${wall.id || 'wall'} • L=${wallLen.toFixed(1)}m • t=${thick}m`, "room-info", building);
}

function drawWallIsometric(wall) {
  // Extruded 2.5D view (Raised Wall)
  const corners = getWallCorners(wall);
  const bSL = worldToScreen(corners.startLeft);
  const bEL = worldToScreen(corners.endLeft);
  const bER = worldToScreen(corners.endRight);
  const bSR = worldToScreen(corners.startRight);

  const wallH = wall.height || 2.8;
  const h = heightToScreen(wallH);

  const tSL = [bSL[0], bSL[1] - h];
  const tEL = [bEL[0], bEL[1] - h];
  const tER = [bER[0], bER[1] - h];
  const tSR = [bSR[0], bSR[1] - h];

  // Polygons for front, side, top, other-side
  createPolygon([bSL, bEL, tEL, tSL], "wall-front", building);
  createPolygon([bEL, bER, tER, tEL], "wall-side", building);
  createPolygon([tSL, tEL, tER, tSR], "wall-top", building);
  createPolygon([bSR, bSL, tSL, tSR], "wall-side", building);

  // Midpoint & Wall Label (ID, length, height)
  const wallLen = length(subtract(wall.end, wall.start));
  const mid = [ (wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2 ];
  const midScreen = worldToScreen(mid);
  createText(midScreen[0], midScreen[1] - h - 8, `${wall.id || 'wall'} • ${wallLen.toFixed(1)}m long • ${wallH}m high`, "wall-label", building);
}

function drawWalls(data) {
  building.innerHTML = "";
  if (!data.walls) return;

  for (const wall of data.walls) {
    if (viewMode === "simple") {
      drawWallSimple(wall);
    } else if (viewMode === "plan") {
      drawWallPlan(wall);
    } else if (viewMode === "isometric") {
      drawWallIsometric(wall);
    }
  }
}

// ============================================================
// DOORS RENDERING
// ============================================================

function drawDoors(data) {
  doors.innerHTML = "";
  if (!data.doors || viewMode === "simple") return;

  for (const door of data.doors) {
    const wall = findWall(door.wallId);
    if (!wall) continue;

    const dir = getWallDirection(wall);
    const center = add(wall.start, multiply(dir, door.offset));
    const halfWidth = door.width / 2;

    const start = subtract(center, multiply(dir, halfWidth));
    const end = add(center, multiply(dir, halfWidth));

    const sScreen = worldToScreen(start);
    const eScreen = worldToScreen(end);

    if (viewMode === "plan") {
      // 2D Plan door swing
      createLine(sScreen, eScreen, "door-plan", doors);

      // Door panel swing line
      const perp = [-dir[1], dir[0]];
      const doorOpenPt = add(start, multiply(perp, door.width));
      const openScreen = worldToScreen(doorOpenPt);

      createLine(sScreen, openScreen, "door-plan", doors);

      // Arc
      const r = door.width * scale;
      const d = `M ${eScreen[0]} ${eScreen[1]} A ${r} ${r} 0 0 1 ${openScreen[0]} ${openScreen[1]}`;
      createPath(d, "door-arc", doors);

      const centerScreen = worldToScreen(center);
      createText(centerScreen[0], centerScreen[1] - 12, `${door.id || 'door'} (${door.width}m)`, "door-label", doors);
    } else if (viewMode === "isometric") {
      const h = heightToScreen(door.height || 2.1);
      const tStart = [sScreen[0], sScreen[1] - h];
      const tEnd = [eScreen[0], eScreen[1] - h];

      createPolygon([sScreen, eScreen, tEnd, tStart], "door-panel", doors);
      const centerScreen = worldToScreen(center);
      createText(centerScreen[0], centerScreen[1] - h - 6, `${door.id || 'door'} (${door.width}m)`, "door-label", doors);
    }
  }
}

// ============================================================
// WINDOWS RENDERING
// ============================================================

function drawWindows(data) {
  windows.innerHTML = "";
  if (!data.windows || viewMode === "simple") return;

  for (const win of data.windows) {
    const wall = findWall(win.wallId);
    if (!wall) continue;

    const dir = getWallDirection(wall);
    const center = add(wall.start, multiply(dir, win.offset));
    const halfWidth = win.width / 2;

    const start = subtract(center, multiply(dir, halfWidth));
    const end = add(center, multiply(dir, halfWidth));

    const sScreen = worldToScreen(start);
    const eScreen = worldToScreen(end);

    if (viewMode === "plan") {
      // 2D Plan window cutout
      const perp = [-dir[1], dir[0]];
      const thick = (wall.thickness || 0.2) * 1.2;
      const off = multiply(perp, thick / 2);

      const p1 = worldToScreen(add(start, off));
      const p2 = worldToScreen(add(end, off));
      const p3 = worldToScreen(subtract(end, off));
      const p4 = worldToScreen(subtract(start, off));

      createPolygon([p1, p2, p3, p4], "window-plan", windows);
      createLine(sScreen, eScreen, "window-plan", windows);

      const centerScreen = worldToScreen(center);
      createText(centerScreen[0], centerScreen[1] - 12, `${win.id || 'win'} (${win.width}m)`, "window-label", windows);
    } else if (viewMode === "isometric") {
      const bH = heightToScreen(win.sillHeight || 0.9);
      const wH = heightToScreen(win.height || 1.2);

      const bStart = [sScreen[0], sScreen[1] - bH];
      const bEnd = [eScreen[0], eScreen[1] - bH];
      const tStart = [sScreen[0], sScreen[1] - (bH + wH)];
      const tEnd = [eScreen[0], eScreen[1] - (bH + wH)];

      createPolygon([bStart, bEnd, tEnd, tStart], "window-glass", windows);
      const centerScreen = worldToScreen(center);
      createText(centerScreen[0], centerScreen[1] - (bH + wH) - 6, `${win.id || 'win'} (${win.width}m)`, "window-label", windows);
    }
  }
}

// ============================================================
// MAIN RENDER CONTROLLER
// ============================================================

function render() {
  if (!buildingData) return;

  drawGrid();
  drawRooms(buildingData);
  drawWalls(buildingData);
  drawDoors(buildingData);
  drawWindows(buildingData);

  updateCameraHUD();
}

function updateCameraHUD() {
  scaleVal.textContent = `${Math.round(scale)}px/m`;
  const centerWorld = screenToWorld([window.innerWidth / 2, window.innerHeight / 2]);
  centerVal.textContent = `${centerWorld[0].toFixed(1)}, ${centerWorld[1].toFixed(1)}`;

  if (buildingData && buildingData.walls) {
    wallCountBadge.textContent = `${buildingData.walls.length} walls`;
  }
}

// ============================================================
// ZOOM & PAN CONTROLS
// ============================================================

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.max(10, Math.min(300, scale * zoomFactor));

  // Zoom toward mouse pointer!
  const mouseScreen = [e.clientX, e.clientY];
  const mouseWorld = screenToWorld(mouseScreen);

  scale = newScale;

  offsetX = mouseScreen[0] - mouseWorld[0] * scale;
  offsetY = mouseScreen[1] + mouseWorld[1] * scale;

  render();
}, { passive: false });

let dragging = false;
let lastMouse = [0, 0];

canvas.addEventListener("mousedown", (e) => {
  dragging = true;
  lastMouse = [e.clientX, e.clientY];
});

canvas.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastMouse[0];
  const dy = e.clientY - lastMouse[1];

  offsetX += dx;
  offsetY += dy;

  lastMouse = [e.clientX, e.clientY];
  render();
});

canvas.addEventListener("mouseup", () => { dragging = false; });
canvas.addEventListener("mouseleave", () => { dragging = false; });

// Reset Camera / Fit View
function fitCamera() {
  if (!buildingData || !buildingData.walls || buildingData.walls.length === 0) {
    scale = 40;
    offsetX = window.innerWidth / 2;
    offsetY = window.innerHeight / 2;
    render();
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const wall of buildingData.walls) {
    minX = Math.min(minX, wall.start[0], wall.end[0]);
    maxX = Math.max(maxX, wall.start[0], wall.end[0]);
    minY = Math.min(minY, wall.start[1], wall.end[1]);
    maxY = Math.max(maxY, wall.start[1], wall.end[1]);
  }

  const padding = 2; // meters
  const widthM = (maxX - minX) + padding * 2;
  const heightM = (maxY - minY) + padding * 2;

  const canvasW = canvas.clientWidth || window.innerWidth;
  const canvasH = canvas.clientHeight || window.innerHeight;

  const scaleX = canvasW / widthM;
  const scaleY = canvasH / heightM;

  scale = Math.max(15, Math.min(100, Math.min(scaleX, scaleY)));

  const centerM = [ (minX + maxX) / 2, (minY + maxY) / 2 ];
  offsetX = canvasW / 2 - centerM[0] * scale;
  offsetY = canvasH / 2 + centerM[1] * scale;

  render();
}

document.getElementById("zoom-in-btn").addEventListener("click", () => {
  scale = Math.min(300, scale * 1.25);
  render();
});

document.getElementById("zoom-out-btn").addEventListener("click", () => {
  scale = Math.max(10, scale / 1.25);
  render();
});

document.getElementById("reset-cam-btn").addEventListener("click", fitCamera);

// Mode Toggle Buttons
const modeSimpleBtn = document.getElementById("mode-simple-btn");
const modePlanBtn = document.getElementById("mode-plan-btn");
const modeIsometricBtn = document.getElementById("mode-isometric-btn");

function setViewMode(mode) {
  viewMode = mode;
  modeSimpleBtn.classList.toggle("active", mode === "simple");
  modePlanBtn.classList.toggle("active", mode === "plan");
  modeIsometricBtn.classList.toggle("active", mode === "isometric");
  render();
}

modeSimpleBtn.addEventListener("click", () => setViewMode("simple"));
modePlanBtn.addEventListener("click", () => setViewMode("plan"));
modeIsometricBtn.addEventListener("click", () => setViewMode("isometric"));

// Editor Toggle
const toggleEditorBtn = document.getElementById("toggle-editor-btn");
const editorPanel = document.getElementById("editor-panel");

toggleEditorBtn.addEventListener("click", () => {
  editorPanel.classList.toggle("collapsed");
  toggleEditorBtn.classList.toggle("active", !editorPanel.classList.contains("collapsed"));
});

// ============================================================
// LIVE JSON INPUT & VALIDATION
// ============================================================

function handleJsonInput() {
  const text = jsonInput.value;

  // Run Validator
  let errors = [];
  if (typeof validateBuildingJSON === "function") {
    errors = validateBuildingJSON(text);
  } else {
    try { JSON.parse(text); } catch (e) { errors.push(e.message); }
  }

  if (errors.length > 0) {
    statusDot.classList.add("error");
    statusText.textContent = "Invalid JSON";
    errorBanner.style.display = "block";
    errorBanner.innerHTML = `<strong>JSON Error:</strong> ${errors[0]}`;
    return;
  }

  // Valid JSON!
  statusDot.classList.remove("error");
  statusText.textContent = "Valid JSON";
  errorBanner.style.display = "none";

  try {
    buildingData = JSON.parse(text);
    render();
  } catch (err) {
    console.error("Failed to parse JSON", err);
  }
}

jsonInput.addEventListener("input", handleJsonInput);

// Reset JSON to original building.json
document.getElementById("reset-json-btn").addEventListener("click", () => {
  jsonInput.value = rawJsonText;
  handleJsonInput();
});

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  try {
    const response = await fetch("building.json");
    if (!response.ok) throw new Error("Could not load building.json");

    rawJsonText = await response.text();
    jsonInput.value = rawJsonText;

    buildingData = JSON.parse(rawJsonText);

    // Initial positioning
    fitCamera();
  } catch (err) {
    console.error(err);
    errorBanner.style.display = "block";
    errorBanner.textContent = err.message;
  }
}

window.addEventListener("resize", render);

init();