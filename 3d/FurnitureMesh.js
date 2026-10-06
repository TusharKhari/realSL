import * as THREE from "three";

function createSofa() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x3f6f9f,
    roughness: 0.8
  });

  // Seat
  const seatGeometry = new THREE.BoxGeometry(2, 0.35, 0.9);
  const seat = new THREE.Mesh(seatGeometry, material);
  seat.position.y = 0.35;
  group.add(seat);

  // Back
  const backGeometry = new THREE.BoxGeometry(2, 1, 0.25);
  const back = new THREE.Mesh(backGeometry, material);
  back.position.set(0, 0.85, -0.325);
  group.add(back);

  // Left arm
  const armGeometry = new THREE.BoxGeometry(0.25, 0.65, 0.9);
  const leftArm = new THREE.Mesh(armGeometry, material);
  leftArm.position.set(-0.875, 0.55, 0);
  group.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, material);
  rightArm.position.set(0.875, 0.55, 0);
  group.add(rightArm);

  return group;
}

function createTable() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.8
  });

  // Table top
  const topGeometry = new THREE.BoxGeometry(1.5, 0.15, 0.9);
  const top = new THREE.Mesh(topGeometry, material);
  top.position.y = 0.8;
  group.add(top);

  // Four legs
  const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
  const positions = [
    [-0.65, 0.4, -0.35],
    [ 0.65, 0.4, -0.35],
    [-0.65, 0.4,  0.35],
    [ 0.65, 0.4,  0.35]
  ];

  for (const position of positions) {
    const leg = new THREE.Mesh(legGeometry, material);
    leg.position.set(...position);
    group.add(leg);
  }

  return group;
}

function createGenericFurniture() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x777777
  });
  return new THREE.Mesh(geometry, material);
}

export function createFurnitureMesh(furniture, building) {
  let group;

  switch (furniture.type) {
    case "sofa":
      group = createSofa();
      break;
    case "table":
      group = createTable();
      break;
    default:
      group = createGenericFurniture();
      break;
  }

  const level = building ? building.getLevel(furniture.levelId) : null;
  const elevation = level ? level.elevation : 0;

  group.position.set(
    furniture.position[0],
    elevation,
    -furniture.position[1]
  );

  group.rotation.y = THREE.MathUtils.degToRad(-furniture.rotation);

  group.scale.set(
    furniture.scale[0],
    furniture.scale[1],
    furniture.scale[2]
  );

  group.userData.furnitureId = furniture.id;
  group.userData.type = furniture.type;
  group.userData.levelId = furniture.levelId;

  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}
