import { Matrix4, Vector3,
  DirectionalLight, AmbientLight,
  PerspectiveCamera,
  Scene, WebGLRenderer,
} from "three";
import { IFCLoader } from "web-ifc-three/IFCLoader";
 
mapboxgl.accessToken =
"pk.eyJ1IjoiaGVsbG9jYW1wdXMiLCJhIjoiY2s5ZXJzb3p2MDQyNjNubmFwamhjY2QxaSJ9.V1h-nWURu5W1qjZMFEu4wg";

const map = new mapboxgl.Map({
container: "map",
style: "mapbox://styles/mapbox/light-v10",
center: [-2.920623914471131, 43.26580774550051],
zoom: 16.5,
pitch: 60
});

let isRotating = true;

function rotateCamera(timestamp) {
// clamp the rotation between 0 -360 degrees
// Divide timestamp by 100 to slow rotation to ~10 degrees / sec
map.rotateTo((timestamp / 100) % 360, { duration: 0 });
// Request the next frame of the animation.
if (isRotating !== false) {
  requestAnimationFrame(rotateCamera);
}
}


class CustomControl {
  onAdd(map) {
	
	  this._map = map;
	  this._container = document.createElement('button');
	  this._container.className = 'mapboxgl-ctrl';
	  this._container.textContent = 'start rotate';
	  this._container.onclick = () => {
		if (this.isRotating) {
		  isRotating = false;
		  rotateCamera(false);
		  this._container.textContent = 'start rotate';
		}
		else {
		  isRotating = true;
		  rotateCamera(0);
		  this._container.textContent = 'stop rotate';
		}
		this.isRotating = ! this.isRotating;
	  }
	  return this._container;
  }

  onRemove() {
	  this._container.parentNode.removeChild(this._container);
	  this._map = undefined;
  }
}

map.addControl(new mapboxgl.NavigationControl({
	showCompass: true,
	visualizePitch: true
	}));
	
	map.addControl(new CustomControl());
	
	
	
const popup = new mapboxgl.Popup({
	offset: 60,
	className: 'popup',
	closeButton: false,
	closeOnClick: false,
  })
	.setHTML('<h5>Joy Constructions</h5>')
	.setLngLat([-2.920623914471131, 43.26580774550051])
	.addTo(map);
  
  
  
  


const modelOrigin = [-2.920623914471131, 43.26580774550051];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, .72, 0];
 
const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);
 
const modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  rotateX: modelRotate[0],
  rotateY: modelRotate[1],
  rotateZ: modelRotate[2],
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};
 
const scene = new Scene();
const camera = new PerspectiveCamera();
const renderer = new WebGLRenderer({
  canvas: map.getCanvas(),
  antialias: true,
});
renderer.autoClear = false;

const customLayer = {

  id: '3d-model',
  type: 'custom',
  renderingMode: '3d',

  onAdd: function () {
    const ifcLoader = new IFCLoader();
    ifcLoader.ifcManager.setWasmPath( '../../../' );
    ifcLoader.load( '../../../IFC/01.ifc', function ( model ) {
      scene.add( model );
    });

    const directionalLight = new DirectionalLight(0x404040);
    const directionalLight2 = new DirectionalLight(0x404040);
    const ambientLight = new AmbientLight( 0x404040, 3 );

    directionalLight.position.set(0, -70, 100).normalize();
    directionalLight2.position.set(0, 70, 100).normalize();

    scene.add(directionalLight, directionalLight2, ambientLight);
},

  render: function (gl, matrix) {
    const rotationX = new Matrix4().makeRotationAxis(
    new Vector3(1, 0, 0), modelTransform.rotateX);
    const rotationY = new Matrix4().makeRotationAxis(
    new Vector3(0, 1, 0), modelTransform.rotateY);
    const rotationZ = new Matrix4().makeRotationAxis(
    new Vector3(0, 0, 1), modelTransform.rotateZ);
  
    const m = new Matrix4().fromArray(matrix);
    const l = new Matrix4()
    .makeTranslation(
    modelTransform.translateX,
    modelTransform.translateY,
    modelTransform.translateZ
    )
    .scale(
    new Vector3(
    modelTransform.scale,
    -modelTransform.scale,
    modelTransform.scale)
    )
    .multiply(rotationX)
    .multiply(rotationY)
    .multiply(rotationZ);
    
    camera.projectionMatrix = m.multiply(l);
    renderer.resetState();
    renderer.render(scene, camera);
    map.triggerRepaint();
  }
};
 
map.on('style.load', () => {
  map.addLayer(customLayer, 'waterway-label');
});

map.on('load', () => {
// Insert the layer beneath any symbol layer.
  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(
      (layer) => layer.type === 'symbol' && layer.layout['text-field']
  ).id;

// The 'building' layer in the Mapbox Streets
// vector tileset contains building height data
// from OpenStreetMap.
  map.addLayer(
      {
        'id': 'add-3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',

          // Use an 'interpolate' expression to
          // add a smooth transition effect to
          // the buildings as the user zooms in.
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      },
      labelLayerId
  );
});

