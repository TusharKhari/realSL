import * as THREE from "three";

export function createRoomFloor(room) {
  if (!room.boundary || room.boundary.length < 3) return null;

  const shape = new THREE.Shape();

  room.boundary.forEach((point, index) => {
    const x = point[0];
    const z = point[1];

    if (index === 0) {
      shape.moveTo(x, -z);
    } else {
      shape.lineTo(x, -z);
    }
  });

  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01; // Slightly above ground grid to prevent z-fighting

  mesh.userData.roomId = room.id;
  return mesh;
}
