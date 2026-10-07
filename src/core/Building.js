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
    const defaultLevelId = this.levels[0]?.id ?? "ground-floor";

    this.walls = (data.walls ?? []).map(wall => {
      const wData = { ...wall };
      if (!wData.levelId) wData.levelId = defaultLevelId;
      return new Wall(wData);
    });

    this.rooms = (data.rooms ?? []).map(room => {
      const rData = { ...room };
      if (!rData.levelId) rData.levelId = defaultLevelId;
      return new Room(rData, this);
    });

    this.doors = (data.doors ?? []).map(door => {
      const dData = { ...door };
      if (!dData.levelId) dData.levelId = defaultLevelId;
      return new Door(dData, this);
    });

    this.windows = (data.windows ?? []).map(window => {
      const winData = { ...window };
      if (!winData.levelId) winData.levelId = defaultLevelId;
      return new Window(winData, this);
    });

    this.stairs = (data.stairs ?? []).map(stair => new Stair(stair));

    this.furniture = (data.furniture ?? []).map(item => {
      const fData = { ...item };
      if (!fData.levelId) fData.levelId = defaultLevelId;
      return new Furniture(fData);
    });
  }

  // LEVELS
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
    const defaultId = this.levels[0]?.id;
    return this.walls.filter(
      wall => wall.levelId === levelId || (!wall.levelId && levelId === defaultId) || this.levels.length <= 1
    );
  }

  getRoomsForLevel(levelId) {
    const defaultId = this.levels[0]?.id;
    return this.rooms.filter(
      room => room.levelId === levelId || (!room.levelId && levelId === defaultId) || this.levels.length <= 1
    );
  }

  // WALLS
  getWall(id) {
    return this.walls.find(wall => wall.id === id) ?? null;
  }

  getWalls() {
    return this.walls;
  }

  addWall(start, end, thickness = 0.2, height = 2.8, levelId = null) {
    const wallData = {
      id: this.createId("wall"),
      levelId: levelId || this.levels[0]?.id,
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

  // ROOMS
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

  // DOORS & WINDOWS
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

  // STAIRS
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

  // FURNITURE
  getFurniture() {
    return this.furniture;
  }

  getFurnitureItem(id) {
    return this.furniture.find(item => item.id === id) ?? null;
  }

  getFurnitureForLevel(levelId) {
    const defaultId = this.levels[0]?.id;
    return this.furniture.filter(
      item => item.levelId === levelId || (!item.levelId && levelId === defaultId) || this.levels.length <= 1
    );
  }

  // IDs
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

  // SERIALIZATION
  toJSON() {
    return {
      id: this.id,
      levels: this.levels.map(level => level.toJSON()),
      walls: this.walls.map(wall => wall.toJSON()),
      rooms: this.rooms.map(room => room.toJSON()),
      doors: this.doors.map(door => door.toJSON()),
      windows: this.windows.map(window => window.toJSON()),
      stairs: this.stairs.map(stair => stair.toJSON()),
      furniture: this.furniture.map(item => item.toJSON())
    };
  }

  toJSONString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}
