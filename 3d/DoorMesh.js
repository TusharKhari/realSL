import * as THREE from "three";

export function createDoorMesh(door, building) {
  const wall = door.getWall();
  if (!wall) return null;

  const center = door.getPosition();
  if (!center) return null;

  const level = building ? building.getLevel(door.levelId || wall.levelId) : null;
  const elevation = level ? level.elevation : 0;

  const dx = wall.end[0] - wall.start[0];
  const dy = wall.end[1] - wall.start[1];
  const angle = Math.atan2(dy, dx);

  const geometry = new THREE.BoxGeometry(
    door.width,
    door.height,
    wall.thickness * 1.1
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.4,
    metalness: 0.1
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    center[0],
    elevation + door.height / 2,
    -center[1]
  );
  mesh.rotation.y = angle;

  mesh.userData.doorId = door.id;
  mesh.userData.levelId = door.levelId || wall.levelId;
  return mesh;
}
