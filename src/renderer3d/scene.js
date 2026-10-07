import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createWallMesh } from "./wallMesh.js";
import { createRoomFloor } from "./floorMesh.js";
import { createDoorMesh } from "./doorMesh.js";
import { createWindowMesh } from "./windowMesh.js";
import { createStairMesh } from "./stairMesh.js";
import { createFurnitureMesh } from "./furnitureMesh.js";

export class Scene3D {
  constructor(container, building) {
    this.container = container;
    this.building = building;

    // SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    // CAMERA
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(16, 16, 20);

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // ORBIT CONTROLS
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(5, 3, -3);

    // LIGHTING & HELPERS
    this.createLights();
    this.createHelpers();

    // BUILDING GROUP
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    this.renderBuilding();

    // RESIZE EVENT
    window.addEventListener("resize", () => this.resize());

    // ANIMATE LOOP
    this.animate();
  }

  createLights() {
    const ambient = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.8);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(20, 35, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;

    this.scene.add(sun);
  }

  createHelpers() {
    const grid = new THREE.GridHelper(50, 50, 0x38bdf8, 0x334155);
    grid.position.y = -0.01;
    this.scene.add(grid);

    const axes = new THREE.AxesHelper(5);
    this.scene.add(axes);
  }

  renderBuilding() {
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children.pop();
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }

    if (!this.building) return;

    // Render multi-level WALLS
    for (const wall of this.building.getWalls()) {
      const mesh = createWallMesh(wall, this.building);
      if (mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.buildingGroup.add(mesh);
      }
    }

    // Render multi-level ROOM FLOORS
    for (const room of this.building.getRooms()) {
      const floor = createRoomFloor(room, this.building);
      if (floor) {
        floor.receiveShadow = true;
        this.buildingGroup.add(floor);
      }
    }

    // Render multi-level DOORS
    for (const door of this.building.getDoors()) {
      const doorMesh = createDoorMesh(door, this.building);
      if (doorMesh) {
        doorMesh.castShadow = true;
        this.buildingGroup.add(doorMesh);
      }
    }

    // Render multi-level WINDOWS
    for (const win of this.building.getWindows()) {
      const winMesh = createWindowMesh(win, this.building);
      if (winMesh) {
        this.buildingGroup.add(winMesh);
      }
    }

    // Render multi-level STAIRS
    for (const stair of this.building.getStairs()) {
      const mesh = createStairMesh(stair, this.building);
      if (mesh) {
        this.buildingGroup.add(mesh);
      }
    }

    // Render multi-level FURNITURE
    for (const item of this.building.getFurniture()) {
      const mesh = createFurnitureMesh(item, this.building);
      if (mesh) {
        this.buildingGroup.add(mesh);
      }
    }
  }

  refresh() {
    this.renderBuilding();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
