import * as THREE from "three";

export function createWindowMesh(win) {
  const wall = win.getWall();
  if (!wall) return null;

  const center = win.getPosition();
  if (!center) return null;

  const dx = wall.end[0] - wall.start[0];
  const dy = wall.end[1] - wall.start[1];
  const angle = Math.atan2(dy, dx);

  const geometry = new THREE.BoxGeometry(
    win.width,
    win.height,
    wall.thickness * 1.15
  );

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    transmission: 0.8,
    thickness: 0.5
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    center[0],
    win.sillHeight + win.height / 2,
    -center[1]
  );
  mesh.rotation.y = angle;

  mesh.userData.windowId = win.id;
  return mesh;
}
