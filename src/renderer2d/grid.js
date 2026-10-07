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

export function drawGrid(gridContainer, worldToScreen, screenToWorld, width, height) {
  gridContainer.innerHTML = "";

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

    const line = createLine(p1, p2, null, gridContainer);
    line.setAttribute("class", isAxis ? "axis-y" : isMajor ? "grid-line-major" : "grid-line");

    if (x % 5 === 0 && !isAxis) {
      const originY = worldToScreen([x, 0])[1];
      const labelText = createText(p1[0], originY + 14, `${x}m`, "axis-label", gridContainer);
      labelText.setAttribute("text-anchor", "middle");
    }
  }

  for (let y = minY; y <= maxY; y++) {
    const isMajor = y % 5 === 0;
    const isAxis = y === 0;

    const p1 = worldToScreen([minX, y]);
    const p2 = worldToScreen([maxX, y]);

    const line = createLine(p1, p2, null, gridContainer);
    line.setAttribute("class", isAxis ? "axis-x" : isMajor ? "grid-line-major" : "grid-line");

    if (y % 5 === 0 && !isAxis) {
      const originX = worldToScreen([0, y])[0];
      const labelText = createText(originX - 8, p1[1] + 4, `${y}m`, "axis-label", gridContainer);
      labelText.setAttribute("text-anchor", "end");
    }
  }

  const originScreen = worldToScreen([0, 0]);
  const originText = createText(originScreen[0] - 8, originScreen[1] + 16, "(0,0)", "origin-label", gridContainer);
  originText.setAttribute("text-anchor", "end");
}
