import * as THREE from "three";

export function createDoorMesh(door) {
  const wall = door.getWall();
  if (!wall) return null;

  const center = door.getPosition();
  if (!center) return null;

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
    door.height / 2,
    -center[1]
  );
  mesh.rotation.y = angle;

  mesh.userData.doorId = door.id;
  return mesh;
}
