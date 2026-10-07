import * as THREE from "three";

export function createWallMesh(wall, building) {
  const dx = wall.end[0] - wall.start[0];
  const dy = wall.end[1] - wall.start[1];
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return null;

  const centerX = (wall.start[0] + wall.end[0]) / 2;
  const centerZ = (wall.start[1] + wall.end[1]) / 2;

  const level = building ? building.getLevel(wall.levelId) : null;
  const elevation = level ? level.elevation : 0;

  const geometry = new THREE.BoxGeometry(
    length,
    wall.height,
    wall.thickness
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.6,
    metalness: 0.1
  });

  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    centerX,
    elevation + wall.height / 2,
    -centerZ
  );

  const angle = Math.atan2(dy, dx);
  mesh.rotation.y = angle;

  mesh.userData.wallId = wall.id;
  mesh.userData.levelId = wall.levelId;
  return mesh;
}
