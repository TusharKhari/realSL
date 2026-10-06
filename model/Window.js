export class Window {
  constructor(data, building) {
    this.id = data.id;
    this.wallId = data.wallId;
    this.offset = data.offset;
    this.width = data.width;
    this.height = data.height;
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
}
