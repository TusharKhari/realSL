export function validateBuildingJSON(jsonText) {
  const errors = [];
  let data;

  try {
    data = JSON.parse(jsonText);
  } catch (error) {
    errors.push(`JSON syntax error: ${error.message}`);
    return errors;
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    errors.push("Building must be a JSON object.");
    return errors;
  }

  if (data.walls !== undefined && !Array.isArray(data.walls)) {
    errors.push("walls must be an array.");
  }
  if (data.doors !== undefined && !Array.isArray(data.doors)) {
    errors.push("doors must be an array.");
  }
  if (data.windows !== undefined && !Array.isArray(data.windows)) {
    errors.push("windows must be an array.");
  }
  if (data.rooms !== undefined && !Array.isArray(data.rooms)) {
    errors.push("rooms must be an array.");
  }
  if (data.levels !== undefined && !Array.isArray(data.levels)) {
    errors.push("levels must be an array.");
  }
  if (data.stairs !== undefined && !Array.isArray(data.stairs)) {
    errors.push("stairs must be an array.");
  }
  if (data.furniture !== undefined && !Array.isArray(data.furniture)) {
    errors.push("furniture must be an array.");
  }

  if (errors.length > 0) {
    return errors;
  }

  const walls = data.walls || [];
  const doors = data.doors || [];
  const windows = data.windows || [];
  const rooms = data.rooms || [];
  const levels = data.levels || [];
  const stairs = data.stairs || [];
  const furniture = data.furniture || [];

  const allIds = new Map();

  function registerId(object, type, index) {
    const path = `${type}[${index}]`;
    if (object.id === undefined) {
      errors.push(`${path} is missing required field "id".`);
      return;
    }
    if (typeof object.id !== "string" || object.id.trim() === "") {
      errors.push(`${path}.id must be a non-empty string.`);
      return;
    }
    if (allIds.has(object.id)) {
      const previous = allIds.get(object.id);
      errors.push(`Duplicate ID "${object.id}" found in ${path}; already used by ${previous}.`);
      return;
    }
    allIds.set(object.id, path);
  }

  walls.forEach((wall, i) => registerId(wall, "walls", i));
  doors.forEach((door, i) => registerId(door, "doors", i));
  windows.forEach((win, i) => registerId(win, "windows", i));
  rooms.forEach((room, i) => registerId(room, "rooms", i));
  levels.forEach((level, i) => registerId(level, "levels", i));
  stairs.forEach((stair, i) => registerId(stair, "stairs", i));
  furniture.forEach((item, i) => registerId(item, "furniture", i));

  const wallIds = new Set(walls.filter(w => typeof w.id === "string").map(w => w.id));
  const levelIds = new Set(levels.filter(l => typeof l.id === "string").map(l => l.id));

  function requireField(object, field, path) {
    if (object[field] === undefined) {
      errors.push(`${path} is missing required field "${field}".`);
      return false;
    }
    return true;
  }

  function requireString(value, path) {
    if (typeof value !== "string") {
      errors.push(`${path} must be a string.`);
      return false;
    }
    return true;
  }

  function requireNumber(value, path) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${path} must be a finite number.`);
      return false;
    }
    return true;
  }

  function requirePositiveNumber(value, path) {
    if (!requireNumber(value, path)) return false;
    if (value <= 0) {
      errors.push(`${path} must be greater than 0.`);
      return false;
    }
    return true;
  }

  function validatePoint(point, path) {
    if (Array.isArray(point)) {
      if (point.length !== 2) {
        errors.push(`${path} must contain exactly 2 coordinates.`);
        return;
      }
      requireNumber(point[0], `${path}[0]`);
      requireNumber(point[1], `${path}[1]`);
    } else if (point && typeof point === "object") {
      requireNumber(point.x, `${path}.x`);
      requireNumber(point.y, `${path}.y`);
    } else {
      errors.push(`${path} must be an array [x, y] or object {x, y}.`);
    }
  }

  walls.forEach((wall, index) => {
    const path = `walls[${index}]`;
    if (wall === null || typeof wall !== "object" || Array.isArray(wall)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    requireField(wall, "id", path);
    requireField(wall, "start", path);
    requireField(wall, "end", path);

    if (wall.start !== undefined) validatePoint(wall.start, `${path}.start`);
    if (wall.end !== undefined) validatePoint(wall.end, `${path}.end`);
    if (wall.thickness !== undefined) requirePositiveNumber(wall.thickness, `${path}.thickness`);
    if (wall.height !== undefined) requirePositiveNumber(wall.height, `${path}.height`);
  });

  doors.forEach((door, index) => {
    const path = `doors[${index}]`;
    if (door === null || typeof door !== "object" || Array.isArray(door)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    requireField(door, "id", path);
    requireField(door, "wallId", path);

    if (door.wallId !== undefined && requireString(door.wallId, `${path}.wallId`)) {
      if (!wallIds.has(door.wallId)) {
        errors.push(`${path} references wall "${door.wallId}", but that wall does not exist.`);
      }
    }

    const offsetVal = door.offset ?? door.position;
    if (offsetVal !== undefined) {
      requireNumber(offsetVal, `${path}.offset`);
      if (typeof offsetVal === "number" && offsetVal < 0) {
        errors.push(`${path}.offset cannot be negative.`);
      }
    }
  });

  windows.forEach((win, index) => {
    const path = `windows[${index}]`;
    if (win === null || typeof win !== "object" || Array.isArray(win)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    requireField(win, "id", path);
    requireField(win, "wallId", path);

    if (win.wallId !== undefined && requireString(win.wallId, `${path}.wallId`)) {
      if (!wallIds.has(win.wallId)) {
        errors.push(`${path} references wall "${win.wallId}", but that wall does not exist.`);
      }
    }

    const winOffsetVal = win.offset ?? win.position;
    if (winOffsetVal !== undefined) {
      requireNumber(winOffsetVal, `${path}.offset`);
      if (typeof winOffsetVal === "number" && winOffsetVal < 0) {
        errors.push(`${path}.offset cannot be negative.`);
      }
    }
  });

  rooms.forEach((room, index) => {
    const path = `rooms[${index}]`;
    if (room === null || typeof room !== "object" || Array.isArray(room)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    requireField(room, "id", path);
  });

  return errors;
}
