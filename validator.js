 function validateBuildingJSON(jsonText) {

  const errors = [];

  let data;


  // ==========================================================
  // 1. JSON SYNTAX
  // ==========================================================

  try {

    data = JSON.parse(jsonText);

  } catch (error) {

    errors.push(
      `JSON syntax error: ${error.message}`
    );

    return errors;
  }


  // ==========================================================
  // 2. ROOT OBJECT
  // ==========================================================

  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {

    errors.push(
      "Building must be a JSON object."
    );

    return errors;
  }


  // ==========================================================
  // 3. TOP-LEVEL COLLECTIONS
  // ==========================================================

  if (
    data.walls !== undefined &&
    !Array.isArray(data.walls)
  ) {

    errors.push(
      "walls must be an array."
    );
  }


  if (
    data.doors !== undefined &&
    !Array.isArray(data.doors)
  ) {

    errors.push(
      "doors must be an array."
    );
  }


  if (
    data.windows !== undefined &&
    !Array.isArray(data.windows)
  ) {

    errors.push(
      "windows must be an array."
    );
  }


  if (
    data.rooms !== undefined &&
    !Array.isArray(data.rooms)
  ) {

    errors.push(
      "rooms must be an array."
    );
  }


  if (
    data.levels !== undefined &&
    !Array.isArray(data.levels)
  ) {

    errors.push(
      "levels must be an array."
    );
  }


  // Stop if collections are fundamentally wrong.

  if (errors.length > 0) {
    return errors;
  }


  const walls =
    data.walls || [];

  const doors =
    data.doors || [];

  const windows =
    data.windows || [];

  const rooms =
    data.rooms || [];

  const levels =
    data.levels || [];


  // ==========================================================
  // 4. VALIDATE IDs
  // ==========================================================

  const allIds =
    new Map();


  function registerId(
    object,
    type,
    index
  ) {

    const path =
      `${type}[${index}]`;


    if (
      object.id === undefined
    ) {

      errors.push(
        `${path} is missing required field "id".`
      );

      return;
    }


    if (
      typeof object.id !== "string" ||
      object.id.trim() === ""
    ) {

      errors.push(
        `${path}.id must be a non-empty string.`
      );

      return;
    }


    if (
      allIds.has(object.id)
    ) {

      const previous =
        allIds.get(object.id);

      errors.push(
        `Duplicate ID "${object.id}" found in ${path}; ` +
        `already used by ${previous}.`
      );

      return;
    }


    allIds.set(
      object.id,
      path
    );
  }


  walls.forEach(
    (wall, index) =>
      registerId(
        wall,
        "walls",
        index
      )
  );


  doors.forEach(
    (door, index) =>
      registerId(
        door,
        "doors",
        index
      )
  );


  windows.forEach(
    (window, index) =>
      registerId(
        window,
        "windows",
        index
      )
  );


  rooms.forEach(
    (room, index) =>
      registerId(
        room,
        "rooms",
        index
      )
  );


  levels.forEach(
    (level, index) =>
      registerId(
        level,
        "levels",
        index
      )
  );


  // ==========================================================
  // 5. ID MAPS
  // ==========================================================

  const wallIds =
    new Set(
      walls
        .filter(
          wall =>
            typeof wall.id === "string"
        )
        .map(
          wall => wall.id
        )
    );


  const levelIds =
    new Set(
      levels
        .filter(
          level =>
            typeof level.id === "string"
        )
        .map(
          level => level.id
        )
    );


  // ==========================================================
  // 6. HELPERS
  // ==========================================================

  function requireField(
    object,
    field,
    path
  ) {

    if (
      object[field] === undefined
    ) {

      errors.push(
        `${path} is missing required field "${field}".`
      );

      return false;
    }

    return true;
  }


  function requireString(
    value,
    path
  ) {

    if (
      typeof value !== "string"
    ) {

      errors.push(
        `${path} must be a string.`
      );

      return false;
    }

    return true;
  }


  function requireNumber(
    value,
    path
  ) {

    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {

      errors.push(
        `${path} must be a finite number.`
      );

      return false;
    }

    return true;
  }


  function requirePositiveNumber(
    value,
    path
  ) {

    if (
      !requireNumber(
        value,
        path
      )
    ) {

      return false;
    }


    if (
      value <= 0
    ) {

      errors.push(
        `${path} must be greater than 0.`
      );

      return false;
    }

    return true;
  }


  function validatePoint(
    point,
    path
  ) {

    if (
      !Array.isArray(point)
    ) {

      errors.push(
        `${path} must be an array [x, y].`
      );

      return;
    }


    if (
      point.length !== 2
    ) {

      errors.push(
        `${path} must contain exactly 2 coordinates.`
      );

      return;
    }


    requireNumber(
      point[0],
      `${path}[0]`
    );


    requireNumber(
      point[1],
      `${path}[1]`
    );
  }


  function validateLevelReference(
    object,
    path
  ) {

    if (
      object.levelId === undefined
    ) {

      return;
    }


    if (
      !requireString(
        object.levelId,
        `${path}.levelId`
      )
    ) {

      return;
    }


    if (
      levels.length === 0
    ) {

      errors.push(
        `${path}.levelId references "${object.levelId}", ` +
        `but no levels exist.`
      );

      return;
    }


    if (
      !levelIds.has(
        object.levelId
      )
    ) {

      errors.push(
        `${path}.levelId references "${object.levelId}", ` +
        `but that level does not exist.`
      );
    }
  }


  // ==========================================================
  // 7. WALLS
  // ==========================================================

  walls.forEach(
    (wall, index) => {

      const path =
        `walls[${index}]`;


      if (
        wall === null ||
        typeof wall !== "object" ||
        Array.isArray(wall)
      ) {

        errors.push(
          `${path} must be an object.`
        );

        return;
      }


      requireField(
        wall,
        "id",
        path
      );

      requireField(
        wall,
        "start",
        path
      );

      requireField(
        wall,
        "end",
        path
      );

      requireField(
        wall,
        "thickness",
        path
      );

      requireField(
        wall,
        "height",
        path
      );


      if (
        wall.start !== undefined
      ) {

        validatePoint(
          wall.start,
          `${path}.start`
        );
      }


      if (
        wall.end !== undefined
      ) {

        validatePoint(
          wall.end,
          `${path}.end`
        );
      }


      if (
        wall.thickness !== undefined
      ) {

        requirePositiveNumber(
          wall.thickness,
          `${path}.thickness`
        );
      }


      if (
        wall.height !== undefined
      ) {

        requirePositiveNumber(
          wall.height,
          `${path}.height`
        );
      }


      validateLevelReference(
        wall,
        path
      );
    }
  );


  // ==========================================================
  // 8. DOORS
  // ==========================================================

  doors.forEach(
    (door, index) => {

      const path =
        `doors[${index}]`;


      if (
        door === null ||
        typeof door !== "object" ||
        Array.isArray(door)
      ) {

        errors.push(
          `${path} must be an object.`
        );

        return;
      }


      requireField(
        door,
        "id",
        path
      );

      requireField(
        door,
        "wallId",
        path
      );

      requireField(
        door,
        "offset",
        path
      );

      requireField(
        door,
        "width",
        path
      );

      requireField(
        door,
        "height",
        path
      );


      // ------------------------------------------
      // wallId
      // ------------------------------------------

      if (
        door.wallId !== undefined
      ) {

        if (
          requireString(
            door.wallId,
            `${path}.wallId`
          )
        ) {

          if (
            !wallIds.has(
              door.wallId
            )
          ) {

            errors.push(
              `${path} references wall "${door.wallId}", ` +
              `but that wall does not exist.`
            );
          }
        }
      }


      // ------------------------------------------
      // dimensions
      // ------------------------------------------

      if (
        door.offset !== undefined
      ) {

        requireNumber(
          door.offset,
          `${path}.offset`
        );


        if (
          typeof door.offset === "number" &&
          door.offset < 0
        ) {

          errors.push(
            `${path}.offset cannot be negative.`
          );
        }
      }


      if (
        door.width !== undefined
      ) {

        requirePositiveNumber(
          door.width,
          `${path}.width`
        );
      }


      if (
        door.height !== undefined
      ) {

        requirePositiveNumber(
          door.height,
          `${path}.height`
        );
      }


      validateLevelReference(
        door,
        path
      );
    }
  );


  // ==========================================================
  // 9. WINDOWS
  // ==========================================================

  windows.forEach(
    (window, index) => {

      const path =
        `windows[${index}]`;


      if (
        window === null ||
        typeof window !== "object" ||
        Array.isArray(window)
      ) {

        errors.push(
          `${path} must be an object.`
        );

        return;
      }


      requireField(
        window,
        "id",
        path
      );

      requireField(
        window,
        "wallId",
        path
      );

      requireField(
        window,
        "offset",
        path
      );

      requireField(
        window,
        "width",
        path
      );

      requireField(
        window,
        "height",
        path
      );

      requireField(
        window,
        "sillHeight",
        path
      );


      // ------------------------------------------
      // wallId
      // ------------------------------------------

      if (
        window.wallId !== undefined
      ) {

        if (
          requireString(
            window.wallId,
            `${path}.wallId`
          )
        ) {

          if (
            !wallIds.has(
              window.wallId
            )
          ) {

            errors.push(
              `${path} references wall "${window.wallId}", ` +
              `but that wall does not exist.`
            );
          }
        }
      }


      // ------------------------------------------
      // offset
      // ------------------------------------------

      if (
        window.offset !== undefined
      ) {

        requireNumber(
          window.offset,
          `${path}.offset`
        );


        if (
          typeof window.offset === "number" &&
          window.offset < 0
        ) {

          errors.push(
            `${path}.offset cannot be negative.`
          );
        }
      }


      // ------------------------------------------
      // width
      // ------------------------------------------

      if (
        window.width !== undefined
      ) {

        requirePositiveNumber(
          window.width,
          `${path}.width`
        );
      }


      // ------------------------------------------
      // height
      // ------------------------------------------

      if (
        window.height !== undefined
      ) {

        requirePositiveNumber(
          window.height,
          `${path}.height`
        );
      }


      // ------------------------------------------
      // sillHeight
      // ------------------------------------------

      if (
        window.sillHeight !== undefined
      ) {

        if (
          requireNumber(
            window.sillHeight,
            `${path}.sillHeight`
          )
        ) {

          if (
            window.sillHeight < 0
          ) {

            errors.push(
              `${path}.sillHeight cannot be negative.`
            );
          }
        }
      }


      validateLevelReference(
        window,
        path
      );
    }
  );


  // ==========================================================
  // 10. ROOMS
  // ==========================================================

  rooms.forEach(
    (room, index) => {

      const path =
        `rooms[${index}]`;


      if (
        room === null ||
        typeof room !== "object" ||
        Array.isArray(room)
      ) {

        errors.push(
          `${path} must be an object.`
        );

        return;
      }


      requireField(
        room,
        "id",
        path
      );

      requireField(
        room,
        "name",
        path
      );

      requireField(
        room,
        "type",
        path
      );

      requireField(
        room,
        "boundary",
        path
      );


      if (
        room.name !== undefined
      ) {

        requireString(
          room.name,
          `${path}.name`
        );
      }


      if (
        room.type !== undefined
      ) {

        requireString(
          room.type,
          `${path}.type`
        );
      }


      if (
        room.boundary !== undefined
      ) {

        if (
          !Array.isArray(
            room.boundary
          )
        ) {

          errors.push(
            `${path}.boundary must be an array.`
          );

        } else {

          if (
            room.boundary.length < 3
          ) {

            errors.push(
              `${path}.boundary must contain at least 3 points.`
            );
          }


          room.boundary.forEach(
            (point, pointIndex) => {

              validatePoint(
                point,
                `${path}.boundary[${pointIndex}]`
              );
            }
          );
        }
      }


      validateLevelReference(
        room,
        path
      );
    }
  );


  // ==========================================================
  // 11. LEVELS
  // ==========================================================

  levels.forEach(
    (level, index) => {

      const path =
        `levels[${index}]`;


      if (
        level === null ||
        typeof level !== "object" ||
        Array.isArray(level)
      ) {

        errors.push(
          `${path} must be an object.`
        );

        return;
      }


      requireField(
        level,
        "id",
        path
      );


      if (
        level.name !== undefined
      ) {

        requireString(
          level.name,
          `${path}.name`
        );
      }


      if (
        level.elevation !== undefined
      ) {

        requireNumber(
          level.elevation,
          `${path}.elevation`
        );
      }
    }
  );


  // ==========================================================
  // 12. GEOMETRIC RELATIONSHIPS
  // ==========================================================

  // Doors must fit on their wall.

  doors.forEach(
    (door, index) => {

      const wall =
        findObject(
          walls,
          door.wallId
        );


      if (!wall) {
        return;
      }


      if (
        typeof door.offset !== "number" ||
        typeof door.width !== "number"
      ) {

        return;
      }


      const wallLength =
        distance(
          wall.start,
          wall.end
        );


      const doorStart =
        door.offset -
        door.width / 2;

      const doorEnd =
        door.offset +
        door.width / 2;


      if (
        doorStart < 0 ||
        doorEnd > wallLength
      ) {

        errors.push(
          `doors[${index}] (${door.id}) does not fit on ` +
          `wall "${wall.id}". ` +
          `Door range is ${doorStart.toFixed(2)}m–` +
          `${doorEnd.toFixed(2)}m, ` +
          `but wall length is ${wallLength.toFixed(2)}m.`
        );
      }


      if (
        typeof wall.height === "number" &&
        door.height > wall.height
      ) {

        errors.push(
          `doors[${index}] (${door.id}) is ${door.height}m high, ` +
          `but wall "${wall.id}" is only ${wall.height}m high.`
        );
      }
    }
  );


  // Windows must fit on their wall.

  windows.forEach(
    (window, index) => {

      const wall =
        findObject(
          walls,
          window.wallId
        );


      if (!wall) {
        return;
      }


      if (
        typeof window.offset !== "number" ||
        typeof window.width !== "number"
      ) {

        return;
      }


      const wallLength =
        distance(
          wall.start,
          wall.end
        );


      const windowStart =
        window.offset -
        window.width / 2;

      const windowEnd =
        window.offset +
        window.width / 2;


      if (
        windowStart < 0 ||
        windowEnd > wallLength
      ) {

        errors.push(
          `windows[${index}] (${window.id}) does not fit on ` +
          `wall "${wall.id}". ` +
          `Window range is ${windowStart.toFixed(2)}m–` +
          `${windowEnd.toFixed(2)}m, ` +
          `but wall length is ${wallLength.toFixed(2)}m.`
        );
      }


      if (
        typeof window.sillHeight === "number" &&
        typeof window.height === "number" &&
        typeof wall.height === "number"
      ) {

        const windowTop =
          window.sillHeight +
          window.height;


        if (
          windowTop > wall.height
        ) {

          errors.push(
            `windows[${index}] (${window.id}) extends to ` +
            `${windowTop.toFixed(2)}m, but wall "${wall.id}" ` +
            `is only ${wall.height.toFixed(2)}m high.`
          );
        }
      }
    }
  );


  // ==========================================================
  // RESULT
  // ==========================================================

  return errors;
}


// ============================================================
// FIND OBJECT
// ============================================================

function findObject(
  objects,
  id
) {

  return objects.find(
    object =>
      object.id === id
  );
}


// ============================================================
// DISTANCE
// ============================================================

function distance(
  a,
  b
) {

  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== 2 ||
    b.length !== 2
  ) {

    return NaN;
  }


  const dx =
    b[0] - a[0];

  const dy =
    b[1] - a[1];


  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}