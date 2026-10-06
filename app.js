import { Building } from "./model/Building.js";
import { validateBuildingJSON } from "./validator.js";
import { SnapManager } from "./editor/SnapManager.js";
import { Dimension } from "./model/Dimension.js";
import { distance } from "./model/Geometry.js";

// ============================================================
// DOM ELEMENTS
// ============================================================

const canvas = document.getElementById("canvas");
const grid = document.getElementById("grid");
const rooms = document.getElementById("rooms");
const buildingLayer = document.getElementById("building");
const doors = document.getElementById("doors");
const windows = document.getElementById("windows");
const dimensionsLayer = document.getElementById("dimensions");
const selectionLayer = document.getElementById("selection");
const newWallPreview = document.getElementById("new-wall-preview");
const snapIndicators = document.getElementById("snap-indicators");

const levelSelector = document.getElementById("level-selector");
const propertyContent = document.getElementById("property-content");
const jsonOutput = document.getElementById("json-output");
const status = document.getElementById("status");

// Snapping Checkboxes
const snapGridCb = document.getElementById("snap-grid-cb");
const snapEndpointsCb = document.getElementById("snap-endpoints-cb");
const snapIntersectionsCb = document.getElementById("snap-intersections-cb");
const snapAnglesCb = document.getElementById("snap-angles-cb");
const showDimensionsCb = document.getElementById("show-dimensions-cb");

const SVG_NS = "http://www.w3.org/2000/svg";

// ============================================================
// STATE & MANAGERS
// ============================================================

let building = null;
const snapManager = new SnapManager({ gridSize: 0.25, snapDistance: 0.35 });

let selectedWallId = null;
let activeLevelId = null; // Active floor level in 2D
let tool = "select"; // "select", "pan", "move", "new-wall"
let viewMode = "isometric"; // "simple", "plan", "isometric"

// Camera
let scale = 45;
let offsetX = window.innerWidth / 2 - 200;
let offsetY = window.innerHeight / 2 + 100;
const heightScale = 30;

// Drag State
let draggingWall = false;
let dragStartWorld = null;
let dragOriginalStart = null;
let dragOriginalEnd = null;

// Pan State
let panning = false;
let panStartX = 0;
let panStartY = 0;

// New Wall State
let newWallStart = null;
let currentSnapResult = null;

// ============================================================
// TRANSFORMATIONS (World <-> Screen)
// ============================================================

function worldToScreen(point) {
  return [
    offsetX + point[0] * scale,
    offsetY - point[1] * scale
  ];
}

function screenToWorld(screenX, screenY) {
  return [
    (screenX - offsetX) / scale,
    (offsetY - screenY) / scale
  ];
}

function heightToScreen(h) {
  return h * heightScale;
}

// ============================================================
// SVG HELPERS
// ============================================================

function createElement(type, attrs = {}, parent = null) {
  const elem = document.createElementNS(SVG_NS, type);
  for (const [k, v] of Object.entries(attrs)) {
    elem.setAttribute(k, v);
  }
  if (parent) parent.appendChild(elem);
  return elem;
}

function createPolygon(points, className, parent) {
  const poly = createElement("polygon", {
    points: points.map(p => `${p[0]},${p[1]}`).join(" ")
  }, parent);
  if (className) poly.setAttribute("class", className);
  return poly;
}

function createLine(p1, p2, className, parent) {
  const line = createElement("line", {
    x1: p1[0],
    y1: p1[1],
    x2: p2[0],
    y2: p2[1]
  }, parent);
  if (className) line.setAttribute("class", className);
  return line;
}

function createText(x, y, text, className, parent) {
  const elem = createElement("text", { x: x, y: y }, parent);
  if (className) elem.setAttribute("class", className);
  elem.textContent = text;
  return elem;
}

// ============================================================
// LEVEL SELECTOR POPULATION
// ============================================================

function populateLevelSelector() {
  levelSelector.innerHTML = "";
  if (!building) return;

  const levels = building.getLevels();
  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = `${level.id} (${level.elevation}m)`;
    levelSelector.appendChild(option);
  }

  if (levels.length > 0) {
    activeLevelId = levels[0].id;
    levelSelector.value = activeLevelId;
  }
}

levelSelector.addEventListener("change", () => {
  activeLevelId = levelSelector.value;
  clearSelection();
  render();
  updateStatus(`Active Level: ${activeLevelId}`);
});

// ============================================================
// GRID & AXES
// ============================================================

function drawGrid() {
  grid.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;

  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  const minX = Math.floor(Math.min(topLeft[0], bottomRight[0])) - 1;
  const maxX = Math.ceil(Math.max(topLeft[0], bottomRight[0])) + 1;
  const minY = Math.floor(Math.min(topLeft[1], bottomRight[1])) - 1;
  const maxY = Math.ceil(Math.max(topLeft[1], bottomRight[1])) + 1;

  for (let x = minX; x <= maxX; x++) {
    const isMajor = x % 5 === 0;
    const isAxis = x === 0;

    const p1 = worldToScreen([x, minY]);
    const p2 = worldToScreen([x, maxY]);

    const line = createLine(p1, p2, null, grid);
    line.setAttribute("class", isAxis ? "axis-y" : isMajor ? "grid-line-major" : "grid-line");

    if (x % 5 === 0 && !isAxis) {
      const originY = worldToScreen([x, 0])[1];
      const labelText = createText(p1[0], originY + 14, `${x}m`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "middle");
    }
  }

  for (let y = minY; y <= maxY; y++) {
    const isMajor = y % 5 === 0;
    const isAxis = y === 0;

    const p1 = worldToScreen([minX, y]);
    const p2 = worldToScreen([maxX, y]);

    const line = createLine(p1, p2, null, grid);
    line.setAttribute("class", isAxis ? "axis-x" : isMajor ? "grid-line-major" : "grid-line");

    if (y % 5 === 0 && !isAxis) {
      const originX = worldToScreen([0, y])[0];
      const labelText = createText(originX - 8, p1[1] + 4, `${y}m`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "end");
    }
  }

  const originScreen = worldToScreen([0, 0]);
  const originText = createText(originScreen[0] - 8, originScreen[1] + 16, "(0,0)", "origin-label", grid);
  originText.setAttribute("text-anchor", "end");
}

// ============================================================
// ROOMS RENDERING (Filtered by Active Level)
// ============================================================

function drawRooms() {
  rooms.innerHTML = "";
  if (!building || viewMode === "simple") return;

  const roomList = activeLevelId ? building.getRoomsForLevel(activeLevelId) : building.getRooms();

  for (const room of roomList) {
    const points = room.boundary.map(worldToScreen);
    createPolygon(points, "room-plan", rooms);

    const center = room.calculateCenter();
    const screen = worldToScreen(center);

    createText(screen[0], screen[1] - 4, room.name || room.id, "room-label", rooms);
    createText(screen[0], screen[1] + 14, `${room.calculateArea().toFixed(2)} m²`, "room-info", rooms);
  }
}

// ============================================================
// WALL RENDERING (Filtered by Active Level)
// ============================================================

function getWallCorners(wall) {
  const direction = wall.getDirection();
  const perpendicular = [-direction[1], direction[0]];
  const offset = [perpendicular[0] * wall.thickness / 2, perpendicular[1] * wall.thickness / 2];

  return {
    startLeft: [wall.start[0] + offset[0], wall.start[1] + offset[1]],
    endLeft: [wall.end[0] + offset[0], wall.end[1] + offset[1]],
    endRight: [wall.end[0] - offset[0], wall.end[1] - offset[1]],
    startRight: [wall.start[0] - offset[0], wall.start[1] - offset[1]]
  };
}

function drawWall(wall) {
  const isSelected = wall.id === selectedWallId;

  if (viewMode === "simple") {
    const p1 = worldToScreen(wall.start);
    const p2 = worldToScreen(wall.end);
    const line = createLine(p1, p2, isSelected ? "wall-selected" : "wall-line-simple", buildingLayer);
    line.style.cursor = (tool === "select" || tool === "move") ? "pointer" : "default";

    const midScreen = worldToScreen(wall.getMidpoint());
    createText(midScreen[0], midScreen[1] - 10, `${wall.id} (${wall.getLength().toFixed(1)}m)`, "wall-label", buildingLayer);
    return;
  }

  if (viewMode === "plan") {
    const corners = getWallCorners(wall);
    const polyPts = [
      worldToScreen(corners.startLeft),
      worldToScreen(corners.endLeft),
      worldToScreen(corners.endRight),
      worldToScreen(corners.startRight)
    ];

    const poly = createPolygon(polyPts, isSelected ? "wall-selected" : "wall-plan", buildingLayer);
    poly.style.cursor = (tool === "select" || tool === "move") ? "pointer" : "default";

    const p1 = worldToScreen(wall.start);
    const p2 = worldToScreen(wall.end);
    createLine(p1, p2, "wall-centerline", buildingLayer);

    const midScreen = worldToScreen(wall.getMidpoint());
    createText(midScreen[0], midScreen[1] - 12, `${wall.id} (${wall.getLength().toFixed(1)}m)`, "wall-label", buildingLayer);
    return;
  }

  // 2.5D Isometric Mode
  const corners = getWallCorners(wall);
  const bSL = worldToScreen(corners.startLeft);
  const bEL = worldToScreen(corners.endLeft);
  const bER = worldToScreen(corners.endRight);
  const bSR = worldToScreen(corners.startRight);

  const height = heightToScreen(wall.height);

  const tSL = [bSL[0], bSL[1] - height];
  const tEL = [bEL[0], bEL[1] - height];
  const tER = [bER[0], bER[1] - height];
  const tSR = [bSR[0], bSR[1] - height];

  const frontCls = isSelected ? "wall-selected" : "wall-front";
  const sideCls = isSelected ? "wall-selected" : "wall-side";
  const topCls = isSelected ? "wall-selected" : "wall-top";

  const front = createPolygon([bSL, bEL, tEL, tSL], frontCls, buildingLayer);
  const side = createPolygon([bEL, bER, tER, tEL], sideCls, buildingLayer);
  createPolygon([tSL, tEL, tER, tSR], topCls, buildingLayer);
  createPolygon([bSR, bSL, tSL, tSR], sideCls, buildingLayer);

  front.style.cursor = (tool === "select" || tool === "move") ? "pointer" : "default";

  const midpointScreen = worldToScreen(wall.getMidpoint());
  createText(midpointScreen[0], midpointScreen[1] - height - 8, `${wall.id} • ${wall.getLength().toFixed(2)}m`, "wall-label", buildingLayer);
}

function drawWalls() {
  buildingLayer.innerHTML = "";
  if (!building) return;

  const wallList = activeLevelId ? building.getWallsForLevel(activeLevelId) : building.getWalls();

  for (const wall of wallList) {
    drawWall(wall);
  }
}

// ============================================================
// DOORS & WINDOWS RENDERING (Filtered by Active Level)
// ============================================================

function drawDoors() {
  doors.innerHTML = "";
  if (!building || viewMode === "simple") return;

  const doorList = building.getDoors().filter(d => !activeLevelId || d.levelId === activeLevelId || d.getWall()?.levelId === activeLevelId);

  for (const door of doorList) {
    const wall = door.getWall();
    if (!wall) continue;

    const center = door.getPosition();
    if (!center) continue;

    const direction = wall.getDirection();
    const halfWidth = door.width / 2;

    const start = [center[0] - direction[0] * halfWidth, center[1] - direction[1] * halfWidth];
    const end = [center[0] + direction[0] * halfWidth, center[1] + direction[1] * halfWidth];

    const startScreen = worldToScreen(start);
    const endScreen = worldToScreen(end);

    if (viewMode === "plan") {
      createLine(startScreen, endScreen, "door-plan", doors);
      const perp = [-direction[1], direction[0]];
      const doorOpenPt = [start[0] + perp[0] * door.width, start[1] + perp[1] * door.width];
      const openScreen = worldToScreen(doorOpenPt);
      createLine(startScreen, openScreen, "door-plan", doors);

      const r = door.width * scale;
      const d = `M ${endScreen[0]} ${endScreen[1]} A ${r} ${r} 0 0 1 ${openScreen[0]} ${openScreen[1]}`;
      createElement("path", { d: d, class: "door-arc" }, doors);
    } else {
      const height = heightToScreen(door.height);
      createPolygon([startScreen, endScreen, [endScreen[0], endScreen[1] - height], [startScreen[0], startScreen[1] - height]], "door-panel", doors);
    }
  }
}

function drawWindows() {
  windows.innerHTML = "";
  if (!building || viewMode === "simple") return;

  const windowList = building.getWindows().filter(w => !activeLevelId || w.levelId === activeLevelId || w.getWall()?.levelId === activeLevelId);

  for (const window of windowList) {
    const wall = window.getWall();
    if (!wall) continue;

    const center = window.getPosition();
    if (!center) continue;

    const direction = wall.getDirection();
    const halfWidth = window.width / 2;

    const start = [center[0] - direction[0] * halfWidth, center[1] - direction[1] * halfWidth];
    const end = [center[0] + direction[0] * halfWidth, center[1] + direction[1] * halfWidth];

    const startScreen = worldToScreen(start);
    const endScreen = worldToScreen(end);

    if (viewMode === "plan") {
      const perp = [-direction[1], direction[0]];
      const thick = wall.thickness * 1.2;
      const off = [perp[0] * thick / 2, perp[1] * thick / 2];

      const p1 = worldToScreen([start[0] + off[0], start[1] + off[1]]);
      const p2 = worldToScreen([end[0] + off[0], end[1] + off[1]]);
      const p3 = worldToScreen([end[0] - off[0], end[1] - off[1]]);
      const p4 = worldToScreen([start[0] - off[0], start[1] - off[1]]);

      createPolygon([p1, p2, p3, p4], "window-opening", windows);
      createLine(startScreen, endScreen, "window-opening", windows);
    } else {
      const sill = heightToScreen(window.sillHeight);
      const height = heightToScreen(window.height);

      createPolygon([
        [startScreen[0], startScreen[1] - sill],
        [endScreen[0], endScreen[1] - sill],
        [endScreen[0], endScreen[1] - sill - height],
        [startScreen[0], startScreen[1] - sill - height]
      ], "window-glass", windows);
    }
  }
}

// ============================================================
// CAD DIMENSIONS RENDERING
// ============================================================

function drawDimensions() {
  dimensionsLayer.innerHTML = "";
  if (!showDimensionsCb.checked || !building) return;

  const wallList = activeLevelId ? building.getWallsForLevel(activeLevelId) : building.getWalls();

  for (const wall of wallList) {
    const dim = new Dimension(wall.start, wall.end, { offset: 0.7 });
    const pts = dim.getOffsetPoints();

    const pStartScreen = worldToScreen(pts.start);
    const pEndScreen = worldToScreen(pts.end);
    const dimStartScreen = worldToScreen(pts.dimStart);
    const dimEndScreen = worldToScreen(pts.dimEnd);

    createLine(pStartScreen, dimStartScreen, "dim-ext-line", dimensionsLayer);
    createLine(pEndScreen, dimEndScreen, "dim-ext-line", dimensionsLayer);
    createLine(dimStartScreen, dimEndScreen, "dim-line", dimensionsLayer);

    createElement("circle", { cx: dimStartScreen[0], cy: dimStartScreen[1], r: 3, class: "dim-arrow" }, dimensionsLayer);
    createElement("circle", { cx: dimEndScreen[0], cy: dimEndScreen[1], r: 3, class: "dim-arrow" }, dimensionsLayer);

    const labelX = (dimStartScreen[0] + dimEndScreen[0]) / 2;
    const labelY = (dimStartScreen[1] + dimEndScreen[1]) / 2 - 8;
    createText(labelX, labelY, dim.getLabel(), "dim-label", dimensionsLayer);
  }
}

// ============================================================
// SNAP INDICATORS RENDERING
// ============================================================

function drawSnapIndicators(snapResult, startWorld = null) {
  snapIndicators.innerHTML = "";
  if (!snapResult || !snapResult.type) return;

  const ptScreen = worldToScreen(snapResult.point);

  if (snapResult.type === "endpoint") {
    createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 7, class: "snap-marker-endpoint" }, snapIndicators);
    createText(ptScreen[0], ptScreen[1] - 12, "Endpoint", "snap-label", snapIndicators);
  } else if (snapResult.type === "intersection") {
    const r = 7;
    const pts = [
      [ptScreen[0], ptScreen[1] - r],
      [ptScreen[0] + r, ptScreen[1]],
      [ptScreen[0], ptScreen[1] + r],
      [ptScreen[0] - r, ptScreen[1]]
    ];
    createPolygon(pts, "snap-marker-intersection", snapIndicators);
    createText(ptScreen[0], ptScreen[1] - 12, "Intersection", "snap-label", snapIndicators);
  } else if (snapResult.type === "angle" && startWorld) {
    const startScreen = worldToScreen(startWorld);
    createLine(startScreen, ptScreen, "snap-angle-guide", snapIndicators);
    createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 5, class: "snap-marker-endpoint" }, snapIndicators);
    if (snapResult.label) {
      createText(ptScreen[0], ptScreen[1] - 12, snapResult.label, "snap-label", snapIndicators);
    }
  } else if (snapResult.type === "grid") {
    createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 4, class: "snap-marker-grid" }, snapIndicators);
  }
}

// ============================================================
// SELECTION & PROPERTY INSPECTOR
// ============================================================

function selectWall(id) {
  selectedWallId = id;
  updateProperties();
  updateStatus(`Selected ${id}`);
  render();
}

function clearSelection() {
  selectedWallId = null;
  updateProperties();
  render();
}

function updateProperties() {
  propertyContent.innerHTML = "";

  if (!selectedWallId) {
    propertyContent.textContent = "Nothing selected.";
    return;
  }

  const wall = building.getWall(selectedWallId);
  if (!wall) {
    propertyContent.textContent = "Wall not found.";
    return;
  }

  const title = document.createElement("div");
  title.innerHTML = `<strong style="font-size: 15px; color: var(--accent);">${wall.id}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${wall.levelId || 'no level'})</span>`;
  title.style.marginBottom = "10px";
  propertyContent.appendChild(title);

  addNumberInput("Start X", wall.start[0], value => {
    wall.start[0] = value;
    afterModelChange();
  });

  addNumberInput("Start Y", wall.start[1], value => {
    wall.start[1] = value;
    afterModelChange();
  });

  addNumberInput("End X", wall.end[0], value => {
    wall.end[0] = value;
    afterModelChange();
  });

  addNumberInput("End Y", wall.end[1], value => {
    wall.end[1] = value;
    afterModelChange();
  });

  addNumberInput("Length (m)", Number(wall.getLength().toFixed(3)), value => {
    if (value <= 0) return;
    wall.setLength(value);
    afterModelChange();
  });

  addNumberInput("Thickness (m)", wall.thickness, value => {
    if (value <= 0) return;
    wall.setThickness(value);
    afterModelChange();
  });

  addNumberInput("Height (m)", wall.height, value => {
    if (value <= 0) return;
    wall.setHeight(value);
    afterModelChange();
  });
}

function addNumberInput(label, value, onChange) {
  const row = document.createElement("div");
  row.className = "property-row";

  const labelElement = document.createElement("label");
  labelElement.textContent = label;

  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.05";
  input.value = value;

  input.addEventListener("change", () => {
    const number = Number(input.value);
    if (!Number.isFinite(number)) return;
    onChange(number);
  });

  row.appendChild(labelElement);
  row.appendChild(input);
  propertyContent.appendChild(row);
}

// ============================================================
// MODEL SYNC & EXPORT
// ============================================================

function afterModelChange() {
  updateProperties();
  updateJSON();
  render();
}

function updateJSON() {
  if (building) {
    jsonOutput.textContent = building.toJSONString();
  }
}

function updateStatus(message) {
  status.textContent = message;
}

// ============================================================
// HIT TESTING & MOUSE EVENTS
// ============================================================

function distancePointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(point[0] - start[0], 2) + Math.pow(point[1] - start[1], 2));
  }

  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const closest = [start[0] + t * dx, start[1] + t * dy];

  return Math.sqrt(Math.pow(point[0] - closest[0], 2) + Math.pow(point[1] - closest[1], 2));
}

function findWallAtPoint(worldPoint) {
  const tolerance = 14 / scale;
  let closestWall = null;
  let closestDistance = Infinity;

  const wallList = activeLevelId ? building.getWallsForLevel(activeLevelId) : building.getWalls();

  for (const wall of wallList) {
    const dist = distancePointToSegment(worldPoint, wall.start, wall.end);
    if (dist < tolerance && dist < closestDistance) {
      closestDistance = dist;
      closestWall = wall;
    }
  }

  return closestWall;
}

function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function querySnap(rawWorldPoint, startWorldPoint = null) {
  return snapManager.snap(rawWorldPoint, building, {
    grid: snapGridCb.checked,
    endpoints: snapEndpointsCb.checked,
    intersections: snapIntersectionsCb.checked,
    angles: snapAnglesCb.checked,
    startPoint: startWorldPoint
  });
}

canvas.addEventListener("mousedown", event => {
  const mouse = getMousePosition(event);
  const rawWorld = screenToWorld(mouse.x, mouse.y);

  if (tool === "pan") {
    panning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    return;
  }

  if (tool === "new-wall") {
    const snapResult = querySnap(rawWorld, newWallStart);
    const targetPoint = snapResult.point;

    if (!newWallStart) {
      newWallStart = targetPoint;
      updateStatus(`Click endpoint for new wall on ${activeLevelId || 'level'}`);
    } else {
      const newWall = building.addWall(newWallStart, targetPoint, 0.2, 2.8, activeLevelId);
      newWallStart = null;
      newWallPreview.innerHTML = "";
      snapIndicators.innerHTML = "";
      selectWall(newWall.id);
      updateStatus(`Created ${newWall.id} on ${activeLevelId || 'level'}`);
      afterModelChange();
    }
    return;
  }

  const wall = findWallAtPoint(rawWorld);

  if (!wall) {
    clearSelection();
    return;
  }

  selectWall(wall.id);

  if (tool === "move") {
    draggingWall = true;
    dragStartWorld = rawWorld;
    dragOriginalStart = [...wall.start];
    dragOriginalEnd = [...wall.end];
  }
});

canvas.addEventListener("mousemove", event => {
  const mouse = getMousePosition(event);
  const rawWorld = screenToWorld(mouse.x, mouse.y);

  if (panning) {
    offsetX += event.clientX - panStartX;
    offsetY += event.clientY - panStartY;
    panStartX = event.clientX;
    panStartY = event.clientY;
    render();
    return;
  }

  if (tool === "new-wall") {
    const snapResult = querySnap(rawWorld, newWallStart);
    currentSnapResult = snapResult;
    const targetPoint = snapResult.point;

    drawSnapIndicators(snapResult, newWallStart);

    if (newWallStart) {
      newWallPreview.innerHTML = "";
      const p1 = worldToScreen(newWallStart);
      const p2 = worldToScreen(targetPoint);

      createLine(p1, p2, "preview-line", newWallPreview);
      createElement("circle", { cx: p1[0], cy: p1[1], r: 5, class: "preview-circle" }, newWallPreview);
      createElement("circle", { cx: p2[0], cy: p2[1], r: 5, class: "preview-circle" }, newWallPreview);

      const len = distance(newWallStart, targetPoint);
      const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 12];
      createText(mid[0], mid[1], `${len.toFixed(2)} m`, "dim-label", newWallPreview);
    }
    return;
  }

  if (draggingWall && selectedWallId) {
    const snapResult = querySnap(rawWorld);
    const targetWorld = snapResult.point;
    drawSnapIndicators(snapResult);

    const wall = building.getWall(selectedWallId);
    if (!wall) return;

    const dx = targetWorld[0] - dragStartWorld[0];
    const dy = targetWorld[1] - dragStartWorld[1];

    wall.start = [dragOriginalStart[0] + dx, dragOriginalStart[1] + dy];
    wall.end = [dragOriginalEnd[0] + dx, dragOriginalEnd[1] + dy];

    afterModelChange();
  }
});

canvas.addEventListener("mouseup", () => {
  draggingWall = false;
  panning = false;
  snapIndicators.innerHTML = "";
});

canvas.addEventListener("mouseleave", () => {
  draggingWall = false;
  panning = false;
  snapIndicators.innerHTML = "";
});

// WHEEL ZOOM
canvas.addEventListener("wheel", event => {
  event.preventDefault();
  const mouse = getMousePosition(event);
  const worldBefore = screenToWorld(mouse.x, mouse.y);

  const factor = event.deltaY < 0 ? 1.15 : 0.85;
  scale = Math.max(10, Math.min(300, scale * factor));

  offsetX = mouse.x - worldBefore[0] * scale;
  offsetY = mouse.y + worldBefore[1] * scale;

  render();
}, { passive: false });

// TOOLBAR & VIEW SWITCHER
function setTool(nextTool) {
  tool = nextTool;
  newWallStart = null;
  newWallPreview.innerHTML = "";
  snapIndicators.innerHTML = "";
  draggingWall = false;

  document.querySelectorAll("#toolbar button").forEach(b => {
    if (b.id.endsWith("-tool")) b.classList.remove("active");
  });

  const button = document.getElementById(`${nextTool}-tool`);
  if (button) button.classList.add("active");

  canvas.className = "";
  if (nextTool === "pan") canvas.classList.add("pan-mode");
  if (nextTool === "move") canvas.classList.add("move-mode");
  if (nextTool === "new-wall") canvas.classList.add("crosshair-mode");

  updateStatus(`Tool: ${nextTool.toUpperCase()}`);
  render();
}

document.getElementById("select-tool").addEventListener("click", () => setTool("select"));
document.getElementById("pan-tool").addEventListener("click", () => setTool("pan"));
document.getElementById("move-tool").addEventListener("click", () => setTool("move"));
document.getElementById("new-wall-tool").addEventListener("click", () => setTool("new-wall"));

document.getElementById("delete-tool").addEventListener("click", () => {
  if (!selectedWallId) {
    updateStatus("Select a wall first to delete.");
    return;
  }
  const id = selectedWallId;
  building.deleteWall(id);
  selectedWallId = null;
  updateStatus(`Deleted ${id}`);
  afterModelChange();
});

[snapGridCb, snapEndpointsCb, snapIntersectionsCb, snapAnglesCb, showDimensionsCb].forEach(cb => {
  cb.addEventListener("change", render);
});

// Mode switchers
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

// ============================================================
// RENDER & INITIALIZATION
// ============================================================

function render() {
  if (!building) return;

  drawGrid();
  drawRooms();
  drawWalls();
  drawDoors();
  drawWindows();
  drawDimensions();
  updateJSON();
}

async function loadBuilding() {
  try {
    const response = await fetch("./building.json");
    if (!response.ok) throw new Error("Could not load building.json");

    const jsonText = await response.text();
    const errors = validateBuildingJSON(jsonText);

    if (errors.length > 0) {
      updateStatus(`Validation error in building.json`);
      return;
    }

    const data = JSON.parse(jsonText);
    building = new Building(data);

    populateLevelSelector();
    updateStatus(`Multi-Level Building Model Loaded (${building.getLevels().length} levels)`);
    render();
  } catch (err) {
    console.error(err);
    updateStatus(`Error: ${err.message}`);
  }
}

window.addEventListener("resize", render);
loadBuilding();