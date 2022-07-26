import {Scene,
    BoxGeometry,
    SphereGeometry,
    MeshBasicMaterial,
    MeshPhongMaterial,
    Mesh,
    PerspectiveCamera,
    WebGLRenderer,
    MOUSE,
    Vector2,
    Vector3,
    Vector4,
    Quaternion,
    Matrix4,
    Spherical,
    Box3,
    Sphere,
    Raycaster,
    MathUtils,
    Clock,
    DirectionalLight,
    AmbientLight,
    HemisphereLight,
    PointLight,
    SpotLight,
    TextureLoader,
    LoadingManager,
    AxesHelper,
    GridHelper} 
    from 'three';
    import { IfcViewerAPI } from 'web-ifc-viewer'
import {IFCAnimationDataFrame} from './components/IFC2AnimationDataFrame'
import "./utils/jsgantt/jsgantt.js"
import {FloatingPanel} from './components/FloatingPanel'
import {SlidingMenus} from './components/SlidingMenus'
import {AnimationControls} from './components/AnimationControls'
import {ProjectTree} from './components/ProjectTree'
import { projects } from "./static/projects.js";

import CameraControls from 'camera-controls';

import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import Stats from 'stats.js/src/Stats';

const subsetOfTHREE = {
    MOUSE,
    Vector2,
    Vector3,
    Vector4,
    Quaternion,
    Matrix4,
    Spherical,
    Box3,
    Sphere,
    Raycaster,
    MathUtils: {
      DEG2RAD: MathUtils.DEG2RAD,
      clamp: MathUtils.clamp
    }
  };

import { projects } from "/static/projects.js";
const currentUrl = window.location.href;
const url = new URL(currentUrl);
const currentProjectID = url.searchParams.get("id");

// Get the current project
const currentProject = projects.find(project => project.id === currentProjectID);
const modelname = currentProject.name;
const nameBox = document.querySelector(".simple-card");
nameBox.textContent = modelname ;

//1 The scene
const canvas = document.getElementById("three-canvas");
const scene = new Scene()

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

const grid = new GridHelper();
grid.material.depthTest = false;
//grid.renderOrder = 1;
scene.add(grid);
  

//2 The Object
const geometry = new BoxGeometry(0.5, 0.5, 0.5);
const material = new MeshPhongMaterial( {color: 'orange'} );
const cubeMesh = new Mesh( geometry, material );
cubeMesh.position.y = 0.5
cubeMesh.renderOrder = 3
scene.add( cubeMesh );

//3 The Camera
const camera = new PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight);
scene.add( camera );

//4 The Renderer

const renderer = new WebGLRenderer({
    canvas: canvas,
    antialias: true,
	alpha: true,
	powerPreference: 'high-performance',
});

renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

//label renderer
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize( window.innerWidth, window.innerHeight );
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild( labelRenderer.domElement );




window.addEventListener("resize", () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });

// Lights

const light = new DirectionalLight(0xffffff, 10);
light.position.set(1, 1, 0.5);
const baseLight = new AmbientLight(0xffffff, 1);
scene.add(light, baseLight);
  
// Controls
  
CameraControls.install( { THREE: subsetOfTHREE } ); 
const clock = new Clock();
const cameraControls = new CameraControls(camera, canvas);

cameraControls.setLookAt(1, 1, 1, 0, 1, 0);

const stats = new Stats();
stats.showPanel( 2 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

// Set up raycasting

const raycaster = new Raycaster();
const mouse = new Vector2();

window.addEventListener('dblclick', (event) => {
	mouse.x = event.clientX / canvas.clientWidth * 2 - 1;
	mouse.y = - (event.clientY / canvas.clientHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObject(cubeMesh);

  if(!intersects.length) {
    return;
  }

  const firstIntersection = intersects[0];
  const location =  firstIntersection.point;

  const result = window.prompt("Introduce message:");

  const base = document.createElement( 'div' );
  base.className = 'base-label';

  const deleteButton = document.createElement( 'button' );
  deleteButton.textContent = 'X';
  deleteButton.className = 'delete-button hidden';
  base.appendChild(deleteButton);

  base.onmouseenter = () => deleteButton.classList.remove('hidden');
  base.onmouseleave = () => deleteButton.classList.add('hidden');

  const postit = document.createElement( 'div' );
  postit.className = 'label';
  postit.textContent = result;
  base.appendChild(postit);

  const ifcJsTitle = new CSS2DObject( base );
  ifcJsTitle.position.copy(location);
  scene.add(ifcJsTitle);

  deleteButton.onclick = () => {
    base.remove();
    ifcJsTitle.element = null;
    ifcJsTitle.removeFromParent();
  }

});


function animate() {

	stats.begin();

    const delta = clock.getDelta();
	cameraControls.update( delta );
	renderer.render( scene, camera );
    labelRenderer.render(scene, camera);
	stats.end();

	requestAnimationFrame( animate );

}

animate();


//Sets up the IFC loading
const ifcLoader = new IFCLoader();

  const input = document.getElementById("file-input");
  input.addEventListener(
    "change",
    (changed) => {
      const ifcURL = URL.createObjectURL(changed.target.files[0]);
      ifcLoader.load(ifcURL, (ifcModel) => scene.add(ifcModel));
    },
    false
  );