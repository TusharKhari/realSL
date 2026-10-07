import { Building } from "./core/Building.js";
import { validateBuildingJSON } from "./validation/validateBuilding.js";
import { Renderer2D } from "./renderer2d/renderer2d.js";
import { Scene3D } from "./renderer3d/scene.js";
import { SnapManager } from "./editor/snapping.js";
import { SelectionManager } from "./editor/selection.js";
import { JsonEditor } from "./editor/jsonEditor.js";
import { InteractionController } from "./editor/interactions.js";

// ============================================================
// APP DOM ELEMENTS
// ============================================================

const canvas = document.getElementById("canvas");
const grid = document.getElementById("grid");
const rooms = document.getElementById("rooms");
const buildingLayer = document.getElementById("building");
const doors = document.getElementById("doors");
const windows = document.getElementById("windows");
const dimensionsLayer = document.getElementById("dimensions");
const selectionLayer = document.getElementById("selection");
const newWallPreview = document.getElementById("new-wall-preview");
const snapIndicators = document.getElementById("snap-indicators");

const levelSelector = document.getElementById("level-selector");
const propertyContent = document.getElementById("property-content");
const jsonOutput = document.getElementById("json-output");
const status = document.getElementById("status");

// Snapping Checkboxes
const snapGridCb = document.getElementById("snap-grid-cb");
const snapEndpointsCb = document.getElementById("snap-endpoints-cb");
const snapIntersectionsCb = document.getElementById("snap-intersections-cb");
const snapAnglesCb = document.getElementById("snap-angles-cb");
const showDimensionsCb = document.getElementById("show-dimensions-cb");

// Tool Buttons
const selectToolBtn = document.getElementById("select-tool");
const panToolBtn = document.getElementById("pan-tool");
const moveToolBtn = document.getElementById("move-tool");
const newWallToolBtn = document.getElementById("new-wall-tool");
const deleteToolBtn = document.getElementById("delete-tool");

const modeSimpleBtn = document.getElementById("mode-simple-btn");
const modePlanBtn = document.getElementById("mode-plan-btn");
const modeIsometricBtn = document.getElementById("mode-isometric-btn");

// ============================================================
// STATE & CONTROLLERS
// ============================================================

let building = null;
let scene3D = null;
let jsonEditor = null;

const renderer2D = new Renderer2D({
  elements: {
    grid,
    rooms,
    buildingLayer,
    doors,
    windows,
    dimensionsLayer,
    selectionLayer
  }
});

const snapManager = new SnapManager({ gridSize: 0.25, snapDistance: 0.35 });

const selectionManager = new SelectionManager({
  propertyContent,
  onSelectionChange: selectedId => {
    renderer2D.selectedWallId = selectedId;
    updateUI();
  }
});

const interactions = new InteractionController({
  canvas,
  snapIndicators,
  newWallPreview,
  renderer2D,
  snapManager,
  selectionManager,
  onModelChanged: () => updateUI(),
  onStatusChange: msg => updateStatus(msg)
});

// ============================================================
// UI SYNC & RENDER
// ============================================================

function updateStatus(msg) {
  if (status) status.textContent = msg;
}

function updateJSONOutput() {
  if (building && jsonOutput) {
    jsonOutput.textContent = building.toJSONString();
  }
}

function updateUI() {
  if (!building) return;

  interactions.building = building;
  renderer2D.render(building);
  selectionManager.updateProperties(building);
  updateJSONOutput();

  if (scene3D) {
    scene3D.refresh();
  }
}

function populateLevelSelector() {
  if (!levelSelector || !building) return;
  levelSelector.innerHTML = "";

  const levels = building.getLevels();
  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = `${level.id} (${level.elevation}m)`;
    levelSelector.appendChild(option);
  }

  if (levels.length > 0) {
    renderer2D.activeLevelId = levels[0].id;
    levelSelector.value = renderer2D.activeLevelId;
  }
}

// ============================================================
// TOOLBAR LISTENERS
// ============================================================

function setActiveTool(toolName) {
  interactions.setTool(toolName);
  [selectToolBtn, panToolBtn, moveToolBtn, newWallToolBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (toolName === "select" && selectToolBtn) selectToolBtn.classList.add("active");
  if (toolName === "pan" && panToolBtn) panToolBtn.classList.add("active");
  if (toolName === "move" && moveToolBtn) moveToolBtn.classList.add("active");
  if (toolName === "new-wall" && newWallToolBtn) newWallToolBtn.classList.add("active");

  updateStatus(`Tool: ${toolName.toUpperCase()}`);
}

if (selectToolBtn) selectToolBtn.addEventListener("click", () => setActiveTool("select"));
if (panToolBtn) panToolBtn.addEventListener("click", () => setActiveTool("pan"));
if (moveToolBtn) moveToolBtn.addEventListener("click", () => setActiveTool("move"));
if (newWallToolBtn) newWallToolBtn.addEventListener("click", () => setActiveTool("new-wall"));

if (deleteToolBtn) {
  deleteToolBtn.addEventListener("click", () => {
    if (selectionManager.selectedWallId && building) {
      const wallId = selectionManager.selectedWallId;
      building.deleteWall(wallId);
      selectionManager.clearSelection(building);
      updateStatus(`Deleted ${wallId}`);
      updateUI();
    }
  });
}

function setViewMode(mode) {
  renderer2D.viewMode = mode;
  [modeSimpleBtn, modePlanBtn, modeIsometricBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (mode === "simple" && modeSimpleBtn) modeSimpleBtn.classList.add("active");
  if (mode === "plan" && modePlanBtn) modePlanBtn.classList.add("active");
  if (mode === "isometric" && modeIsometricBtn) modeIsometricBtn.classList.add("active");

  updateUI();
}

if (modeSimpleBtn) modeSimpleBtn.addEventListener("click", () => setViewMode("simple"));
if (modePlanBtn) modePlanBtn.addEventListener("click", () => setViewMode("plan"));
if (modeIsometricBtn) modeIsometricBtn.addEventListener("click", () => setViewMode("isometric"));

function updateSnappingOptions() {
  interactions.snappingOptions = {
    grid: snapGridCb ? snapGridCb.checked : true,
    endpoints: snapEndpointsCb ? snapEndpointsCb.checked : true,
    intersections: snapIntersectionsCb ? snapIntersectionsCb.checked : true,
    angles: snapAnglesCb ? snapAnglesCb.checked : true
  };
  renderer2D.showDimensions = showDimensionsCb ? showDimensionsCb.checked : true;
  updateUI();
}

[snapGridCb, snapEndpointsCb, snapIntersectionsCb, snapAnglesCb, showDimensionsCb].forEach(cb => {
  if (cb) cb.addEventListener("change", updateSnappingOptions);
});

if (levelSelector) {
  levelSelector.addEventListener("change", () => {
    renderer2D.activeLevelId = levelSelector.value;
    selectionManager.clearSelection(building);
    updateUI();
    updateStatus(`Active Level: ${renderer2D.activeLevelId}`);
  });
}

// ============================================================
// INITIALIZATION & TAB SWITCHING
// ============================================================

async function loadBuildingData() {
  try {
    const response = await fetch("./data/building.json");
    if (!response.ok) throw new Error("Could not load data/building.json");

    const jsonText = await response.text();
    const errors = validateBuildingJSON(jsonText);

    if (errors.length > 0) {
      updateStatus(`Validation error in data/building.json`);
      return;
    }

    const data = JSON.parse(jsonText);
    building = new Building(data);
    interactions.building = building;

    renderer2D.centerOnBuilding(building);
    populateLevelSelector();

    // Initialize JSON Editor
    const jsonEditorTextArea = document.getElementById("json-editor");
    const jsonErrorElement = document.getElementById("json-error");

    jsonEditor = new JsonEditor({
      textarea: jsonEditorTextArea,
      errorElement: jsonErrorElement,
      onBuildingChanged: (newBuilding, json) => {
        building = newBuilding;
        interactions.building = newBuilding;
        populateLevelSelector();
        updateUI();
        updateStatus("Building model updated from JSON Editor");
      }
    });

    jsonEditor.setBuilding(data);

    // JSON Toolbar Actions
    const formatBtn = document.getElementById("format-json");
    if (formatBtn) {
      formatBtn.addEventListener("click", () => jsonEditor.format());
    }

    const applyBtn = document.getElementById("apply-json");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => jsonEditor.handleInput());
    }

    // View Navigation Tabs
    const tabBtns = document.querySelectorAll(".view-tabs .tab-btn");
    const views = document.querySelectorAll(".views .view");

    tabBtns.forEach(tab => {
      tab.addEventListener("click", () => {
        const selected = tab.dataset.view;

        tabBtns.forEach(t => t.classList.toggle("active", t === tab));
        views.forEach(view => {
          view.classList.toggle("active", view.id === `view-${selected}`);
        });

        if (selected === "3d") {
          if (!scene3D) {
            const container3d = document.getElementById("canvas-3d");
            scene3D = new Scene3D(container3d, building);
          } else {
            scene3D.resize();
            scene3D.refresh();
          }
          updateStatus("3D WebGL View Active");
        } else if (selected === "json") {
          if (jsonEditor && building) {
            jsonEditor.setBuilding(building.toJSON());
          }
          updateStatus("JSON Editor Active");
        } else if (selected === "2d") {
          updateUI();
          updateStatus(`Active Level: ${renderer2D.activeLevelId || 'ground-floor'}`);
        }
      });
    });

    updateUI();
    updateStatus(`Multi-Level Building Loaded (${building.getLevels().length} levels)`);
  } catch (err) {
    console.error(err);
    updateStatus(`Error: ${err.message}`);
  }
}

window.addEventListener("resize", () => {
  if (building) renderer2D.render(building);
  if (scene3D) scene3D.resize();
});

loadBuildingData();
