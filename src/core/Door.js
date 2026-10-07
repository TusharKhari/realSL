export class Door {
  constructor(data, building) {
    this.id = data.id;
    this.wallId = data.wallId;
    this.offset = data.offset ?? data.position ?? 0;
    this.width = data.width ?? 0.9;
    this.height = data.height ?? 2.1;
    this.levelId = data.levelId ?? null;
    this.building = building;
  }

  getWall() {
    return this.building.getWall(this.wallId);
  }

  getPosition() {
    const wall = this.getWall();
    if (!wall) {
      return null;
    }
    return wall.getPointAtOffset(this.offset);
  }

  toJSON() {
    return {
      id: this.id,
      wallId: this.wallId,
      offset: this.offset,
      width: this.width,
      height: this.height,
      ...(this.levelId ? { levelId: this.levelId } : {})
    };
  }
}
