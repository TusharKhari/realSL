export class Stair {
  constructor(data) {
    this.id = data.id;
    this.levelFrom = data.levelFrom;
    this.levelTo = data.levelTo;
    this.position = [...data.position];
    this.width = data.width;
    this.steps = data.steps;
  }

  getRise(building) {
    const from = building.getLevel(this.levelFrom);
    const to = building.getLevel(this.levelTo);

    if (!from || !to) {
      return 0;
    }

    return to.elevation - from.elevation;
  }

  getStepHeight(building) {
    return this.getRise(building) / this.steps;
  }

  toJSON() {
    return {
      id: this.id,
      levelFrom: this.levelFrom,
      levelTo: this.levelTo,
      position: [...this.position],
      width: this.width,
      steps: this.steps
    };
  }
}
