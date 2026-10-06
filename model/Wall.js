export class Wall {
  constructor(data) {
    this.id = data.id;
    this.start = [...data.start];
    this.end = [...data.end];
    this.thickness = data.thickness ?? 0.2;
    this.height = data.height ?? 2.8;
    this.levelId = data.levelId ?? null;
  }

  getLength() {
    const dx = this.end[0] - this.start[0];
    const dy = this.end[1] - this.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  getDirection() {
    const length = this.getLength();
    if (length === 0) {
      return [0, 0];
    }
    return [
      (this.end[0] - this.start[0]) / length,
      (this.end[1] - this.start[1]) / length
    ];
  }

  getMidpoint() {
    return [
      (this.start[0] + this.end[0]) / 2,
      (this.start[1] + this.end[1]) / 2
    ];
  }

  getPointAtOffset(offset) {
    const direction = this.getDirection();
    return [
      this.start[0] + direction[0] * offset,
      this.start[1] + direction[1] * offset
    ];
  }

  // ==========================================================
  // EDITING
  // ==========================================================

  move(dx, dy) {
    this.start[0] += dx;
    this.start[1] += dy;
    this.end[0] += dx;
    this.end[1] += dy;
  }

  moveStart(point) {
    this.start = [point[0], point[1]];
  }

  moveEnd(point) {
    this.end = [point[0], point[1]];
  }

  setThickness(value) {
    this.thickness = value;
  }

  setHeight(value) {
    this.height = value;
  }

  // ==========================================================
  // JSON
  // ==========================================================

  toJSON() {
    const result = {
      id: this.id,
      start: [...this.start],
      end: [...this.end],
      thickness: this.thickness,
      height: this.height
    };

    if (this.levelId !== null) {
      result.levelId = this.levelId;
    }

    return result;
  }
}
