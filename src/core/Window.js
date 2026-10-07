export class Window {
  constructor(data, building) {
    this.id = data.id;
    this.wallId = data.wallId;
    this.offset = data.offset ?? data.position ?? 0;
    this.width = data.width ?? 1.2;
    this.height = data.height ?? 1.2;
    this.sillHeight = data.sillHeight ?? 0.9;
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

  getTopHeight() {
    return this.sillHeight + this.height;
  }

  toJSON() {
    return {
      id: this.id,
      wallId: this.wallId,
      offset: this.offset,
      width: this.width,
      height: this.height,
      sillHeight: this.sillHeight,
      ...(this.levelId ? { levelId: this.levelId } : {})
    };
  }
}
