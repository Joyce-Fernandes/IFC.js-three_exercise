import { projects } from "./projects.js";
import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  Raycaster,
  Vector2,
  WebGLRenderer,
  MeshLambertMaterial,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { IfcViewerAPI } from "web-ifc-viewer";


const currentUrl = window.location.href;
const url = new URL(currentUrl);
const currentProjectID = url.searchParams.get("id");
let preselectModel = { id: -1 };
const propertiesDiv = document.getElementById("properties");
propertiesDiv.style.display = "none";
const preselectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.9,
  color: 0xff88ff,
  depthTest: true,
});


const currentProject = projects.find(
  (project) => project.id === currentProjectID
);
const projectURL = currentProject.url;
const title = document.getElementById("title");
title.innerText = currentProject.name;

const threeCanvas = document.getElementById("model-viewer");

const scene = new Scene();
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 2);
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

const renderer = new WebGLRenderer();
renderer.setClearColor(0xffffff);
threeCanvas.appendChild(renderer.domElement);
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);
const ifcModels = [];
const ifcLoader = new IFCLoader();
let model = null;

async function loadIfc() {
  await ifcLoader.loadAsync(projectURL).then((m) => {
    model = m;
    scene.add(m);
    ifcModels.push(m);
    return m;
  });
  
}
let spatial = null;
async function init() {
  await loadIfc();
  spatial = await ifcLoader.ifcManager.getSpatialStructure(model.modelID);
  createTreeMenu(spatial);
  threeCanvas.onmousemove = (event) => {
    const found = cast(event)[0];
    highlight(found, preselectMat, preselectModel);
  };
  const ulItem = document.getElementById("myUL");
  ulItem.animate({ scrollTop: ulItem.scrollHeight }, 1000);
}

init();


// Tree view

const toggler = document.getElementsByClassName("caret");
for (let i = 0; i < toggler.length; i++) {
  toggler[i].onclick = () => {
    toggler[i].parentElement
      .querySelector(".nested")
      .classList.toggle("active");
    toggler[i].classList.toggle("caret-down");
  };
}

// Spatial tree menu

function createTreeMenu(ifcProject) {
  const root = document.getElementById("tree-root");
  removeAllChildren(root);
  const ifcProjectNode = createNestedChild(root, ifcProject);
  ifcProject.children.forEach((child) => {
    constructTreeMenuNode(ifcProjectNode, child);
  });
}

function nodeToString(node) {
  return `${node.type} - ${node.expressID}`;
}

function constructTreeMenuNode(parent, node) {
  const children = node.children;
  if (children.length === 0) {
    createSimpleChild(parent, node);
    return;
  }
  const nodeElement = createNestedChild(parent, node);
  children.forEach((child) => {
    constructTreeMenuNode(nodeElement, child);
  });
}

function createNestedChild(parent, node) {
  const content = nodeToString(node);
  const root = document.createElement("li");
  createTitle(root, content);
  const childrenContainer = document.createElement("ul");
  childrenContainer.classList.add("nested");
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement("span");
  title.classList.add("caret");
  title.onclick = () => {
    title.parentElement.querySelector(".nested").classList.toggle("active");
    title.classList.toggle("caret-down");
  };
  title.textContent = content;
  parent.appendChild(title);
}

function createSimpleChild(parent, node) {
  const content = nodeToString(node);
  const childNode = document.createElement("li");
  childNode.setAttribute("id", node.expressID);
  childNode.classList.add("leaf-node");
  childNode.textContent = content;
  parent.appendChild(childNode);

  childNode.onmouseenter = async () => {
    removeIfchighlights();
    childNode.classList.add("ifchighlight");
    highlightFromSpatial(node.expressID);
  };

  childNode.onclick = async () => {
    removeHighlights();
    childNode.classList.add("highlight");
    highlightFromSpatial(node.expressID);
    selectedElementId = node.expressID;
    updateProperties();
  };
}

function removeHighlights() {
  const highlighted = document.getElementsByClassName("highlight");
  for (let h of highlighted) {
    if (h) {
      h.classList.remove("highlight");
    }
  }
}

function removeIfchighlights() {
  const highlighted = document.getElementsByClassName("ifchighlight");
  for (let h of highlighted) {
    if (h) {
      h.classList.remove("ifchighlight");
    }
  }
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();

function cast(event) {
  
  const bounds = threeCanvas.getBoundingClientRect();

  const x1 = event.clientX - bounds.left;
  const x2 = bounds.right - bounds.left;
  mouse.x = (x1 / x2) * 2 - 1;

  const y1 = event.clientY - bounds.top;
  const y2 = bounds.bottom - bounds.top;
  mouse.y = -(y1 / y2) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  return raycaster.intersectObjects(ifcModels);
}

let selectedElementId = null;
async function pick(event) {
  const found = cast(event)[0];
  if (found) {
    const index = found.faceIndex;
    const geometry = found.object.geometry;
    const ifc = ifcLoader.ifcManager;
    const id = ifcLoader.ifcManager.getExpressId(geometry, index);
    selectedElementId = id;
    await updateProperties();
    propertiesDiv.style.display = "block";
  }
}

function highlightFromSpatial(id) {
  ifcLoader.ifcManager.createSubset({
    modelID: model.modelID,
    ids: [id],
    material: preselectMat,
    scene: scene,
    removePrevious: true,
  });
}
function highlight(found, material, model) {
  const modelId = model.modelID;
  if (found) {
    
    const modelId = found.object.modelID;
    const index = found.faceIndex;
    const geometry = found.object.geometry;
    const id = ifcLoader.ifcManager.getExpressId(geometry, index);

    ifcLoader.ifcManager.createSubset({
      modelID: modelId,
      ids: [id],
      material: material,
      scene: scene,
      removePrevious: true,
    });
  } else {

    ifcLoader.ifcManager.removeSubset(modelId, material);
  }
}

threeCanvas.ondblclick = (event) => pick(event);

const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();



window.addEventListener("resizePainel", () => {
  (size.width = window.innerWidth), (size.height = window.innerHeight);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();

  renderer.setSize(size.width, size.height);
});

const tabs = document.getElementsByClassName("tabifc");

for (const tab of tabs) {
  tab.addEventListener("click", (event) => {
    openTab(event, tab.value);
  });
}

async function openTab(evt, cityName) {

  updateProperties();
  var i, tabdata, tabifc;
  tabdata = document.getElementsByClassName("tabdata");
  for (i = 0; i < tabdata.length; i++) {
    tabdata[i].style.display = "none";
  }

  tabifc = document.getElementsByClassName("tabifc");
  for (i = 0; i < tabifc.length; i++) {
    tabifc[i].className = tabifc[i].className.replace(" active", "");
  }

  const activeTab = document.getElementById(cityName);

  activeTab.style.display = "block";
  evt.currentTarget.className += " active";
}

async function updateProperties() {
  const attributesTab = document.getElementById("Attributes");
  const psetsTab = document.getElementById("psets");
  const materialsTab = document.getElementById("Materials");
  const psets = await ifcLoader.ifcManager.getPropertySets(
    model.modelID,
    selectedElementId,
    true
  );

  const npropDiv = document.createElement("div");
  psetsTab.innerHTML = "";
  psetsTab.appendChild(await psetsviewer(psets));
  psetsTab.appendChild(npropDiv);

  const props = await ifcLoader.ifcManager.getItemProperties(
    model.modelID,
    selectedElementId,
    true
  );
  const propDiv = document.createElement("div");
  attributesTab.innerHTML = "";
  propDiv.appendChild(await attviewer(props));
  attributesTab.appendChild(propDiv);
  activateCollapsible();

  const materialprop = await ifcLoader.ifcManager.getMaterialsProperties(
    model.modelID,
    selectedElementId,
    true
  );
  const matDive = document.createElement("div");
  materialsTab.innerHTML = "";
  matDive.appendChild(await materialviewer(materialprop));
  materialsTab.appendChild(matDive);
  console.log(materialprop);
}

async function materialviewer(materials) {
  const div = document.createElement("div");
  const table = document.createElement("table");
  const header = document.createElement("tr");
  header.innerHTML = `<th>Material</th><th>Thickness</th>`;

  for (const material of materials) {
    
    if (material.ForLayerSet) {
      table.appendChild(header);
      for (const mat of material.ForLayerSet.MaterialLayers) {
        console.log(mat.Material.Name.value, mat.LayerThickness.value);
        const row = document.createElement("tr");
        row.innerHTML = `<td>${mat.Material.Name.value}</td><td>${
          Math.round(mat.LayerThickness.value * 1000) / 1000
        }</td>`;
        table.appendChild(row);
      }
    }
  }
  div.appendChild(table);
  console.log(div);
  return div;
}

async function attviewer(element) {
  const html = document.createElement("table");
  const header = document.createElement("tr");
  header.innerHTML = `<th>Name</th><th>Value</th>`;
  html.appendChild(header);
  const guid = element.GlobalId.value;
  const guidRow = document.createElement("tr");
  guidRow.innerHTML = `<td>GlobalId</td><td>${guid}</td>`;
  const expressID = element.expressID;
  const expressIDRow = document.createElement("tr");
  expressIDRow.innerHTML = `<td>ExpressId</td><td>${expressID}</td>`;
  html.appendChild(guidRow);
  html.appendChild(expressIDRow);
  const name = element.Name.value;
  const nameRow = document.createElement("tr");
  nameRow.innerHTML = `<td>Name</td><td>${name}</td>`;
  html.appendChild(nameRow);
  const ifcType = element.__proto__.constructor.name;
  const ifcTypeRow = document.createElement("tr");
  ifcTypeRow.innerHTML = `<td>IfcType</td><td>${ifcType}</td>`;
  html.appendChild(ifcTypeRow);
  const type = element.ObjectType.value;
  const typeRow = document.createElement("tr");
  typeRow.innerHTML = `<td>Type</td><td>${type}</td>`;
  html.appendChild(typeRow);
  const tag = element.Tag.value;
  const tagRow = document.createElement("tr");
  tagRow.innerHTML = `<td>Tag</td><td>${tag}</td>`;
  html.appendChild(tagRow);

  return html;
}

async function psetsviewer(psets) {
  const html = document.createElement("div");
  for (const pset of psets) {
    const psetDiv = document.createElement("div");
    psetDiv.setAttribute("class", "collapsible");
    psetDiv.innerHTML = `${pset.Name.value}`;

    const psetContent = document.createElement("div");
    psetContent.setAttribute("class", "contents");
    const psetTable = document.createElement("table");
    const header = document.createElement("tr");
    header.innerHTML = `<th>Name</th><th>Value</th>`;
    psetTable.appendChild(header);
    for (const prop of pset.HasProperties) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${prop.Name.value ? prop.Name.value : ""}</td>
      <td>${prop.NominalValue ? prop.NominalValue.value : ""}</td>`;
      psetTable.appendChild(row);
    }
    html.appendChild(psetDiv);
    psetContent.appendChild(psetTable);
    html.appendChild(psetContent);
  }
  return html;
}

function activateCollapsible() {
  var coll = document.getElementsByClassName("collapsible");
  var i;
  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
      this.classList.toggle("colactive");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
}

