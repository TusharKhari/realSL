export class Level {
  constructor(data) {
    this.id = data.id;
    this.name = data.name ?? data.id;
    this.elevation = data.elevation ?? 0;
    this.height = data.height ?? 2.8;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      elevation: this.elevation,
      height: this.height
    };
  }
}
