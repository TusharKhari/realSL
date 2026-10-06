import * as THREE from "three";

export function createStairMesh(
  stair,
  building
) {
  const levelFrom =
    building.getLevel(
      stair.levelFrom
    );

  const levelTo =
    building.getLevel(
      stair.levelTo
    );

  if (!levelFrom || !levelTo) {
    return null;
  }

  const rise =
    levelTo.elevation -
    levelFrom.elevation;

  if (rise <= 0) {
    return null;
  }

  const stepHeight =
    rise /
    stair.steps;

  const group =
    new THREE.Group();

  const stepDepth =
    0.28;

  const material =
    new THREE.MeshStandardMaterial({
      color:
        0x888888,
      roughness:
        0.8
    });

  for (
    let i = 0;
    i < stair.steps;
    i++
  ) {
    const height =
      stepHeight *
      (i + 1);

    const geometry =
      new THREE.BoxGeometry(
        stair.width,
        height,
        stepDepth
      );

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    mesh.position.set(
      stair.position[0],
      levelFrom.elevation +
        height / 2,
      -(stair.position[1] + i * stepDepth)
    );

    mesh.castShadow =
      true;

    mesh.receiveShadow =
      true;

    mesh.userData.stairId =
      stair.id;

    group.add(
      mesh
    );
  }

  group.userData.stairId =
    stair.id;

  group.userData.levelFrom =
    stair.levelFrom;

  group.userData.levelTo =
    stair.levelTo;

  return group;
}
