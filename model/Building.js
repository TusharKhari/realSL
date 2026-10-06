import { Wall } from "./Wall.js";
import { Room } from "./Room.js";
import { Door } from "./Door.js";
import { Window } from "./Window.js";

export class Building {
  constructor(data) {
    this.data = data;
    this.id = data.id ?? "building-1";

    this.walls = (data.walls ?? []).map(wall => new Wall(wall));
    this.rooms = (data.rooms ?? []).map(room => new Room(room, this));
    this.doors = (data.doors ?? []).map(door => new Door(door, this));
    this.windows = (data.windows ?? []).map(window => new Window(window, this));
    this.levels = data.levels ?? [];
  }

  // WALLS
  getWall(id) {
    return this.walls.find(wall => wall.id === id) ?? null;
  }

  getWalls() {
    return this.walls;
  }

  // ROOMS
  getRoom(id) {
    return this.rooms.find(room => room.id === id) ?? null;
  }

  getRooms() {
    return this.rooms;
  }

  // DOORS
  getDoor(id) {
    return this.doors.find(door => door.id === id) ?? null;
  }

  getDoors() {
    return this.doors;
  }

  getDoorsForWall(wallId) {
    return this.doors.filter(door => door.wallId === wallId);
  }

  // WINDOWS
  getWindow(id) {
    return this.windows.find(window => window.id === id) ?? null;
  }

  getWindows() {
    return this.windows;
  }

  getWindowsForWall(wallId) {
    return this.windows.filter(window => window.wallId === wallId);
  }

  // LEVELS
  getLevel(id) {
    return this.levels.find(level => level.id === id) ?? null;
  }

  // ROOM CALCULATIONS
  calculateRoomArea(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.calculateArea() : null;
  }

  calculateRoomPerimeter(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.calculatePerimeter() : null;
  }

  calculateRoomCenter(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.calculateCenter() : null;
  }

  // SERIALIZATION
  toJSON() {
    return structuredClone(this.data);
  }
}
