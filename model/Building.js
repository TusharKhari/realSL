import { Wall } from "./Wall.js";
import { Room } from "./Room.js";
import { Door } from "./Door.js";
import { Window } from "./Window.js";

export class Building {
  constructor(data) {
    this.id = data.id ?? "building-1";
    this.data = data;

    this.walls = (data.walls ?? []).map(wall => new Wall(wall));
    this.rooms = (data.rooms ?? []).map(room => new Room(room, this));
    this.doors = (data.doors ?? []).map(door => new Door(door, this));
    this.windows = (data.windows ?? []).map(window => new Window(window, this));
    this.levels = data.levels ?? [];
  }

  // ==========================================================
  // WALLS
  // ==========================================================

  getWall(id) {
    return this.walls.find(wall => wall.id === id) ?? null;
  }

  getWalls() {
    return this.walls;
  }

  addWall(start, end, thickness = 0.2, height = 2.8) {
    const wallData = {
      id: this.createId("wall"),
      start: [...start],
      end: [...end],
      thickness,
      height
    };

    const model = new Wall(wallData);
    this.walls.push(model);
    return model;
  }

  deleteWall(id) {
    const index = this.walls.findIndex(wall => wall.id === id);
    if (index === -1) {
      return false;
    }

    this.walls.splice(index, 1);

    // Delete child elements (doors & windows) belonging to this wall
    this.doors = this.doors.filter(door => door.wallId !== id);
    this.windows = this.windows.filter(window => window.wallId !== id);

    return true;
  }

  // ==========================================================
  // ROOMS
  // ==========================================================

  getRoom(id) {
    return this.rooms.find(room => room.id === id) ?? null;
  }

  getRooms() {
    return this.rooms;
  }

  calculateRoomArea(id) {
    const room = this.getRoom(id);
    return room ? room.calculateArea() : null;
  }

  calculateRoomPerimeter(id) {
    const room = this.getRoom(id);
    return room ? room.calculatePerimeter() : null;
  }

  calculateRoomCenter(id) {
    const room = this.getRoom(id);
    return room ? room.calculateCenter() : null;
  }

  // ==========================================================
  // DOORS
  // ==========================================================

  getDoor(id) {
    return this.doors.find(door => door.id === id) ?? null;
  }

  getDoors() {
    return this.doors;
  }

  getDoorsForWall(wallId) {
    return this.doors.filter(door => door.wallId === wallId);
  }

  // ==========================================================
  // WINDOWS
  // ==========================================================

  getWindow(id) {
    return this.windows.find(window => window.id === id) ?? null;
  }

  getWindows() {
    return this.windows;
  }

  getWindowsForWall(wallId) {
    return this.windows.filter(window => window.wallId === wallId);
  }

  // ==========================================================
  // IDs
  // ==========================================================

  createId(prefix) {
    let number = 1;
    let id;
    do {
      id = `${prefix}-${number}`;
      number++;
    } while (this.hasId(id));

    return id;
  }

  hasId(id) {
    return (
      this.walls.some(wall => wall.id === id) ||
      this.rooms.some(room => room.id === id) ||
      this.doors.some(door => door.id === id) ||
      this.windows.some(window => window.id === id)
    );
  }

  // ==========================================================
  // EXPORT / SERIALIZATION
  // ==========================================================

  toJSON() {
    return {
      id: this.id,
      walls: this.walls.map(wall => wall.toJSON()),
      rooms: this.rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        boundary: room.boundary.map(point => [...point]),
        ...(room.levelId ? { levelId: room.levelId } : {})
      })),
      doors: this.doors.map(door => ({
        id: door.id,
        wallId: door.wallId,
        offset: door.offset,
        width: door.width,
        height: door.height,
        ...(door.levelId ? { levelId: door.levelId } : {})
      })),
      windows: this.windows.map(window => ({
        id: window.id,
        wallId: window.wallId,
        offset: window.offset,
        width: window.width,
        height: window.height,
        sillHeight: window.sillHeight,
        ...(window.levelId ? { levelId: window.levelId } : {})
      })),
      levels: this.levels
    };
  }

  toJSONString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
