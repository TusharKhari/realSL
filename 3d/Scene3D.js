import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createWallMesh } from "./WallMesh.js";
import { createRoomFloor } from "./FloorMesh.js";
import { createDoorMesh } from "./DoorMesh.js";
import { createWindowMesh } from "./WindowMesh.js";

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
    this.camera.position.set(12, 12, 16);

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
    this.controls.target.set(5, 1, -3);

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
    sun.position.set(15, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;

    this.scene.add(sun);
  }

  createHelpers() {
    const grid = new THREE.GridHelper(50, 50, 0x38bdf8, 0x334155);
    grid.position.y = -0.01;
    this.scene.add(grid);

    const axes = new THREE.AxesHelper(4);
    this.scene.add(axes);
  }

  renderBuilding() {
    // Clear old geometry
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

    // WALLS
    for (const wall of this.building.getWalls()) {
      const mesh = createWallMesh(wall);
      if (mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.buildingGroup.add(mesh);
      }
    }

    // ROOM FLOORS
    for (const room of this.building.getRooms()) {
      const floor = createRoomFloor(room);
      if (floor) {
        floor.receiveShadow = true;
        this.buildingGroup.add(floor);
      }
    }

    // DOORS
    for (const door of this.building.getDoors()) {
      const doorMesh = createDoorMesh(door);
      if (doorMesh) {
        doorMesh.castShadow = true;
        this.buildingGroup.add(doorMesh);
      }
    }

    // WINDOWS
    for (const win of this.building.getWindows()) {
      const winMesh = createWindowMesh(win);
      if (winMesh) {
        this.buildingGroup.add(winMesh);
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
