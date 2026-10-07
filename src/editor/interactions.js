import { distancePointToSegment } from "../geometry/lines.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function createElement(type, attrs = {}, parent = null) {
  const elem = document.createElementNS(SVG_NS, type);
  for (const [k, v] of Object.entries(attrs)) {
    elem.setAttribute(k, v);
  }
  if (parent) parent.appendChild(elem);
  return elem;
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

function createPolygon(points, className, parent) {
  const poly = createElement("polygon", {
    points: points.map(p => `${p[0]},${p[1]}`).join(" ")
  }, parent);
  if (className) poly.setAttribute("class", className);
  return poly;
}

function createText(x, y, text, className, parent) {
  const elem = createElement("text", { x: x, y: y }, parent);
  if (className) elem.setAttribute("class", className);
  elem.textContent = text;
  return elem;
}

export class InteractionController {
  constructor({
    canvas,
    snapIndicators,
    newWallPreview,
    renderer2D,
    snapManager,
    selectionManager,
    onModelChanged,
    onStatusChange
  }) {
    this.canvas = canvas;
    this.snapIndicators = snapIndicators;
    this.newWallPreview = newWallPreview;
    this.renderer2D = renderer2D;
    this.snapManager = snapManager;
    this.selectionManager = selectionManager;
    this.onModelChanged = onModelChanged;
    this.onStatusChange = onStatusChange;

    this.tool = "select"; // "select", "pan", "move", "new-wall"
    this.snappingOptions = {
      grid: true,
      endpoints: true,
      intersections: true,
      angles: true
    };

    // Drag State
    this.draggingWall = false;
    this.dragStartWorld = null;
    this.dragOriginalStart = null;
    this.dragOriginalEnd = null;

    // Pan State
    this.panning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // New Wall State
    this.newWallStart = null;
    this.currentSnapResult = null;

    this.bindEvents();
  }

  setTool(newTool) {
    this.tool = newTool;
    this.renderer2D.tool = newTool;
    this.canvas.className = newTool === "pan" ? "pan-mode" : newTool === "move" ? "move-mode" : newTool === "new-wall" ? "crosshair-mode" : "";
    if (newTool !== "new-wall") {
      this.newWallStart = null;
      this.clearPreviews();
    }
  }

  bindEvents() {
    this.canvas.addEventListener("mousedown", e => this.handleMouseDown(e));
    window.addEventListener("mousemove", e => this.handleMouseMove(e));
    window.addEventListener("mouseup", () => this.handleMouseUp());
  }

  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  findWallAtPoint(worldPoint, building) {
    const tolerance = 14 / this.renderer2D.scale;
    let closestWall = null;
    let closestDistance = Infinity;

    const wallList = this.renderer2D.activeLevelId
      ? building.getWallsForLevel(this.renderer2D.activeLevelId)
      : building.getWalls();

    for (const wall of wallList) {
      const dist = distancePointToSegment(worldPoint, wall.start, wall.end);
      if (dist < tolerance && dist < closestDistance) {
        closestDistance = dist;
        closestWall = wall;
      }
    }

    return closestWall;
  }

  handleMouseDown(e) {
    if (!this.building) return;
    const mouse = this.getMousePosition(e);
    const rawWorld = this.renderer2D.screenToWorld(mouse.x, mouse.y);

    if (this.tool === "pan" || e.button === 1 || e.spaceKey) {
      this.panning = true;
      this.panStartX = mouse.x - this.renderer2D.offsetX;
      this.panStartY = mouse.y - this.renderer2D.offsetY;
      this.canvas.classList.add("pan-mode");
      return;
    }

    if (this.tool === "select") {
      const clickedWall = this.findWallAtPoint(rawWorld, this.building);
      if (clickedWall) {
        this.selectionManager.selectWall(clickedWall.id, this.building);
        this.renderer2D.selectedWallId = clickedWall.id;
      } else {
        this.selectionManager.clearSelection(this.building);
        this.renderer2D.selectedWallId = null;
      }
      this.notifyChanged();
      return;
    }

    if (this.tool === "move") {
      const clickedWall = this.findWallAtPoint(rawWorld, this.building);
      if (clickedWall) {
        this.selectionManager.selectWall(clickedWall.id, this.building);
        this.renderer2D.selectedWallId = clickedWall.id;
        this.draggingWall = true;
        this.dragStartWorld = rawWorld;
        this.dragOriginalStart = [...clickedWall.start];
        this.dragOriginalEnd = [...clickedWall.end];
        this.notifyChanged();
      }
      return;
    }

    if (this.tool === "new-wall") {
      const snapResult = this.snapManager.snap(rawWorld, this.building, {
        ...this.snappingOptions,
        startPoint: this.newWallStart
      });

      const snappedPoint = snapResult.point;

      if (!this.newWallStart) {
        this.newWallStart = snappedPoint;
        if (this.onStatusChange) this.onStatusChange(`Wall Start Point: (${snappedPoint[0].toFixed(2)}, ${snappedPoint[1].toFixed(2)})`);
      } else {
        const addedWall = this.building.addWall(
          this.newWallStart,
          snappedPoint,
          0.2,
          2.8,
          this.renderer2D.activeLevelId
        );
        this.selectionManager.selectWall(addedWall.id, this.building);
        this.renderer2D.selectedWallId = addedWall.id;
        this.newWallStart = snappedPoint; // Continuous drawing
        this.notifyChanged();
      }
    }
  }

  handleMouseMove(e) {
    if (this.panning) {
      const mouse = this.getMousePosition(e);
      this.renderer2D.offsetX = mouse.x - this.panStartX;
      this.renderer2D.offsetY = mouse.y - this.panStartY;
      this.notifyChanged();
      return;
    }

    if (!this.building) return;
    const mouse = this.getMousePosition(e);
    const rawWorld = this.renderer2D.screenToWorld(mouse.x, mouse.y);

    if (this.draggingWall && this.selectionManager.selectedWallId) {
      const wall = this.building.getWall(this.selectionManager.selectedWallId);
      if (wall) {
        const dx = rawWorld[0] - this.dragStartWorld[0];
        const dy = rawWorld[1] - this.dragStartWorld[1];
        wall.moveStart([this.dragOriginalStart[0] + dx, this.dragOriginalStart[1] + dy]);
        wall.moveEnd([this.dragOriginalEnd[0] + dx, this.dragOriginalEnd[1] + dy]);
        this.selectionManager.updateProperties(this.building);
        this.notifyChanged();
      }
      return;
    }

    if (this.tool === "new-wall" || this.snappingOptions.grid) {
      this.currentSnapResult = this.snapManager.snap(rawWorld, this.building, {
        ...this.snappingOptions,
        startPoint: this.newWallStart
      });

      this.drawSnapIndicators(this.currentSnapResult, this.newWallStart);

      if (this.newWallStart) {
        this.drawNewWallPreview(this.newWallStart, this.currentSnapResult.point);
      }
    }
  }

  handleMouseUp() {
    if (this.panning) {
      this.panning = false;
      this.canvas.className = this.tool === "pan" ? "pan-mode" : this.tool === "move" ? "move-mode" : this.tool === "new-wall" ? "crosshair-mode" : "";
    }

    if (this.draggingWall) {
      this.draggingWall = false;
      this.dragStartWorld = null;
      this.dragOriginalStart = null;
      this.dragOriginalEnd = null;
      this.notifyChanged();
    }
  }

  drawSnapIndicators(snapResult, startWorld = null) {
    if (!this.snapIndicators) return;
    this.snapIndicators.innerHTML = "";
    if (!snapResult || !snapResult.type) return;

    const ptScreen = this.renderer2D.worldToScreen(snapResult.point);

    if (snapResult.type === "endpoint") {
      createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 7, class: "snap-marker-endpoint" }, this.snapIndicators);
      createText(ptScreen[0], ptScreen[1] - 12, "Endpoint", "snap-label", this.snapIndicators);
    } else if (snapResult.type === "intersection") {
      const r = 7;
      const pts = [
        [ptScreen[0], ptScreen[1] - r],
        [ptScreen[0] + r, ptScreen[1]],
        [ptScreen[0], ptScreen[1] + r],
        [ptScreen[0] - r, ptScreen[1]]
      ];
      createPolygon(pts, "snap-marker-intersection", this.snapIndicators);
      createText(ptScreen[0], ptScreen[1] - 12, "Intersection", "snap-label", this.snapIndicators);
    } else if (snapResult.type === "angle" && startWorld) {
      const startScreen = this.renderer2D.worldToScreen(startWorld);
      createLine(startScreen, ptScreen, "snap-angle-guide", this.snapIndicators);
      createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 5, class: "snap-marker-endpoint" }, this.snapIndicators);
      if (snapResult.label) {
        createText(ptScreen[0], ptScreen[1] - 12, snapResult.label, "snap-label", this.snapIndicators);
      }
    } else if (snapResult.type === "grid") {
      createElement("circle", { cx: ptScreen[0], cy: ptScreen[1], r: 4, class: "snap-marker-grid" }, this.snapIndicators);
    }
  }

  drawNewWallPreview(start, end) {
    if (!this.newWallPreview) return;
    this.newWallPreview.innerHTML = "";
    const p1 = this.renderer2D.worldToScreen(start);
    const p2 = this.renderer2D.worldToScreen(end);
    const line = createLine(p1, p2, "wall-centerline", this.newWallPreview);
    line.setAttribute("stroke-width", "3");

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.hypot(dx, dy);
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - 10];
    createText(mid[0], mid[1], `${len.toFixed(2)} m`, "dim-label", this.newWallPreview);
  }

  clearPreviews() {
    if (this.snapIndicators) this.snapIndicators.innerHTML = "";
    if (this.newWallPreview) this.newWallPreview.innerHTML = "";
  }

  notifyChanged() {
    if (typeof this.onModelChanged === "function") {
      this.onModelChanged();
    }
  }
}
