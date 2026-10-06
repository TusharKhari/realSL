export class Level {
  constructor(data) {
    this.id = data.id;
    this.elevation = data.elevation ?? 0;
    this.height = data.height ?? 2.8;
  }

  toJSON() {
    return {
      id: this.id,
      elevation: this.elevation,
      height: this.height
    };
  }
}
