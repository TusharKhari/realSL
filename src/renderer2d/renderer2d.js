import { drawGrid } from "./grid.js";
import { drawDimensions } from "./dimensions.js";

const SVG_NS = "http://www.w3.org/2000/svg";

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

export class Renderer2D {
  constructor(options = {}) {
    this.elements = options.elements || {};
    this.scale = options.scale ?? 45;
    this.offsetX = options.offsetX ?? (window.innerWidth / 2 - 200);
    this.offsetY = options.offsetY ?? (window.innerHeight / 2 + 100);
    this.heightScale = 30;

    this.viewMode = options.viewMode ?? "isometric"; // "simple", "plan", "isometric"
    this.showDimensions = options.showDimensions ?? true;
    this.activeLevelId = options.activeLevelId ?? null;
    this.selectedWallId = options.selectedWallId ?? null;
    this.tool = options.tool ?? "select";
  }

  worldToScreen(point) {
    return [
      this.offsetX + point[0] * this.scale,
      this.offsetY - point[1] * this.scale
    ];
  }

  screenToWorld(screenX, screenY) {
    return [
      (screenX - this.offsetX) / this.scale,
      (this.offsetY - screenY) / this.scale
    ];
  }

  heightToScreen(h) {
    return h * this.heightScale;
  }

  centerOnBuilding(building) {
    if (!building || building.getWalls().length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const wall of building.getWalls()) {
      minX = Math.min(minX, wall.start[0], wall.end[0]);
      maxX = Math.max(maxX, wall.start[0], wall.end[0]);
      minY = Math.min(minY, wall.start[1], wall.end[1]);
      maxY = Math.max(maxY, wall.start[1], wall.end[1]);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const buildingWidth = maxX - minX;
    const buildingHeight = maxY - minY;

    if (buildingWidth > 0 && buildingHeight > 0) {
      const scaleX = (width * 0.65) / buildingWidth;
      const scaleY = (height * 0.65) / buildingHeight;
      this.scale = Math.max(15, Math.min(scaleX, scaleY, 60));
    }

    this.offsetX = width / 2 - centerX * this.scale;
    this.offsetY = height / 2 + centerY * this.scale;
  }

  render(building) {
    if (!building) return;

    const w2s = pt => this.worldToScreen(pt);
    const s2w = (x, y) => this.screenToWorld(x, y);

    // 1. Grid
    if (this.elements.grid) {
      drawGrid(this.elements.grid, w2s, s2w, window.innerWidth, window.innerHeight);
    }

    // 2. Rooms
    if (this.elements.rooms) {
      this.elements.rooms.innerHTML = "";
      if (this.viewMode !== "simple") {
        const roomList = this.activeLevelId ? building.getRoomsForLevel(this.activeLevelId) : building.getRooms();
        for (const room of roomList) {
          const points = room.boundary.map(w2s);
          createPolygon(points, "room-plan", this.elements.rooms);

          const center = room.calculateCenter();
          const screen = w2s(center);
          createText(screen[0], screen[1] - 4, room.name || room.id, "room-label", this.elements.rooms);
          createText(screen[0], screen[1] + 14, `${room.calculateArea().toFixed(2)} m²`, "room-info", this.elements.rooms);
        }
      }
    }

    // 3. Stairs
    if (this.elements.buildingLayer) {
      const stairList = this.activeLevelId ? building.getStairsForLevel(this.activeLevelId) : building.getStairs();
      for (const stair of stairList) {
        const posScreen = w2s(stair.position);
        const widthPx = stair.width * this.scale;
        const stepDepth = 0.28;
        const totalDepthPx = stair.steps * stepDepth * this.scale;

        createElement("rect", {
          x: posScreen[0] - widthPx / 2,
          y: posScreen[1] - totalDepthPx,
          width: widthPx,
          height: totalDepthPx,
          fill: "rgba(148, 163, 184, 0.15)",
          stroke: "#94a3b8",
          "stroke-width": "1.5",
          "stroke-dasharray": "4 2"
        }, this.elements.buildingLayer);

        for (let i = 1; i < stair.steps; i++) {
          const stepY = posScreen[1] - i * stepDepth * this.scale;
          const line = createLine(
            [posScreen[0] - widthPx / 2, stepY],
            [posScreen[0] + widthPx / 2, stepY],
            "stair-tread",
            this.elements.buildingLayer
          );
          line.setAttribute("stroke", "#64748b");
          line.setAttribute("stroke-width", "1");
        }

        const label = createText(
          posScreen[0],
          posScreen[1] - totalDepthPx / 2,
          `STAIRS (${stair.steps} steps)`,
          "stair-label",
          this.elements.buildingLayer
        );
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#cbd5e1");
        label.setAttribute("font-size", "11px");
        label.setAttribute("font-weight", "600");
      }
    }

    // 4. Furniture
    if (this.elements.buildingLayer && this.viewMode !== "simple") {
      const furnitureList = this.activeLevelId ? building.getFurnitureForLevel(this.activeLevelId) : building.getFurniture();
      for (const item of furnitureList) {
        const posScreen = w2s(item.position);
        const w = (item.type === "sofa" ? 2 : item.type === "table" ? 1.5 : 1) * item.scale[0] * this.scale;
        const d = (item.type === "sofa" ? 0.9 : item.type === "table" ? 0.9 : 1) * item.scale[2] * this.scale;

        const group = createElement("g", {
          transform: `translate(${posScreen[0]}, ${posScreen[1]}) rotate(${-item.rotation})`
        }, this.elements.buildingLayer);

        createElement("rect", {
          x: -w / 2,
          y: -d / 2,
          width: w,
          height: d,
          rx: 3,
          ry: 3,
          fill: item.type === "sofa" ? "rgba(63, 111, 159, 0.4)" : item.type === "table" ? "rgba(139, 90, 43, 0.4)" : "rgba(119, 119, 119, 0.4)",
          stroke: item.type === "sofa" ? "#3f6f9f" : item.type === "table" ? "#8b5a2b" : "#777777",
          "stroke-width": "1.5"
        }, group);

        const label = createText(0, 4, item.id, "furniture-label", group);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#e2e8f0");
        label.setAttribute("font-size", "10px");
        label.setAttribute("font-weight", "600");
      }
    }

    // 5. Walls
    if (this.elements.buildingLayer) {
      const wallList = this.activeLevelId ? building.getWallsForLevel(this.activeLevelId) : building.getWalls();
      for (const wall of wallList) {
        this.drawWall(wall, w2s);
      }
    }

    // 6. Doors & Windows
    if (this.elements.doors && this.elements.windows && this.viewMode !== "simple") {
      this.elements.doors.innerHTML = "";
      this.elements.windows.innerHTML = "";

      for (const door of building.getDoors()) {
        const wall = door.getWall();
        if (!wall) continue;
        const center = door.getPosition();
        if (!center) continue;

        const direction = wall.getDirection();
        const halfWidth = door.width / 2;
        const start = [center[0] - direction[0] * halfWidth, center[1] - direction[1] * halfWidth];
        const end = [center[0] + direction[0] * halfWidth, center[1] + direction[1] * halfWidth];
        const startScreen = w2s(start);
        const endScreen = w2s(end);

        if (this.viewMode === "plan") {
          createLine(startScreen, endScreen, "door-plan", this.elements.doors);
          const hinge = startScreen;
          const doorLen = door.width * this.scale;
          const arcPath = createElement("path", {
            d: `M ${hinge[0]} ${hinge[1]} A ${doorLen} ${doorLen} 0 0 1 ${endScreen[0]} ${endScreen[1]}`,
            class: "door-arc"
          }, this.elements.doors);
        } else {
          const height = this.heightToScreen(door.height);
          createPolygon([
            startScreen,
            endScreen,
            [endScreen[0], endScreen[1] - height],
            [startScreen[0], startScreen[1] - height]
          ], "door-panel", this.elements.doors);
        }
      }

      for (const win of building.getWindows()) {
        const wall = win.getWall();
        if (!wall) continue;
        const center = win.getPosition();
        if (!center) continue;

        const direction = wall.getDirection();
        const halfWidth = win.width / 2;
        const start = [center[0] - direction[0] * halfWidth, center[1] - direction[1] * halfWidth];
        const end = [center[0] + direction[0] * halfWidth, center[1] + direction[1] * halfWidth];
        const startScreen = w2s(start);
        const endScreen = w2s(end);

        if (this.viewMode === "plan") {
          const perp = [-direction[1], direction[0]];
          const off = [perp[0] * wall.thickness / 2, perp[1] * wall.thickness / 2];
          const p1 = w2s([start[0] + off[0], start[1] + off[1]]);
          const p2 = w2s([end[0] + off[0], end[1] + off[1]]);
          const p3 = w2s([end[0] - off[0], end[1] - off[1]]);
          const p4 = w2s([start[0] - off[0], start[1] - off[1]]);

          createPolygon([p1, p2, p3, p4], "window-opening", this.elements.windows);
          createLine(startScreen, endScreen, "window-opening", this.elements.windows);
        } else {
          const sill = this.heightToScreen(win.sillHeight);
          const height = this.heightToScreen(win.height);

          createPolygon([
            [startScreen[0], startScreen[1] - sill],
            [endScreen[0], endScreen[1] - sill],
            [endScreen[0], endScreen[1] - sill - height],
            [startScreen[0], startScreen[1] - sill - height]
          ], "window-glass", this.elements.windows);
        }
      }
    }

    // 7. Dimensions
    if (this.elements.dimensionsLayer) {
      const wallList = this.activeLevelId ? building.getWallsForLevel(this.activeLevelId) : building.getWalls();
      drawDimensions(this.elements.dimensionsLayer, wallList, w2s, this.showDimensions);
    }
  }

  drawWall(wall, w2s) {
    const isSelected = wall.id === this.selectedWallId;

    if (this.viewMode === "simple") {
      const p1 = w2s(wall.start);
      const p2 = w2s(wall.end);
      const line = createLine(p1, p2, isSelected ? "wall-selected" : "wall-line-simple", this.elements.buildingLayer);
      line.style.cursor = (this.tool === "select" || this.tool === "move") ? "pointer" : "default";

      const midScreen = w2s(wall.getMidpoint());
      createText(midScreen[0], midScreen[1] - 10, `${wall.id} (${wall.getLength().toFixed(1)}m)`, "wall-label", this.elements.buildingLayer);
      return;
    }

    const direction = wall.getDirection();
    const perpendicular = [-direction[1], direction[0]];
    const offset = [perpendicular[0] * wall.thickness / 2, perpendicular[1] * wall.thickness / 2];

    const corners = {
      startLeft: [wall.start[0] + offset[0], wall.start[1] + offset[1]],
      endLeft: [wall.end[0] + offset[0], wall.end[1] + offset[1]],
      endRight: [wall.end[0] - offset[0], wall.end[1] - offset[1]],
      startRight: [wall.start[0] - offset[0], wall.start[1] - offset[1]]
    };

    if (this.viewMode === "plan") {
      const polyPts = [
        w2s(corners.startLeft),
        w2s(corners.endLeft),
        w2s(corners.endRight),
        w2s(corners.startRight)
      ];

      const poly = createPolygon(polyPts, isSelected ? "wall-selected" : "wall-plan", this.elements.buildingLayer);
      poly.style.cursor = (this.tool === "select" || this.tool === "move") ? "pointer" : "default";

      const p1 = w2s(wall.start);
      const p2 = w2s(wall.end);
      createLine(p1, p2, "wall-centerline", this.elements.buildingLayer);

      const midScreen = w2s(wall.getMidpoint());
      createText(midScreen[0], midScreen[1] - 12, `${wall.id} (${wall.getLength().toFixed(1)}m)`, "wall-label", this.elements.buildingLayer);
      return;
    }

    // 2.5D Isometric Mode
    const bSL = w2s(corners.startLeft);
    const bEL = w2s(corners.endLeft);
    const bER = w2s(corners.endRight);
    const bSR = w2s(corners.startRight);

    const height = this.heightToScreen(wall.height);

    const tSL = [bSL[0], bSL[1] - height];
    const tEL = [bEL[0], bEL[1] - height];
    const tER = [bER[0], bER[1] - height];
    const tSR = [bSR[0], bSR[1] - height];

    const frontCls = isSelected ? "wall-selected" : "wall-front";
    const sideCls = isSelected ? "wall-selected" : "wall-side";
    const topCls = isSelected ? "wall-selected" : "wall-top";

    const front = createPolygon([bSL, bEL, tEL, tSL], frontCls, this.elements.buildingLayer);
    createPolygon([bEL, bER, tER, tEL], sideCls, this.elements.buildingLayer);
    createPolygon([tSL, tEL, tER, tSR], topCls, this.elements.buildingLayer);
    createPolygon([bSR, bSL, tSL, tSR], sideCls, this.elements.buildingLayer);

    front.style.cursor = (this.tool === "select" || this.tool === "move") ? "pointer" : "default";

    const midpointScreen = w2s(wall.getMidpoint());
    createText(midpointScreen[0], midpointScreen[1] - height - 8, `${wall.id} • ${wall.getLength().toFixed(2)}m`, "wall-label", this.elements.buildingLayer);
  }
}
