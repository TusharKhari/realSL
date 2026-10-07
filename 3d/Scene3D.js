import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createWallMesh } from "./WallMesh.js";
import { createRoomFloor } from "./FloorMesh.js";
import { createDoorMesh } from "./DoorMesh.js";
import { createWindowMesh } from "./WindowMesh.js";
import { createStairMesh } from "./StairMesh.js";
import { createFurnitureMesh } from "./FurnitureMesh.js";

export class Scene3D {
  constructor(container, building) {
    this.container = container;
    this.building = building;

    // SCENE
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    // CAMERA & SIZING (safe fallbacks ensure no NaN aspect ratio)
    const initialWidth = container.clientWidth > 0 ? container.clientWidth : Math.max(window.innerWidth / 2, 400);
    const initialHeight = container.clientHeight > 0 ? container.clientHeight : Math.max(window.innerHeight - 48, 300);

    this.camera = new THREE.PerspectiveCamera(
      60,
      initialWidth / initialHeight,
      0.1,
      1000
    );
    this.camera.position.set(16, 16, 20);

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(initialWidth, initialHeight);
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
    this.updateCameraToFit();

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

  setBuilding(building, resetCamera = false) {
    this.building = building;
    this.renderBuilding();
    if (resetCamera) {
      this.updateCameraToFit();
    }
  }

  fitCamera() {
    this.updateCameraToFit();
  }

  updateCameraToFit() {
    if (!this.buildingGroup || this.buildingGroup.children.length === 0) return;
    const box = new THREE.Box3().setFromObject(this.buildingGroup);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      this.controls.target.copy(center);

      const maxDim = Math.max(size.x, size.y, size.z, 6);
      const dist = maxDim * 1.5;

      this.camera.position.set(center.x + dist * 0.7, center.y + dist * 0.8, center.z + dist * 0.7);
      this.camera.lookAt(center);
      this.controls.update();
    }
  }

  refresh() {
    this.renderBuilding();
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
