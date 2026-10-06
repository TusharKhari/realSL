export class Furniture {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.levelId = data.levelId ?? null;
    this.position = [...data.position];
    this.rotation = data.rotation ?? 0;
    this.scale = [...(data.scale ?? [1, 1, 1])];
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      levelId: this.levelId,
      position: [...this.position],
      rotation: this.rotation,
      scale: [...this.scale]
    };
  }
}
