// ============================================================
// BUILDING RENDERER (MODEL-DRIVEN ES MODULE)
// ============================================================

import { Building } from "./model/Building.js";

const canvas = document.getElementById("canvas");
const grid = document.getElementById("grid");
const rooms = document.getElementById("rooms");
const buildingLayer = document.getElementById("building");
const doors = document.getElementById("doors");
const windows = document.getElementById("windows");

const jsonInput = document.getElementById("json-input");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const wallCountBadge = document.getElementById("wall-count-badge");
const errorBanner = document.getElementById("error-banner");
const scaleVal = document.getElementById("scale-val");
const centerVal = document.getElementById("center-val");

const SVG_NS = "http://www.w3.org/2000/svg";

// State
let building = null; // Building model instance
let rawJsonText = "";
let viewMode = "simple"; // "simple", "plan", "isometric"

// Camera State
let scale = 40;
let offsetX = window.innerWidth / 2 - 200;
let offsetY = window.innerHeight / 2 + 100;
let heightScale = 25;

// ============================================================
// COORDINATE TRANSFORMATIONS (World <-> Screen)
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
// SVG HELPERS
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
// GRID & AXES LABELS
// ============================================================

function drawGrid() {
  grid.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;

  const topLeft = screenToWorld([0, 0]);
  const bottomRight = screenToWorld([width, height]);

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
    } else if (!isAxis && scale >= 30) {
      const originY = worldToScreen([x, 0])[1];
      const labelText = createText(p1[0], originY + 14, `${x}`, "axis-label", grid);
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
    } else if (!isAxis && scale >= 30) {
      const originX = worldToScreen([0, y])[0];
      const labelText = createText(originX - 8, p1[1] + 4, `${y}`, "axis-label", grid);
      labelText.setAttribute("text-anchor", "end");
    }
  }

  const originScreen = worldToScreen([0, 0]);
  const originText = createText(originScreen[0] - 8, originScreen[1] + 16, "(0,0)", "origin-label", grid);
  originText.setAttribute("text-anchor", "end");

  const arrowX = worldToScreen([3, 0]);
  createText(arrowX[0] + 10, arrowX[1] + 4, "+X", "origin-label", grid);

  const arrowY = worldToScreen([0, 3]);
  createText(arrowY[0] - 14, arrowY[1] - 8, "+Y", "origin-label", grid);
}

// ============================================================
// ROOMS RENDERING (Model Driven)
// ============================================================

function drawRooms() {
  rooms.innerHTML = "";
  if (!building || viewMode === "simple") return;

  for (const room of building.getRooms()) {
    const screenPts = room.boundary.map(worldToScreen);
    createPolygon(screenPts, "room-plan", rooms);

    const center = room.calculateCenter();
    const centerScreen = worldToScreen(center);
    const area = room.calculateArea();
    const perimeter = room.calculatePerimeter();

    createText(centerScreen[0], centerScreen[1] - 4, room.name || room.id, "room-label", rooms);
    createText(centerScreen[0], centerScreen[1] + 14, `${area.toFixed(2)} m² • ${perimeter.toFixed(2)} m`, "room-info", rooms);
  }
}

// ============================================================
// WALL RENDERING (Model Driven)
// ============================================================

function drawWallSimple(wall) {
  const p1 = worldToScreen(wall.start);
  const p2 = worldToScreen(wall.end);

  createLine(p1, p2, "wall-line-simple", buildingLayer);

  createSVGElement("circle", { cx: p1[0], cy: p1[1], r: 4, fill: "#38bdf8" }, buildingLayer);
  createSVGElement("circle", { cx: p2[0], cy: p2[1], r: 4, fill: "#38bdf8" }, buildingLayer);

  const wallLen = wall.getLength();
  const midScreen = worldToScreen(wall.getMidpoint());
  const labelStr = `${wall.id || 'wall'} (${wallLen.toFixed(1)}m)`;
  createText(midScreen[0], midScreen[1] - 10, labelStr, "wall-line-simple-label", buildingLayer);
}

function drawWallPlan(wall) {
  const dir = wall.getDirection();
  const perp = [-dir[1], dir[0]];
  const offset = [perp[0] * wall.thickness / 2, perp[1] * wall.thickness / 2];

  const startLeft = [wall.start[0] + offset[0], wall.start[1] + offset[1]];
  const endLeft = [wall.end[0] + offset[0], wall.end[1] + offset[1]];
  const endRight = [wall.end[0] - offset[0], wall.end[1] - offset[1]];
  const startRight = [wall.start[0] - offset[0], wall.start[1] - offset[1]];

  const polyPts = [
    worldToScreen(startLeft),
    worldToScreen(endLeft),
    worldToScreen(endRight),
    worldToScreen(startRight)
  ];

  createPolygon(polyPts, "wall-plan", buildingLayer);

  const p1 = worldToScreen(wall.start);
  const p2 = worldToScreen(wall.end);
  createLine(p1, p2, "wall-centerline", buildingLayer);

  const midScreen = worldToScreen(wall.getMidpoint());
  const wallLen = wall.getLength();
  createText(midScreen[0], midScreen[1] - wall.thickness * scale / 2 - 6, `${wall.id || 'wall'} • L=${wallLen.toFixed(1)}m • t=${wall.thickness}m`, "room-info", buildingLayer);
}

function drawWallIsometric(wall) {
  const dir = wall.getDirection();
  const perp = [-dir[1], dir[0]];
  const offset = [perp[0] * wall.thickness / 2, perp[1] * wall.thickness / 2];

  const startLeft = [wall.start[0] + offset[0], wall.start[1] + offset[1]];
  const endLeft = [wall.end[0] + offset[0], wall.end[1] + offset[1]];
  const endRight = [wall.end[0] - offset[0], wall.end[1] - offset[1]];
  const startRight = [wall.start[0] - offset[0], wall.start[1] - offset[1]];

  const bSL = worldToScreen(startLeft);
  const bEL = worldToScreen(endLeft);
  const bER = worldToScreen(endRight);
  const bSR = worldToScreen(startRight);

  const h = heightToScreen(wall.height);

  const tSL = [bSL[0], bSL[1] - h];
  const tEL = [bEL[0], bEL[1] - h];
  const tER = [bER[0], bER[1] - h];
  const tSR = [bSR[0], bSR[1] - h];

  createPolygon([bSL, bEL, tEL, tSL], "wall-front", buildingLayer);
  createPolygon([bEL, bER, tER, tEL], "wall-side", buildingLayer);
  createPolygon([tSL, tEL, tER, tSR], "wall-top", buildingLayer);
  createPolygon([bSR, bSL, tSL, tSR], "wall-side", buildingLayer);

  const wallLen = wall.getLength();
  const midScreen = worldToScreen(wall.getMidpoint());
  createText(midScreen[0], midScreen[1] - h - 8, `${wall.id || 'wall'} • ${wallLen.toFixed(1)}m long • ${wall.height}m high`, "wall-label", buildingLayer);
}

function drawWalls() {
  buildingLayer.innerHTML = "";
  if (!building) return;

  for (const wall of building.getWalls()) {
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
// DOORS RENDERING (Model Driven)
// ============================================================

function drawDoor(door) {
  const wall = door.getWall();
  if (!wall) return;

  const dir = wall.getDirection();
  const center = door.getPosition();
  if (!center) return;

  const halfWidth = door.width / 2;
  const start = [center[0] - dir[0] * halfWidth, center[1] - dir[1] * halfWidth];
  const end = [center[0] + dir[0] * halfWidth, center[1] + dir[1] * halfWidth];

  const sScreen = worldToScreen(start);
  const eScreen = worldToScreen(end);

  if (viewMode === "plan") {
    createLine(sScreen, eScreen, "door-plan", doors);

    const perp = [-dir[1], dir[0]];
    const doorOpenPt = [start[0] + perp[0] * door.width, start[1] + perp[1] * door.width];
    const openScreen = worldToScreen(doorOpenPt);

    createLine(sScreen, openScreen, "door-plan", doors);

    const r = door.width * scale;
    const d = `M ${eScreen[0]} ${eScreen[1]} A ${r} ${r} 0 0 1 ${openScreen[0]} ${openScreen[1]}`;
    createPath(d, "door-arc", doors);

    const centerScreen = worldToScreen(center);
    createText(centerScreen[0], centerScreen[1] - 12, `${door.id || 'door'} • ${door.width}m`, "door-label", doors);
  } else if (viewMode === "isometric") {
    const h = heightToScreen(door.height);
    const tStart = [sScreen[0], sScreen[1] - h];
    const tEnd = [eScreen[0], eScreen[1] - h];

    createPolygon([sScreen, eScreen, tEnd, tStart], "door-panel", doors);
    const centerScreen = worldToScreen(center);
    createText(centerScreen[0], centerScreen[1] - h - 6, `${door.id || 'door'} • ${door.width}m`, "door-label", doors);
  }
}

function drawDoors() {
  doors.innerHTML = "";
  if (!building || viewMode === "simple") return;

  for (const door of building.getDoors()) {
    drawDoor(door);
  }
}

// ============================================================
// WINDOWS RENDERING (Model Driven)
// ============================================================

function drawWindow(win) {
  const wall = win.getWall();
  if (!wall) return;

  const dir = wall.getDirection();
  const center = win.getPosition();
  if (!center) return;

  const halfWidth = win.width / 2;
  const start = [center[0] - dir[0] * halfWidth, center[1] - dir[1] * halfWidth];
  const end = [center[0] + dir[0] * halfWidth, center[1] + dir[1] * halfWidth];

  const sScreen = worldToScreen(start);
  const eScreen = worldToScreen(end);

  if (viewMode === "plan") {
    const perp = [-dir[1], dir[0]];
    const thick = wall.thickness * 1.2;
    const off = [perp[0] * thick / 2, perp[1] * thick / 2];

    const p1 = worldToScreen([start[0] + off[0], start[1] + off[1]]);
    const p2 = worldToScreen([end[0] + off[0], end[1] + off[1]]);
    const p3 = worldToScreen([end[0] - off[0], end[1] - off[1]]);
    const p4 = worldToScreen([start[0] - off[0], start[1] - off[1]]);

    createPolygon([p1, p2, p3, p4], "window-plan", windows);
    createLine(sScreen, eScreen, "window-plan", windows);

    const centerScreen = worldToScreen(center);
    createText(centerScreen[0], centerScreen[1] - 12, `${win.id || 'win'} • ${win.width}m`, "window-label", windows);
  } else if (viewMode === "isometric") {
    const bH = heightToScreen(win.sillHeight);
    const wH = heightToScreen(win.height);

    const bStart = [sScreen[0], sScreen[1] - bH];
    const bEnd = [eScreen[0], eScreen[1] - bH];
    const tStart = [sScreen[0], sScreen[1] - (bH + wH)];
    const tEnd = [eScreen[0], eScreen[1] - (bH + wH)];

    createPolygon([bStart, bEnd, tEnd, tStart], "window-glass", windows);
    const centerScreen = worldToScreen(center);
    createText(centerScreen[0], centerScreen[1] - (bH + wH) - 6, `${win.id || 'win'} • ${win.width}m × ${win.height}m`, "window-label", windows);
  }
}

function drawWindows() {
  windows.innerHTML = "";
  if (!building || viewMode === "simple") return;

  for (const win of building.getWindows()) {
    drawWindow(win);
  }
}

// ============================================================
// MAIN RENDER CONTROLLER
// ============================================================

function render() {
  if (!building) return;

  drawGrid();
  drawRooms();
  drawWalls();
  drawDoors();
  drawWindows();

  updateCameraHUD();
}

function updateCameraHUD() {
  scaleVal.textContent = `${Math.round(scale)}px/m`;
  const centerWorld = screenToWorld([window.innerWidth / 2, window.innerHeight / 2]);
  centerVal.textContent = `${centerWorld[0].toFixed(1)}, ${centerWorld[1].toFixed(1)}`;

  if (building && building.getWalls()) {
    wallCountBadge.textContent = `${building.getWalls().length} walls`;
  }
}

// ============================================================
// CAMERA INTERACTION (Zoom & Pan)
// ============================================================

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.max(10, Math.min(300, scale * zoomFactor));

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

function fitCamera() {
  if (!building || !building.getWalls() || building.getWalls().length === 0) {
    scale = 40;
    offsetX = window.innerWidth / 2;
    offsetY = window.innerHeight / 2;
    render();
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const wall of building.getWalls()) {
    minX = Math.min(minX, wall.start[0], wall.end[0]);
    maxX = Math.max(maxX, wall.start[0], wall.end[0]);
    minY = Math.min(minY, wall.start[1], wall.end[1]);
    maxY = Math.max(maxY, wall.start[1], wall.end[1]);
  }

  const padding = 2;
  const widthM = (maxX - minX) + padding * 2;
  const heightM = (maxY - minY) + padding * 2;

  const canvasW = canvas.clientWidth || window.innerWidth;
  const canvasH = canvas.clientHeight || window.innerHeight;

  const scaleX = canvasW / widthM;
  const scaleY = canvasH / heightM;

  scale = Math.max(15, Math.min(100, Math.min(scaleX, scaleY)));

  const centerM = [(minX + maxX) / 2, (minY + maxY) / 2];
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
// LIVE JSON EDITING & VALIDATION PIPELINE
// ============================================================

function handleJsonInput() {
  const text = jsonInput.value;

  // 1. Validate raw text before constructing Building model
  let errors = [];
  if (typeof window.validateBuildingJSON === "function") {
    errors = window.validateBuildingJSON(text);
  } else {
    try { JSON.parse(text); } catch (e) { errors.push(e.message); }
  }

  if (errors.length > 0) {
    statusDot.classList.add("error");
    statusText.textContent = "Invalid JSON";
    errorBanner.style.display = "block";
    errorBanner.innerHTML = `<strong>Validation Error:</strong> ${errors[0]}`;
    return;
  }

  // 2. Valid JSON -> Parse & Instantiate Building Model
  statusDot.classList.remove("error");
  statusText.textContent = "Valid JSON";
  errorBanner.style.display = "none";

  try {
    const data = JSON.parse(text);
    building = new Building(data);
    render();
  } catch (err) {
    console.error("Failed to construct Building model:", err);
  }
}

jsonInput.addEventListener("input", handleJsonInput);

document.getElementById("reset-json-btn").addEventListener("click", () => {
  jsonInput.value = rawJsonText;
  handleJsonInput();
});

// ============================================================
// INITIALIZATION PIPELINE
// ============================================================

async function loadBuilding() {
  try {
    const response = await fetch("building.json");
    if (!response.ok) throw new Error("Could not load building.json");

    rawJsonText = await response.text();
    jsonInput.value = rawJsonText;

    // Validate raw text
    let errors = [];
    if (typeof window.validateBuildingJSON === "function") {
      errors = window.validateBuildingJSON(rawJsonText);
    }

    if (errors.length > 0) {
      statusDot.classList.add("error");
      statusText.textContent = "Invalid JSON";
      errorBanner.style.display = "block";
      errorBanner.innerHTML = `<strong>Validation Error:</strong> ${errors[0]}`;
      return;
    }

    const data = JSON.parse(rawJsonText);

    // Architectural boundary: JSON -> Building Model instance
    building = new Building(data);

    console.log("Building model instantiated:", building);
    console.log("Wall-1 model query:", building.getWall("wall-1"));
    console.log("Doors on wall-1:", building.getDoorsForWall("wall-1"));
    console.log("Living Room area calculation:", building.calculateRoomArea("room-1"));

    fitCamera();
  } catch (err) {
    console.error(err);
    errorBanner.style.display = "block";
    errorBanner.textContent = err.message;
  }
}

window.addEventListener("resize", render);

loadBuilding();