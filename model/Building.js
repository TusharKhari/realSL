import { Level } from "./Level.js";
import { Wall } from "./Wall.js";
import { Room } from "./Room.js";
import { Door } from "./Door.js";
import { Window } from "./Window.js";
import { Stair } from "./Stair.js";
import { Furniture } from "./Furniture.js";

export class Building {
  constructor(data) {
    this.id = data.id ?? "building-1";
    this.data = data;

    const levelsData = (data.levels && data.levels.length > 0)
      ? data.levels
      : [{ id: "ground-floor", elevation: 0, height: 2.8 }];

    this.levels = levelsData.map(level => new Level(level));
    this.walls = (data.walls ?? []).map(wall => new Wall(wall));
    this.rooms = (data.rooms ?? []).map(room => new Room(room, this));
    this.doors = (data.doors ?? []).map(door => new Door(door, this));
    this.windows = (data.windows ?? []).map(window => new Window(window, this));
    this.stairs = (data.stairs ?? []).map(stair => new Stair(stair));
    this.furniture = (data.furniture ?? []).map(item => new Furniture(item));
  }

  // ==========================================================
  // LEVELS
  // ==========================================================

  getLevel(id) {
    return this.levels.find(level => level.id === id) ?? null;
  }

  getLevels() {
    return this.levels;
  }

  getLevelForWall(wall) {
    return wall.levelId ? this.getLevel(wall.levelId) : null;
  }

  getLevelForRoom(room) {
    return room.levelId ? this.getLevel(room.levelId) : null;
  }

  getWallsForLevel(levelId) {
    return this.walls.filter(wall => wall.levelId === levelId);
  }

  getRoomsForLevel(levelId) {
    return this.rooms.filter(room => room.levelId === levelId);
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

  addWall(start, end, thickness = 0.2, height = 2.8, levelId = null) {
    const wallData = {
      id: this.createId("wall"),
      levelId: levelId,
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
  // DOORS & WINDOWS
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
  // STAIRS
  // ==========================================================

  getStair(id) {
    return this.stairs.find(stair => stair.id === id) ?? null;
  }

  getStairs() {
    return this.stairs;
  }

  getStairsBetweenLevels(levelFrom, levelTo) {
    return this.stairs.filter(
      stair => stair.levelFrom === levelFrom && stair.levelTo === levelTo
    );
  }

  getStairsForLevel(levelId) {
    return this.stairs.filter(
      stair => stair.levelFrom === levelId || stair.levelTo === levelId
    );
  }

  // ==========================================================
  // FURNITURE
  // ==========================================================

  getFurniture() {
    return this.furniture;
  }

  getFurnitureItem(id) {
    return this.furniture.find(item => item.id === id) ?? null;
  }

  getFurnitureForLevel(levelId) {
    return this.furniture.filter(item => item.levelId === levelId);
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
      this.levels.some(level => level.id === id) ||
      this.walls.some(wall => wall.id === id) ||
      this.rooms.some(room => room.id === id) ||
      this.doors.some(door => door.id === id) ||
      this.windows.some(window => window.id === id) ||
      this.stairs.some(stair => stair.id === id) ||
      this.furniture.some(item => item.id === id)
    );
  }

  // ==========================================================
  // EXPORT / SERIALIZATION
  // ==========================================================

  toJSON() {
    return {
      id: this.id,
      levels: this.levels.map(level => level.toJSON()),
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
      stairs: this.stairs.map(stair => stair.toJSON()),
      furniture: this.furniture.map(item => item.toJSON())
    };
  }

  toJSONString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
