export class Application {
  constructor({ renderer2D, renderer3D, jsonEditor }) {
    this.renderer2D = renderer2D;
    this.renderer3D = renderer3D;
    this.jsonEditor = jsonEditor;

    this.building = null;
    this.sourceJSON = null;
    this.listeners = [];
  }

  addListener(listener) {
    if (typeof listener === "function") {
      this.listeners.push(listener);
    }
  }

  setBuilding(building, sourceJSON, source = "external", options = {}) {
    this.building = building;
    this.sourceJSON = sourceJSON;

    if (source !== "jsonEditor" && this.jsonEditor) {
      this.jsonEditor.setBuilding(building.toJSON(), options);
    }

    this.render(source, options);

    for (const listener of this.listeners) {
      try {
        listener(this.building, source, options);
      } catch (err) {
        console.error("Application listener error:", err);
      }
    }
  }

  render(source = "external", options = {}) {
    if (!this.building) return;

    if (this.renderer2D && typeof this.renderer2D.render === "function") {
      this.renderer2D.render(this.building, source, options);
    }

    if (this.renderer3D && typeof this.renderer3D.setBuilding === "function") {
      this.renderer3D.setBuilding(this.building, options.resetCamera ?? false);
    } else if (this.renderer3D && typeof this.renderer3D.refresh === "function") {
      this.renderer3D.refresh(this.building);
    }
  }
}
