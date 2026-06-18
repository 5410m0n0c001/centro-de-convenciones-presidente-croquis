/**
 * visualizer3d.js
 * Motor WebGL 3D basado en Three.js.
 * Mapea las coordenadas 2D (x, y) de la planta a 3D (x, z) con elevaciones Y.
 * Construye modelos tridimensionales procedurales premium para el Centro de Convenciones Presidente.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, STATIC_STRUCTURES } from "./elements.js";

let scene, camera, renderer, controls;
let container = null;
let active3dElements = {}; // { id: THREE.Group }
let currentElementsData = [];
let selectedElementId = null;
let animationFrameId = null;
let selectionRing = null;
let currentTheme = 'premium';

// Paleta de materiales PBR de gala
const COLORS = {
  floorIndoor: 0x1e293b,    // Mármol pizarra oscuro
  floorOutdoor: 0xf8fafc,   // Suelo exterior blanco minimalista
  walls: 0x334155,          // Muros estructurales gris oscuro
  tableCloth: 0xfafafa,     // Mantel blanco satinado
  chairWood: 0x78350f,      // Sillas Tiffany madera
  chairSeat: 0xd4af37,      // Cojín dorado
  gold: 0xd4af37,            // Oro selección/acentos
  emerald: 0x065f46,        // Verde esmeralda stands
  water: 0x0ea5e9,          // Agua fuente
  grass: 0x1b4332           // Césped
};

export function init3D(containerElement, initialElements, themeName = 'premium') {
  container = containerElement;
  currentElementsData = initialElements;
  currentTheme = themeName;
  
  container.innerHTML = ""; // Limpiar
  
  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(themeName === 'cad-light' ? 0xf1f5f9 : 0x090d16);
  if (themeName !== 'cad-light' && themeName !== 'minimalist') {
    scene.fog = new THREE.FogExp2(0x090d16, 0.012);
  }

  // 2. Cámara
  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(30, 32, 85); // Vista oblicua aérea
  
  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  
  // 4. Orbit Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Impedir cámara subterránea
  controls.target.set(30, 0, 40); // Centrado en el terreno (60m x 80m)
  controls.update();
  
  // 5. Configurar Iluminación
  setupLighting();
  
  // 6. Construir Estructuras Fijas del CCP (Muros, Baños, Escenario, Catwalk, Rampa, Fuente)
  createStatic3DStructures();
  
  // 7. Aro de Selección
  createSelectionRing();
  
  // 8. Cargar Objetos Dinámicos
  syncWithData(initialElements);
  
  // 9. Animar
  animate();
  
  window.addEventListener("resize", resize3D);
}

export function destroy3D() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener("resize", resize3D);
  if (renderer) {
    renderer.dispose();
  }
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  active3dElements = {};
}

export function resize3D() {
  if (!container || !camera || !renderer) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

export function resetCamera3D() {
  if (!camera || !controls) return;
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(30, 32, 85);
  const endTarget = new THREE.Vector3(30, 0, 40);
  
  let t = 0;
  function transition() {
    t += 0.05;
    if (t <= 1) {
      camera.position.lerpVectors(startPos, endPos, t);
      controls.target.lerpVectors(startTarget, endTarget, t);
      controls.update();
      requestAnimationFrame(transition);
    } else {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      controls.update();
    }
  }
  transition();
}

/* --- CONFIGURACIÓN DE ILUMINACIÓN DE GALA --- */
function setupLighting() {
  if (currentTheme === 'minimalist') {
    const amb = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(amb);
    return;
  }
  
  const isCadLight = currentTheme === 'cad-light';
  
  // Luz Ambiental (Relleno suave)
  const ambientLight = new THREE.AmbientLight(isCadLight ? 0xffffff : 0xe0e7ff, isCadLight ? 0.6 : 0.35);
  scene.add(ambientLight);
  
  // Luz del Atardecer Dorado (Direccional Principal)
  const sunLight = new THREE.DirectionalLight(0xffedd5, isCadLight ? 1.0 : 0.7);
  sunLight.position.set(40, 40, 90);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  
  const d = 50;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0002;
  scene.add(sunLight);
  
  if (!isCadLight) {
    // Foco de Acento sobre Escenario y Pasarela (Violeta Cálido)
    const stageSpot = new THREE.SpotLight(0xa78bfa, 3.0, 30, Math.PI/4, 0.4, 1);
    stageSpot.position.set(30, 15, 26);
    stageSpot.target.position.set(30, 0, 26);
    stageSpot.castShadow = true;
    scene.add(stageSpot);
    scene.add(stageSpot.target);

    // Luces indirectas sumergidas en la fuente (Celeste cian)
    const ft = STATIC_STRUCTURES.garden.fountain;
    const fountainLight = new THREE.PointLight(0x0ea5e9, 2.5, 12);
    fountainLight.position.set(ft.x, 1.0, ft.y);
    scene.add(fountainLight);
  }
}

/* --- CONSTRUCCIÓN DE LAS ESTRUCTURAS ESTATICAS (EDIFICIO) --- */
function createStatic3DStructures() {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  // Materiales de la estructura
  const groundMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadL ? 0xf8fafc : (isCadD ? 0x000000 : COLORS.floorOutdoor)),
    roughness: 0.9,
    metalness: 0.02
  });
  
  const salonFloorMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadL ? 0xe2e8f0 : (isCadD ? 0x000000 : 0x1e293b)),
    roughness: 0.4,
    metalness: 0.1
  });

  const wallColor = isBw ? 0x000000 : (isCadL ? 0x475569 : (isCadD ? 0x00ff00 : COLORS.walls));
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.8,
    metalness: 0.05
  });

  // A) Suelo base del Terreno (60m x 80m)
  const groundGeom = new THREE.BoxGeometry(60, 0.2, 80);
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.position.set(30, -0.1, 40);
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Cuadrícula CAD sobre el terreno
  if (!isBw) {
    const gridHelper = new THREE.GridHelper(80, 80, 0x64748b, 0x334155);
    gridHelper.position.set(30, 0.01, 40);
    gridHelper.material.opacity = isCadD ? 0.35 : 0.15;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
  }

  // B) Suelo del Salón Techado (Plataforma elevada 0.05m)
  // Posición: x:10-50, z:18-62 (40m x 44m)
  const salonGeom = new THREE.BoxGeometry(40, 0.05, 44);
  const salonFloor = new THREE.Mesh(salonGeom, salonFloorMat);
  salonFloor.position.set(30, 0.025, 40);
  salonFloor.receiveShadow = true;
  scene.add(salonFloor);

  // C) Jardín exterior y Fuente
  if (!isBw && !isCadD) {
    const gd = STATIC_STRUCTURES.garden;
    const gardenGeom = new THREE.BoxGeometry(gd.w, 0.02, gd.h);
    const gardenMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.9 });
    const garden = new THREE.Mesh(gardenGeom, gardenMat);
    // Jardín en la parte inferior (y=62-78)
    garden.position.set(30, 0.03, 70);
    garden.receiveShadow = true;
    scene.add(garden);
    
    // Fuente 3D
    const ft = gd.fountain;
    const ftGroup = new THREE.Group();
    ftGroup.position.set(ft.x, 0.04, ft.y);
    
    // Anillo de piedra exterior
    const rimGeom = new THREE.CylinderGeometry(ft.radius, ft.radius, 0.4, 24);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.y = 0.2;
    rim.castShadow = true;
    ftGroup.add(rim);

    // Vaso de agua interno
    const waterGeom = new THREE.CylinderGeometry(ft.radius - 0.3, ft.radius - 0.3, 0.3, 24);
    const waterMat = new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.y = 0.22;
    ftGroup.add(water);

    // Chorro de agua central (física simulada por 3 cilindros traslúcidos concéntricos)
    const jetGeom = new THREE.CylinderGeometry(0.05, 0.3, 1.8, 12);
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 });
    const jet = new THREE.Mesh(jetGeom, jetMat);
    jet.position.y = 1.1;
    ftGroup.add(jet);
    
    scene.add(ftGroup);
  }

  // D) Muros del Salón (Doble altura: 6.0m de alto)
  // Muro Superior (z=18, x:10-50, ancho=40, alto=6, espesor=0.3)
  const wallTop = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 0.3), wallMat);
  wallTop.position.set(30, 3.0, 18.0);
  wallTop.castShadow = true;
  wallTop.receiveShadow = true;
  scene.add(wallTop);

  // Muro Izquierdo (x=10, z:18-62, largo=44, alto=6, espesor=0.3)
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 44), wallMat);
  wallLeft.position.set(10.0, 3.0, 40.0);
  wallLeft.castShadow = true;
  wallLeft.receiveShadow = true;
  scene.add(wallLeft);

  // Muro Derecho (x=50, z:18-62, largo=44, alto=6, espesor=0.3)
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 44), wallMat);
  wallRight.position.set(50.0, 3.0, 40.0);
  wallRight.castShadow = true;
  wallRight.receiveShadow = true;
  scene.add(wallRight);

  // Muro Inferior (z=62, con entrada central de 8m: x:26-34 libre)
  // Lado izquierdo inferior: x:10-26 (ancho=16)
  const wallInfL = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.3), wallMat);
  wallInfL.position.set(18.0, 3.0, 62.0);
  wallInfL.castShadow = true;
  wallInfL.receiveShadow = true;
  scene.add(wallInfL);
  // Lado derecho inferior: x:34-50 (ancho=16)
  const wallInfR = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.3), wallMat);
  wallInfR.position.set(42.0, 3.0, 62.0);
  wallInfR.castShadow = true;
  wallInfR.receiveShadow = true;
  scene.add(wallInfR);

  // Columnas interiores (Aportan diseño premium y soporte visual)
  const colGeom = new THREE.BoxGeometry(0.5, 6, 0.5);
  for (let z = 22; z < 60; z += 6) {
    const colL = new THREE.Mesh(colGeom, wallMat);
    colL.position.set(10.35, 3.0, z);
    colL.castShadow = true;
    scene.add(colL);

    const colR = new THREE.Mesh(colGeom, wallMat);
    colR.position.set(49.65, 3.0, z);
    colR.castShadow = true;
    scene.add(colR);
  }

  // E) Baños WC (Muros de división interna: altura=3m)
  STATIC_STRUCTURES.bathrooms.forEach(bath => {
    const wcG = new THREE.Group();
    wcG.position.set(bath.x + bath.w/2, 0, bath.y + bath.h/2);
    
    // Caja de muros 3D
    const wH = 3.0; // Altura WC
    const wcWallMat = new THREE.MeshStandardMaterial({
      color: isBw ? 0x000000 : (isCadL ? 0x64748b : (isCadD ? 0x00ffff : 0x475569)),
      roughness: 0.6
    });

    const boxGeom = new THREE.BoxGeometry(bath.w, wH, bath.h);
    const box = new THREE.Mesh(boxGeom, wcWallMat);
    box.position.y = wH / 2;
    box.castShadow = true;
    wcG.add(box);
    scene.add(wcG);
  });

  // F) Escenario (Stage) en Media Luna (Altura=0.8m)
  // Escenario centrado en x:30, z:18, radio=8.
  const stg = STATIC_STRUCTURES.stage;
  const stageG = new THREE.Group();
  stageG.position.set(stg.x, 0.05, stg.y);
  
  // Modelado procedural de media luna
  const stageMeshGeom = new THREE.CylinderGeometry(stg.radiusX, stg.radiusX, stg.heightZ, 32, 1, false, 0, Math.PI);
  const stageMeshMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadD ? 0xff00ff : 0x5c3d2e), // Madera rojiza
    roughness: 0.5
  });
  const stageMesh = new THREE.Mesh(stageMeshGeom, stageMeshMat);
  stageMesh.rotation.y = Math.PI; // Rotar para apuntar hacia adelante
  stageMesh.position.y = stg.heightZ / 2;
  stageMesh.receiveShadow = true;
  stageMesh.castShadow = true;
  stageG.add(stageMesh);
  
  // Frontal iluminado con LED
  if (!isBw && !isCadD && !isCadL) {
    const ledGeom = new THREE.CylinderGeometry(stg.radiusX + 0.02, stg.radiusX + 0.02, 0.06, 32, 1, true, 0, Math.PI);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.rotation.y = Math.PI;
    led.position.y = 0.05;
    stageG.add(led);
  }
  
  scene.add(stageG);

  // G) Pasarela en T (Altura=0.6m)
  const cw = stg.catwalk;
  const catwalkG = new THREE.Group();
  
  const catwalkMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadD ? 0xff00ff : 0x5c3d2e),
    roughness: 0.5
  });

  // Tallo central (ancho 2m, largo 8m, altura 0.6m)
  const stem = new THREE.Mesh(new THREE.BoxGeometry(cw.w, cw.heightZ, cw.h - cw.tBarH), catwalkMat);
  // Centrado en z = cw.y + (cw.h - cw.tBarH)/2
  const stemZ = cw.y + (cw.h - cw.tBarH)/2;
  stem.position.set(cw.x, cw.heightZ/2 + 0.05, stemZ);
  stem.receiveShadow = true;
  stem.castShadow = true;
  catwalkG.add(stem);

  // Barra de la T (ancho 6m, espesor 1.8m)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(cw.tBarW, cw.heightZ, cw.tBarH), catwalkMat);
  const barZ = cw.y + cw.h - cw.tBarH/2;
  bar.position.set(cw.x, cw.heightZ/2 + 0.05, barZ);
  bar.receiveShadow = true;
  bar.castShadow = true;
  catwalkG.add(bar);
  scene.add(catwalkG);

  // H) Rampa de Acceso (Wedge triangular)
  const ent = STATIC_STRUCTURES.entrance;
  const rampShape = new THREE.Shape();
  // Visto de perfil (eje Z de la rampa)
  rampShape.moveTo(0, 0);
  rampShape.lineTo(ent.h, 0); // Largo 6m
  rampShape.lineTo(ent.h, ent.rampHeightZ); // Sube a 0.4m
  rampShape.closePath();
  
  const extrudeSettings = { depth: ent.rampWidth, bevelEnabled: false };
  const rampGeom = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
  const rampMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadD ? 0x888888 : 0x475569),
    roughness: 0.7
  });
  const ramp = new THREE.Mesh(rampGeom, rampMat);
  // Alinear en Z, elevar en Y, rotar en Y
  ramp.position.set(ent.x - ent.rampWidth/2, 0.05, ent.y);
  ramp.rotation.y = Math.PI / 2; // Girar de cara al salón
  ramp.position.x += ent.rampWidth; // Ajustar desfase de rotación
  ramp.receiveShadow = true;
  scene.add(ramp);
}

/* --- CREAR ARO DE SELECCIÓN --- */
function createSelectionRing() {
  const ringGeom = new THREE.RingGeometry(0.8, 0.9, 32);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: COLORS.gold,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  selectionRing = new THREE.Mesh(ringGeom, ringMat);
  selectionRing.position.set(0, -100, 0);
  scene.add(selectionRing);
}

function updateSelectionRing() {
  if (!selectionRing) return;
  if (!selectedElementId || !active3dElements[selectedElementId]) {
    selectionRing.position.y = -100;
    return;
  }
  const group = active3dElements[selectedElementId];
  const data = currentElementsData.find(e => e.id === selectedElementId);
  if (!data) return;

  selectionRing.position.set(group.position.x, 0.06, group.position.z);
  const size = Math.max(data.w, data.h || data.w) * 0.88;
  selectionRing.scale.set(size, size, size);
}

/* --- ANIMAR Y HACER RENDER --- */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  
  if (selectionRing && selectedElementId) {
    const time = Date.now() * 0.003;
    selectionRing.rotation.y = time * 0.3;
    const pulse = 1.0 + Math.sin(time * 2.5) * 0.04;
    selectionRing.scale.multiplyScalar(pulse);
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

/* --- SINCRONIZACIÓN DE OBJETOS DINÁMICOS --- */
export function syncWithData(elementsArray) {
  currentElementsData = elementsArray;
  if (!scene) return;

  const dataIds = elementsArray.map(e => e.id);
  Object.keys(active3dElements).forEach(id => {
    if (!dataIds.includes(id)) {
      scene.remove(active3dElements[id]);
      delete active3dElements[id];
    }
  });

  elementsArray.forEach(elem => {
    let group = active3dElements[elem.id];
    if (!group) {
      group = new THREE.Group();
      group.name = elem.name;
      group.userData = { id: elem.id, type: elem.type };
      build3DElement(group, elem);
      scene.add(group);
      active3dElements[elem.id] = group;
    } else {
      if (group.userData.shape !== elem.shape ||
          group.userData.chairs !== elem.chairs ||
          group.userData.color !== elem.color ||
          group.userData.w !== elem.w ||
          group.userData.h !== elem.h ||
          group.userData.exhibitor !== elem.exhibitor ||
          group.userData.text !== elem.text) {
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }
        build3DElement(group, elem);
      }
    }

    // SVG maps coordinate directly (X, Y) to (X, Z) in 3D space.
    group.position.set(elem.x, 0.05, elem.y);
    group.rotation.y = - (elem.rotation || 0) * Math.PI / 180;
  });

  updateSelectionRing();
}

export function selectElement3D(elementId) {
  selectedElementId = elementId;
  updateSelectionRing();
}

/* --- MÉTODOS DE DIBUJO PROCEDURAL 3D DE MUEBLES --- */
function build3DElement(group, elem) {
  group.userData.shape = elem.shape;
  group.userData.chairs = elem.chairs;
  group.userData.color = elem.color;
  group.userData.w = elem.w;
  group.userData.h = elem.h;
  group.userData.exhibitor = elem.exhibitor;
  group.userData.text = elem.text;

  const isBw = currentTheme === 'minimalist';
  const isCadD = currentTheme === 'cad-dark';

  if (isBw) {
    build3DMonochrome(group, elem);
    return;
  }
  if (isCadD) {
    build3DWireframe(group, elem, 0x00ff00);
    return;
  }

  switch (elem.type) {
    case "stand":
      build3DStand(group, elem);
      break;
    case "table":
      build3DTable(group, elem);
      break;
    case "lounge":
      build3DLounge(group, elem);
      break;
    case "giant_letters":
      build3DGiantLetters(group, elem);
      break;
    case "mirror":
      build3DMirror(group, elem);
      break;
    case "photobooth":
      build3DPhotobooth(group, elem);
      break;
    case "dj":
    case "dj_audio":
      build3DDJ(group, elem);
      break;
    case "shrub":
      build3DShrub(group, elem);
      break;
    case "umbrella":
    case "bar_stool":
      build3DHighTable(group, elem);
      break;
    default:
      build3DGeneric(group, elem);
      break;
  }
}

/* --- MODELADO PROCEDURAL PBR --- */

// 1. Stand Comercial de Expositor
function build3DStand(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const wallMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const jointMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }); // Marcos dorados

  // Muro Trasero (x: -w/2 a w/2, alto=2.5, espesor=0.08)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.5, 0.08), wallMat);
  backWall.position.set(0, 1.25, -elem.h/2 + 0.04);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Muro Izquierdo
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, elem.h), wallMat);
  leftWall.position.set(-elem.w/2 + 0.04, 1.25, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  // Muro Derecho
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, elem.h), wallMat);
  rightWall.position.set(elem.w/2 - 0.04, 1.25, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Columnas en las esquinas delanteras
  const colGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
  const colL = new THREE.Mesh(colGeom, jointMat);
  colL.position.set(-elem.w/2 + 0.06, 1.25, elem.h/2 - 0.06);
  group.add(colL);
  const colR = new THREE.Mesh(colGeom, jointMat);
  colR.position.set(elem.w/2 - 0.06, 1.25, elem.h/2 - 0.06);
  group.add(colR);

  // Letrero Comercial de Cabecera (En la parte frontal)
  const headerBar = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 0.4, 0.06), wallMat);
  headerBar.position.set(0, 2.3, elem.h/2 - 0.03);
  group.add(headerBar);

  // Dibujar dinámicamente el nombre del Expositor utilizando un CanvasTexture 2D
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  // Fondo del letrero
  ctx.fillStyle = elem.color;
  ctx.fillRect(0, 0, 512, 64);
  // Borde
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 60);
  // Texto
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Mostrar exhibidor, si no hay, el nombre del stand
  const textToShow = elem.exhibitor || elem.name;
  ctx.fillText(textToShow.toUpperCase(), 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const textMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(elem.w * 0.9, 0.3), textMat);
  // Posicionar sutilmente delante del letrero
  textPlane.position.set(0, 2.3, elem.h/2 + 0.01);
  group.add(textPlane);
}

// 2. Mesas Redondas y Cuadradas con Mantel y Sillas
function build3DTable(group, elem) {
  const isCircle = elem.shape === "circle";
  const numChairs = elem.chairs || 10;
  const radius = elem.w / 2;
  const tH = 0.75;
  const hex = parseInt(elem.color.replace("#", "0x"));
  
  // Tablero de mesa con mantel cayendo
  let tableMesh;
  const clothMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, metalness: 0.05 });
  
  if (isCircle) {
    // Cilindro para mesa circular
    tableMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tH, 30), clothMat);
  } else {
    // Caja para mesa cuadrada
    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(elem.w, tH, elem.h), clothMat);
  }
  tableMesh.position.y = tH / 2;
  tableMesh.castShadow = true;
  tableMesh.receiveShadow = true;
  group.add(tableMesh);

  // Placa de vajilla central decorativa
  const plateGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.01, 16);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });

  // Sillas Tiffany alrededor
  const chairsOffset = 0.35; // Distancia desde el borde de la mesa en metros
  const chairGroup = create3DChairMesh();

  for (let i = 0; i < numChairs; i++) {
    const angle = (i * 2 * Math.PI) / numChairs;
    let chX = 0;
    let chZ = 0;

    if (isCircle) {
      chX = Math.sin(angle) * (radius + chairsOffset);
      chZ = Math.cos(angle) * (radius + chairsOffset);
    } else {
      chX = Math.sin(angle) * (radius + chairsOffset);
      chZ = Math.cos(angle) * (elem.h/2 + chairsOffset);
    }

    const instance = chairGroup.clone();
    instance.position.set(chX, 0, chZ);
    // Orientar de cara a la mesa
    instance.rotation.y = angle + Math.PI;
    group.add(instance);

    // Añadir vajilla pequeña en el borde de la mesa correspondiente
    if (isCircle && numChairs <= 12) {
      const pL = new THREE.Mesh(plateGeom, plateMat);
      pL.position.set(Math.sin(angle) * (radius - 0.15), tH + 0.005, Math.cos(angle) * (radius - 0.15));
      pL.rotation.y = angle;
      group.add(pL);
    }
  }
}

function create3DChairMesh() {
  const chairG = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.chairWood, roughness: 0.5 });
  const seatMat = new THREE.MeshStandardMaterial({ color: COLORS.chairSeat, roughness: 0.4 });

  // Asiento
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), seatMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  chairG.add(seat);

  // Respaldo Tiffany (Dos barras verticales y barras horizontales finas)
  const backL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), woodMat);
  backL.position.set(-0.19, 0.7, -0.19);
  backL.castShadow = true;
  chairG.add(backL);
  
  const backR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), woodMat);
  backR.position.set(0.19, 0.7, -0.19);
  backR.castShadow = true;
  chairG.add(backR);

  // Barra horizontal superior del respaldo
  const backTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.03, 0.03), woodMat);
  backTop.position.set(0, 0.93, -0.19);
  chairG.add(backTop);
  
  // Rejilla de barras horizontales intermedias
  for (let h = 0.55; h < 0.9; h += 0.12) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.015, 0.015), woodMat);
    bar.position.set(0, h, -0.19);
    chairG.add(bar);
  }

  // 4 Patas
  const legGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8);
  const legFL = new THREE.Mesh(legGeom, woodMat);
  legFL.position.set(-0.19, 0.225, 0.19);
  legFL.castShadow = true;
  chairG.add(legFL);

  const legFR = new THREE.Mesh(legGeom, woodMat);
  legFR.position.set(0.19, 0.225, 0.19);
  legFR.castShadow = true;
  chairG.add(legFR);

  const legBL = new THREE.Mesh(legGeom, woodMat);
  legBL.position.set(-0.19, 0.225, -0.19);
  legBL.castShadow = true;
  chairG.add(legBL);

  const legBR = new THREE.Mesh(legGeom, woodMat);
  legBR.position.set(0.19, 0.225, -0.19);
  legBR.castShadow = true;
  chairG.add(legBR);

  return chairG;
}

// 3. Sala Lounge
function build3DLounge(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const sofaMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });

  // Sofá Grande (Lado posterior)
  const sofaG = new THREE.Group();
  sofaG.position.set(0, 0, -elem.h/3);
  
  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.8, 0.2, 0.6), sofaMat);
  base.position.y = 0.1;
  base.castShadow = true;
  sofaG.add(base);
  // Cojines
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.76, 0.18, 0.56), sofaMat);
  cushion.position.y = 0.22;
  sofaG.add(cushion);
  // Respaldo
  const back = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.8, 0.6, 0.15), sofaMat);
  back.position.set(0, 0.4, -0.225);
  back.castShadow = true;
  sofaG.add(back);
  group.add(sofaG);

  // Dos sillones individuales a los lados (Izquierda y Derecha)
  const seatMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 });
  const armchairL = new THREE.Group();
  armchairL.position.set(-elem.w/3, 0, 0);
  armchairL.rotation.y = Math.PI / 2;
  const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), seatMat);
  seatL.position.y = 0.1;
  seatL.castShadow = true;
  armchairL.add(seatL);
  const backL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.12), seatMat);
  backL.position.set(0, 0.4, -0.24);
  armchairL.add(backL);
  group.add(armchairL);

  const armchairR = armchairL.clone();
  armchairR.position.set(elem.w/3, 0, 0);
  armchairR.rotation.y = -Math.PI / 2;
  group.add(armchairR);

  // Mesa de café blanca en el centro
  const table = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.35, 0.3, elem.h * 0.35), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
  table.position.y = 0.15;
  table.castShadow = true;
  group.add(table);
}

// 4. Letras Gigantes Iluminadas (LOVE, XV, etc.)
function build3DGiantLetters(group, elem) {
  const lettersText = elem.text || "LOVE";
  const hex = parseInt(elem.color.replace("#", "0x"));
  const letterMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Bombilla amarilla brillante
  
  // Dibujar de forma procedural caracteres en bloques
  const chars = lettersText.split("");
  const totalW = elem.w;
  const charW = 0.6; // metros por letra
  const spacing = 0.15;
  const startX = -((chars.length * charW + (chars.length - 1) * spacing) / 2) + charW/2;
  
  chars.forEach((char, idx) => {
    const charG = new THREE.Group();
    charG.position.set(startX + idx * (charW + spacing), 0, 0);
    
    // Modelar letras comunes mediante cajones de geometría
    buildSingleBlockLetter(charG, char, letterMat, bulbMat);
    group.add(charG);
  });
}

function buildSingleBlockLetter(group, char, mat, bulbMat) {
  const h = 1.3; // altura letra
  const w = 0.6; // ancho letra
  const d = 0.18; // profundidad
  const th = 0.14; // espesor trazos

  // Contenedores de trazo
  const createSegment = (sx, sy, sz, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
  };

  const createBulb = (px, py, pz) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), bulbMat);
    b.position.set(px, py, pz + d/2 + 0.01);
    group.add(b);
  };

  const c = char.toUpperCase();
  
  if (c === "L") {
    createSegment(th, h, d, -w/2 + th/2, h/2, 0); // vertical
    createSegment(w - th, th, d, th/2, th/2, 0); // horizontal bajo
    // Bombillas
    createBulb(-w/2 + th/2, 0.2, 0);
    createBulb(-w/2 + th/2, 0.6, 0);
    createBulb(-w/2 + th/2, 1.0, 0);
    createBulb(0.1, th/2, 0);
    createBulb(0.24, th/2, 0);
  } 
  else if (c === "O" || c === "0") {
    createSegment(th, h, d, -w/2 + th/2, h/2, 0); // Izq
    createSegment(th, h, d, w/2 - th/2, h/2, 0); // Der
    createSegment(w - th*2, th, d, 0, th/2, 0); // Bajo
    createSegment(w - th*2, th, d, 0, h - th/2, 0); // Alto
    // Bombillas
    createBulb(-w/2 + th/2, 0.3, 0);
    createBulb(-w/2 + th/2, 0.9, 0);
    createBulb(w/2 - th/2, 0.3, 0);
    createBulb(w/2 - th/2, 0.9, 0);
    createBulb(0, th/2, 0);
    createBulb(0, h - th/2, 0);
  }
  else if (c === "E") {
    createSegment(th, h, d, -w/2 + th/2, h/2, 0); // vertical
    createSegment(w - th, th, d, th/2, th/2, 0); // bajo
    createSegment(w - th*1.3, th, d, -th/10, h/2, 0); // medio
    createSegment(w - th, th, d, th/2, h - th/2, 0); // alto
    // Bombillas
    createBulb(-w/2 + th/2, 0.3, 0);
    createBulb(-w/2 + th/2, 0.9, 0);
    createBulb(0.1, th/2, 0);
    createBulb(0.05, h/2, 0);
    createBulb(0.1, h - th/2, 0);
  }
  else if (c === "V") {
    // Slanted V
    createSegment(th, h, d, -w/4, h/2, 0); // Izq
    createSegment(th, h, d, w/4, h/2, 0); // Der
    createSegment(w/2, th, d, 0, th/2, 0); // Unión baja
    // Bombillas
    createBulb(-w/4, 0.3, 0);
    createBulb(-w/4, 0.9, 0);
    createBulb(w/4, 0.3, 0);
    createBulb(w/4, 0.9, 0);
    createBulb(0, th/2, 0);
  }
  else if (c === "X") {
    createSegment(th, h, d, 0, h/2, 0); // Centro
    createSegment(w, th, d, 0, h/2, 0);
    // Dos barras cruzadas aproximadas
    const barL = new THREE.Mesh(new THREE.BoxGeometry(th*1.2, h*1.1, d), mat);
    barL.position.set(0, h/2, 0);
    barL.rotation.z = Math.PI / 5;
    group.add(barL);
    
    const barR = new THREE.Mesh(new THREE.BoxGeometry(th*1.2, h*1.1, d), mat);
    barR.position.set(0, h/2, 0);
    barR.rotation.z = -Math.PI / 5;
    group.add(barR);

    createBulb(-0.15, 0.3, 0);
    createBulb(0.15, 0.3, 0);
    createBulb(-0.15, 0.9, 0);
    createBulb(0.15, 0.9, 0);
    createBulb(0, h/2, 0);
  }
  else {
    // Si no es conocida, hacer un bloque base estilizado
    createSegment(w, h, d, 0, h/2, 0);
    createBulb(0, h/2, 0);
    createBulb(-w/3, h/3, 0);
    createBulb(w/3, h*0.66, 0);
  }
}

// 5. Espejo Decorativo (Marco dorado y plano reflejo)
function build3DMirror(group, elem) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, metalness: 0.95, roughness: 0.02 });

  // Marco exterior
  const frame = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.0, elem.h), frameMat);
  frame.position.y = 1.0;
  frame.castShadow = true;
  group.add(frame);

  // Cristal de espejo (ligeramente sobresaliente)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.88, 1.8, elem.h + 0.02), glassMat);
  glass.position.y = 1.0;
  group.add(glass);
}

// 6. Cabina de Fotografía
function build3DPhotobooth(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const structureMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 }); // Cortina roja

  // Cabina Sólida (2m x 2m x 2.2m)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.2, elem.h), structureMat);
  cab.position.y = 1.1;
  cab.castShadow = true;
  group.add(cab);

  // Cortina de acceso (Lado frontal)
  const curtain = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.7, 1.9, 0.05), curtainMat);
  curtain.position.set(0, 0.95, elem.h/2 + 0.01);
  group.add(curtain);

  // Lente de cámara decorativo
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.7, -elem.h/2 - 0.01);
  group.add(lens);
}

// 7. Cabina DJ / Audio
function build3DDJ(group, elem) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 });

  // Tarima mesa
  const table = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 1.0, elem.h), tableMat);
  table.position.y = 0.5;
  table.castShadow = true;
  group.add(table);

  // Mezcladora DJ sobre la mesa
  const djConsole = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.6, 0.05, elem.h * 0.7), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  djConsole.position.set(0, 1.025, 0);
  group.add(djConsole);

  // Altavoces a los costados
  const spkGeom = new THREE.BoxGeometry(0.35, 0.8, 0.35);
  const spkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  
  const spkL = new THREE.Mesh(spkGeom, spkMat);
  spkL.position.set(-elem.w/2 - 0.25, 1.2, 0);
  spkL.castShadow = true;
  group.add(spkL);
  
  const standL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), metalMat);
  standL.position.set(-elem.w/2 - 0.25, 0.4, 0);
  group.add(standL);

  const spkR = spkL.clone();
  spkR.position.x = elem.w/2 + 0.25;
  group.add(spkR);
  
  const standR = standL.clone();
  standR.position.x = elem.w/2 + 0.25;
  group.add(standR);
}

// 8. Arbusto Decorativo
function build3DShrub(group, elem) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
  trunk.position.y = 0.2;
  group.add(trunk);

  const leavesMat = new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 0.95 });
  const radius = elem.w / 2;
  
  // Varios globos foliares para dar textura
  const fL = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.8, 8, 8), leavesMat);
  fL.position.y = 0.65;
  fL.castShadow = true;
  group.add(fL);
  
  const f2 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.6, 8, 8), leavesMat);
  f2.position.set(-0.12, 0.85, 0.08);
  group.add(f2);
  
  const f3 = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.5, 8, 8), leavesMat);
  f3.position.set(0.15, 0.75, -0.15);
  group.add(f3);
}

// 9. Mesa Periquera / Sombrilla
function build3DHighTable(group, elem) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85 });

  // Altura alta de periqueras = 1.1m
  const tH = 1.1;
  const radius = elem.w / 2;

  // Pie de mesa
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), metalMat);
  base.position.y = 0.02;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, tH, 12), metalMat);
  pillar.position.y = tH / 2;
  group.add(pillar);

  // Tablero de mesa
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.05, 20), woodMat);
  top.position.y = tH;
  top.castShadow = true;
  group.add(top);

  // Sombrilla (Si es del tipo correspondiente)
  if (elem.type === "umbrella") {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8), metalMat);
    pole.position.y = 1.1;
    group.add(pole);

    // Cono de la tela
    const umbrellaGeom = new THREE.CylinderGeometry(0.02, radius, 0.6, 16, 1, true);
    const fabricMat = new THREE.MeshStandardMaterial({ color: parseInt(elem.color.replace("#", "0x")), roughness: 0.8 });
    const fabric = new THREE.Mesh(umbrellaGeom, fabricMat);
    fabric.position.y = 1.9;
    fabric.castShadow = true;
    group.add(fabric);
  }

  // Bancos altos Tiffany a su alrededor (4 taburetes por defecto)
  const numStools = elem.chairs || 4;
  const stoolG = create3DStoolMesh();
  const offset = radius * 0.8;

  for (let i = 0; i < numStools; i++) {
    const angle = (i * 2 * Math.PI) / numStools;
    const sX = Math.sin(angle) * offset;
    const sZ = Math.cos(angle) * offset;
    
    const instance = stoolG.clone();
    instance.position.set(sX, 0, sZ);
    instance.rotation.y = angle;
    group.add(instance);
  }
}

function create3DStoolMesh() {
  const stoolG = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.chairWood, roughness: 0.5 });
  const seatMat = new THREE.MeshStandardMaterial({ color: COLORS.chairSeat, roughness: 0.4 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });

  // Asiento alto redondo (y=0.75m)
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), seatMat);
  seat.position.y = 0.75;
  seat.castShadow = true;
  stoolG.add(seat);

  // Patas del taburete
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.73, 8), woodMat);
    leg.position.set(Math.sin(angle) * 0.14, 0.365, Math.cos(angle) * 0.14);
    // Abrir ligeramente las patas hacia afuera
    leg.rotation.z = Math.sin(angle) * 0.06;
    leg.rotation.x = -Math.cos(angle) * 0.06;
    leg.castShadow = true;
    stoolG.add(leg);
  }

  // Anillo descansapies metálico a y=0.25m
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 16), metalMat);
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 0.25;
  stoolG.add(torus);

  return stoolG;
}

// 10. Representación Genérica
function build3DGeneric(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 });
  const geom = new THREE.BoxGeometry(elem.w, 1.0, elem.h);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

/* --- ADAPTACIONES DE TEMAS TÉCNICOS EN 3D --- */

// Renderizado alámbrico (CAD Oscuro)
function build3DWireframe(group, elem, colorHex) {
  const w = elem.w;
  const h = elem.h;
  const tH = elem.type === "stand" ? 2.5 : (elem.type === "table" ? 0.75 : 1.0);
  
  const boxGeom = new THREE.BoxGeometry(w, tH, h);
  const edges = new THREE.EdgesGeometry(boxGeom);
  const wireframeMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
  const line = new THREE.LineSegments(edges, wireframeMat);
  line.position.y = tH / 2;
  group.add(line);

  // Signo identificador
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0,0,256,64);
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.strokeRect(1,1,254,62);
  ctx.fillStyle = "#00ff00";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(elem.name, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, tH * 0.4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  board.position.set(0, tH * 0.8, h/2 + 0.01);
  group.add(board);
}

// Renderizado monocromo (Técnico B/N)
function build3DMonochrome(group, elem) {
  const w = elem.w;
  const h = elem.h;
  const tH = elem.type === "stand" ? 2.5 : (elem.type === "table" ? 0.75 : 1.0);
  
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, tH, h), mat);
  box.position.y = tH / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  // Agregar líneas negras en los cantos para marcar bordes (Efecto caricatura/plano técnico)
  const edges = new THREE.EdgesGeometry(box.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
  line.position.y = tH / 2;
  group.add(line);
}
