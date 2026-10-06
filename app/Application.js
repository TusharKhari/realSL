export class Application {
  constructor({ renderer2D, renderer3D, jsonEditor }) {
    this.renderer2D = renderer2D;
    this.renderer3D = renderer3D;
    this.jsonEditor = jsonEditor;

    this.building = null;
    this.sourceJSON = null;
  }

  setBuilding(building, sourceJSON, source = "external") {
    this.building = building;
    this.sourceJSON = sourceJSON;

    if (source !== "jsonEditor" && this.jsonEditor) {
      this.jsonEditor.setBuilding(building.toJSON());
    }

    this.render();
  }

  render() {
    if (!this.building) return;

    if (this.renderer2D && typeof this.renderer2D.render === "function") {
      this.renderer2D.render(this.building);
    }

    if (this.renderer3D && typeof this.renderer3D.refresh === "function") {
      this.renderer3D.refresh();
    }
  }
}
