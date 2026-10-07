export class SelectionManager {
  constructor(options = {}) {
    this.propertyContent = options.propertyContent;
    this.selectedWallId = null;
    this.onSelectionChange = options.onSelectionChange;
  }

  selectWall(id, building) {
    this.selectedWallId = id;
    this.updateProperties(building);
    if (typeof this.onSelectionChange === "function") {
      this.onSelectionChange(this.selectedWallId);
    }
  }

  clearSelection(building) {
    this.selectedWallId = null;
    this.updateProperties(building);
    if (typeof this.onSelectionChange === "function") {
      this.onSelectionChange(null);
    }
  }

  updateProperties(building) {
    if (!this.propertyContent) return;
    this.propertyContent.innerHTML = "";

    if (!this.selectedWallId || !building) {
      this.propertyContent.textContent = "Nothing selected.";
      return;
    }

    const wall = building.getWall(this.selectedWallId);
    if (!wall) {
      this.propertyContent.textContent = "Wall not found.";
      return;
    }

    const title = document.createElement("div");
    title.style.marginBottom = "10px";
    title.innerHTML = `<strong style="font-size: 15px; color: var(--accent);">${wall.id}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${wall.levelId || 'ground-floor'})</span>`;
    this.propertyContent.appendChild(title);

    this.addNumberInput("Length (m)", Number(wall.getLength().toFixed(2)), value => {
      if (value <= 0) return;
      wall.setLength(value);
      if (typeof this.onSelectionChange === "function") this.onSelectionChange(this.selectedWallId);
    });

    this.addNumberInput("Thickness (m)", wall.thickness, value => {
      if (value <= 0) return;
      wall.setThickness(value);
      if (typeof this.onSelectionChange === "function") this.onSelectionChange(this.selectedWallId);
    });

    this.addNumberInput("Height (m)", wall.height, value => {
      if (value <= 0) return;
      wall.setHeight(value);
      if (typeof this.onSelectionChange === "function") this.onSelectionChange(this.selectedWallId);
    });
  }

  addNumberInput(label, value, onChange) {
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
    this.propertyContent.appendChild(row);
  }
}
