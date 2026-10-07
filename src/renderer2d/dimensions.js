import { distance } from "../geometry/points.js";

export class Dimension {
  constructor(start, end, options = {}) {
    this.start = [...start];
    this.end = [...end];
    this.offset = options.offset ?? 0.5;
  }

  getLength() {
    return distance(this.start, this.end);
  }

  getLabel() {
    return `${this.getLength().toFixed(2)} m`;
  }

  getOffsetPoints() {
    const dx = this.end[0] - this.start[0];
    const dy = this.end[1] - this.start[1];
    const len = this.getLength();

    if (len === 0) {
      return {
        start: [...this.start],
        end: [...this.end],
        dimStart: [...this.start],
        dimEnd: [...this.end]
      };
    }

    const perpX = -dy / len;
    const perpY = dx / len;

    const dimStart = [
      this.start[0] + perpX * this.offset,
      this.start[1] + perpY * this.offset
    ];

    const dimEnd = [
      this.end[0] + perpX * this.offset,
      this.end[1] + perpY * this.offset
    ];

    return {
      start: [...this.start],
      end: [...this.end],
      dimStart,
      dimEnd
    };
  }
}

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

function createText(x, y, text, className, parent) {
  const elem = createElement("text", { x: x, y: y }, parent);
  if (className) elem.setAttribute("class", className);
  elem.textContent = text;
  return elem;
}

export function drawDimensions(container, wallList, worldToScreen, showDimensions = true) {
  container.innerHTML = "";
  if (!showDimensions || !wallList) return;

  for (const wall of wallList) {
    const dim = new Dimension(wall.start, wall.end, { offset: 0.7 });
    const pts = dim.getOffsetPoints();

    const pStartScreen = worldToScreen(pts.start);
    const pEndScreen = worldToScreen(pts.end);
    const dimStartScreen = worldToScreen(pts.dimStart);
    const dimEndScreen = worldToScreen(pts.dimEnd);

    createLine(pStartScreen, dimStartScreen, "dim-ext-line", container);
    createLine(pEndScreen, dimEndScreen, "dim-ext-line", container);
    createLine(dimStartScreen, dimEndScreen, "dim-line", container);

    createElement("circle", { cx: dimStartScreen[0], cy: dimStartScreen[1], r: 3, class: "dim-arrow" }, container);
    createElement("circle", { cx: dimEndScreen[0], cy: dimEndScreen[1], r: 3, class: "dim-arrow" }, container);

    const labelX = (dimStartScreen[0] + dimEndScreen[0]) / 2;
    const labelY = (dimStartScreen[1] + dimEndScreen[1]) / 2 - 8;
    createText(labelX, labelY, dim.getLabel(), "dim-label", container);
  }
}
