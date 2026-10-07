import { validateBuildingJSON } from "../validation/validateBuilding.js";
import { Building } from "../core/Building.js";

export class JsonEditor {
  constructor({
    textarea,
    errorElement,
    onBuildingChanged
  }) {
    this.textarea = textarea;
    this.errorElement = errorElement;
    this.onBuildingChanged = onBuildingChanged;

    this.inputTimer = null;

    this.textarea.addEventListener("input", () => {
      clearTimeout(this.inputTimer);
      this.inputTimer = setTimeout(() => this.handleInput(), 300);
    });
  }

  setBuilding(buildingData) {
    this.textarea.value = typeof buildingData === "string" 
      ? buildingData 
      : JSON.stringify(buildingData, null, 2);
    this.clearError();
  }

  getJSON() {
    return JSON.parse(this.textarea.value);
  }

  handleInput() {
    try {
      const jsonText = this.textarea.value;
      const errors = validateBuildingJSON(jsonText);

      if (errors && errors.length > 0) {
        this.showError(errors.join("\n"));
        return;
      }

      const json = JSON.parse(jsonText);
      const building = new Building(json);

      this.clearError();

      if (typeof this.onBuildingChanged === "function") {
        this.onBuildingChanged(building, json);
      }
    } catch (error) {
      this.showError(`JSON Error: ${error.message}`);
    }
  }

  format() {
    try {
      const json = this.getJSON();
      this.textarea.value = JSON.stringify(json, null, 2);
      this.clearError();
    } catch (error) {
      this.showError(`Invalid JSON: ${error.message}`);
    }
  }

  clearError() {
    if (this.errorElement) {
      this.errorElement.textContent = "";
      this.errorElement.style.display = "none";
    }
  }

  showError(message) {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = "block";
    }
  }
}
