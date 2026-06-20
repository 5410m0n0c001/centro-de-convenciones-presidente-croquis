/**
 * visualizer3d.js
 * Motor WebGL 3D basado en Three.js.
 * Mapea las coordenadas 2D (x, y) de la planta a 3D (x, z) con elevaciones Y.
 * Construye modelos tridimensionales procedurales de gala para el Centro de Convenciones Presidente.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./elements.js";

let scene, camera, renderer, controls;
let container = null;
let active3dElements = {}; // { id: THREE.Group }
let currentElementsData = [];
let selectedElementId = null;
let animationFrameId = null;
let selectionRing = null;
let currentTheme = 'premium';
let wallsGroup = null;

const COLORS = {
  floorIndoor: 0x1e293b,    // Mármol pizarra oscuro
  floorOutdoor: 0xf8fafc,   // Suelo exterior blanco minimalista
  walls: 0x334155,          // Muros estructurales
  tableCloth: 0xfafafa,     // Mantel satinado
  chairWood: 0x78350f,      // Tiffany madera
  chairSeat: 0xd4af37,      // Cojín dorado
  gold: 0xd4af37,            // Oro selección
  emerald: 0x065f46,        // Verde esmeralda stands
  water: 0x0ea5e9,          // Agua fuente
  grass: 0x1b4332           // Césped
};

// Dictionary of mapped vendor categories/services
const VENDOR_SERVICES = {
  "primavera events group": "Organización y Banquetes",
  "scanner dj": "Música y Audio",
  "abidecora": "Florería y Decoración",
  "abigail jimenez sandoval": "Florería y Decoración",
  "dance queens": "Danza y Performance",
  "academia de baile dance queens": "Danza y Performance",
  "andrea lozano beauty salon": "Belleza y Maquillaje",
  "andrea lozano": "Belleza y Maquillaje",
  "corona music": "Música y Audio",
  "kataleya florist": "Florería y Decoración",
  "la princesa": "Alimentos y Bebidas",
  "la princesa paleteria": "Alimentos y Bebidas",
  "licky baut photo": "Fotografía y Video",
  "mariachi xiuhtepetl": "Música y Audio",
  "tequila presonalizado don ramón": "Alimentos y Bebidas",
  "tequila personalizado don ramón": "Alimentos y Bebidas",
  "tequila personalizado don ramon": "Alimentos y Bebidas",
  "tequila presonalizado don ramon": "Alimentos y Bebidas"
};

function create3DLabel(text, subtext = "", colorHex = "#d4af37", bgColor = "rgba(15, 23, 42, 0.85)") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = subtext ? 128 : 64;
  const ctx = canvas.getContext("2d");

  // Round rect background
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 4;
  
  // Draw rounded rectangle
  const r = 16;
  const w = 512;
  const h = canvas.height;
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.lineTo(w - r, 2);
  ctx.quadraticCurveTo(w - 2, 2, w - 2, r);
  ctx.lineTo(w - 2, h - r);
  ctx.quadraticCurveTo(w - 2, h - 2, w - r, h - 2);
  ctx.lineTo(r, h - 2);
  ctx.quadraticCurveTo(2, h - 2, 2, h - r);
  ctx.lineTo(2, r);
  ctx.quadraticCurveTo(2, 2, r, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw main text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  if (subtext) {
    ctx.fillText(text, 256, 40);
    // Draw subtext
    ctx.fillStyle = colorHex;
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.fillText(subtext, 256, 88);
  } else {
    ctx.fillText(text, 256, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true 
  });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(subtext ? 6.0 : 4.5, subtext ? 1.5 : 0.5625, 1);
  return sprite;
}

export function init3D(containerElement, initialElements, themeName = 'premium') {
  container = containerElement;
  currentElementsData = initialElements;
  currentTheme = themeName;
  
  container.innerHTML = "";
  
  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(themeName === 'cad-light' ? 0xf1f5f9 : 0x090d16);
  if (themeName !== 'cad-light' && themeName !== 'minimalist') {
    scene.fog = new THREE.FogExp2(0x090d16, 0.0025); // Disminuido de 0.01 a 0.0025 para evitar que oscurezca la vista
  }

  // 2. Cámara
  camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 250);
  camera.position.set(35, 38, 95); // Encuadre oblicuo aéreo
  
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
  controls.maxDistance = 160;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.target.set(35, 0, 45); // Enfocado en el centro del terreno (70m x 90m)
  controls.update();
  
  // 5. Iluminación
  setupLighting();
  
  // 6. Construir estructuras arquitectónicas fijas digitalizadas del croquis
  wallsGroup = new THREE.Group();
  scene.add(wallsGroup);
  createStatic3DStructures();
  
  // 7. Aro de selección
  createSelectionRing();
  
  // 8. Cargar Objetos Dinámicos
  syncWithData(initialElements);
  
  // 9. Bucle de animación
  animate();
  
  window.addEventListener("resize", resize3D);
}

export function destroy3D() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener("resize", resize3D);
  if (wallsGroup) {
    clearWalls3D();
    if (scene) scene.remove(wallsGroup);
    wallsGroup = null;
  }
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
  const endPos = new THREE.Vector3(35, 38, 95);
  const endTarget = new THREE.Vector3(35, 0, 45);
  
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

function setupLighting() {
  if (currentTheme === 'minimalist') {
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(amb);
    return;
  }
  
  const isCadLight = currentTheme === 'cad-light';
  
  // Luz Ambiental (Intensidad aumentada para evitar la oscuridad extrema)
  const ambientLight = new THREE.AmbientLight(isCadLight ? 0xffffff : 0xe0e7ff, isCadLight ? 0.75 : 0.6);
  scene.add(ambientLight);
  
  // Luz del Atardecer Dorado (Direccional Principal, más intensa)
  const sunLight = new THREE.DirectionalLight(0xffedd5, isCadLight ? 1.2 : 1.35);
  sunLight.position.set(50, 45, 100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 180;
  
  const d = 60;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);

  // Luz de Relleno (Secundaria, ilumina desde el lado contrario para disipar sombras)
  const fillLight = new THREE.DirectionalLight(0x93c5fd, isCadLight ? 0.35 : 0.5);
  fillLight.position.set(-50, 30, -50);
  scene.add(fillLight);
  
  if (!isCadLight) {
    // Foco de Acento sobre Escenario y Pasarela (Violeta Cálido)
    const stageSpot = new THREE.SpotLight(0xa78bfa, 3.5, 40, Math.PI/4, 0.4, 1);
    stageSpot.position.set(28, 16, 26);
    stageSpot.target.position.set(28, 0, 26);
    stageSpot.castShadow = true;
    scene.add(stageSpot);
    scene.add(stageSpot.target);

    // Luz sumergida en la fuente (dinámica según la posición del jardín)
    const gardenElem = currentElementsData.find(e => e.type === "garden");
    let ftX = 58.0;
    let ftY = 30.0;
    if (gardenElem) {
      ftX = gardenElem.x;
      const ftYOffset = -2.0 * (gardenElem.h / 40.0);
      ftY = gardenElem.y + ftYOffset;
    }
    const fountainLight = new THREE.PointLight(0x0ea5e9, 2.5, 15);
    fountainLight.position.set(ftX, 1.0, ftY);
    scene.add(fountainLight);
  }
}

/* --- LEVANTAMIENTO DE LA EDIFICACIÓN --- */
function createStatic3DStructures() {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  const groundMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadL ? 0xf8fafc : (isCadD ? 0x000000 : COLORS.floorOutdoor)),
    roughness: 0.9,
    metalness: 0.02
  });
  
  const salonFloorMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadL ? 0xe2e8f0 : (isCadD ? 0x000000 : 0x1e293b)),
    roughness: 0.45,
    metalness: 0.1
  });

  const wallColor = isBw ? 0x000000 : (isCadL ? 0x475569 : (isCadD ? 0x00ff00 : COLORS.walls));
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.8,
    metalness: 0.05
  });

  // A) Suelo base del Terreno (70m x 90m)
  const groundGeom = new THREE.BoxGeometry(70, 0.2, 90);
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.position.set(35, -0.1, 45); // Centrado en (35, 45)
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Rejilla CAD
  if (!isBw) {
    const gridHelper = new THREE.GridHelper(90, 90, 0x64748b, 0x334155);
    gridHelper.position.set(35, 0.01, 45);
    gridHelper.material.opacity = isCadD ? 0.4 : 0.15;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
  }



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

    group.position.set(elem.x, 0.05, elem.y);
    group.rotation.y = - (elem.rotation || 0) * Math.PI / 180;
  });

  updateSelectionRing();
  updateWalls3D(elementsArray);
}

export function selectElement3D(elementId) {
  selectedElementId = elementId;
  updateSelectionRing();
}

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
    case "salon":
      build3DSalon(group, elem);
      break;
    case "garden":
      build3DGarden(group, elem);
      break;
    case "entrance":
      build3DEntrance(group, elem);
      break;
    case "bathroom":
      build3DBathroom(group, elem);
      break;
    case "stage":
      build3DStage(group, elem);
      break;
    case "stand":
      build3DStand(group, elem);
      break;
    case "door":
      build3DDoor(group, elem);
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

// 1. Stand Comercial de Expositor
function build3DStand(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const wallMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const jointMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.5, 0.08), wallMat);
  backWall.position.set(0, 1.25, -elem.h/2 + 0.04);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, elem.h), wallMat);
  leftWall.position.set(-elem.w/2 + 0.04, 1.25, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, elem.h), wallMat);
  rightWall.position.set(elem.w/2 - 0.04, 1.25, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  const colGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
  const colL = new THREE.Mesh(colGeom, jointMat);
  colL.position.set(-elem.w/2 + 0.06, 1.25, elem.h/2 - 0.06);
  group.add(colL);
  const colR = new THREE.Mesh(colGeom, jointMat);
  colR.position.set(elem.w/2 - 0.06, 1.25, elem.h/2 - 0.06);
  group.add(colR);

  const headerBar = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 0.4, 0.06), wallMat);
  headerBar.position.set(0, 2.3, elem.h/2 - 0.03);
  group.add(headerBar);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = elem.color;
  ctx.fillRect(0, 0, 512, 64);
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textToShow = elem.exhibitor || elem.name;
  ctx.fillText(textToShow.toUpperCase(), 256, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const textMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(elem.w * 0.9, 0.3), textMat);
  textPlane.position.set(0, 2.3, elem.h/2 + 0.01);
  group.add(textPlane);

  // Floating 3D Label
  let exhibName = elem.exhibitor || elem.name;
  let exhibService = "";
  if (exhibName && exhibName !== "Nuevo Expositor" && exhibName !== "n°1" && exhibName !== "RED") {
    const key = exhibName.toLowerCase().trim();
    if (VENDOR_SERVICES[key]) {
      exhibService = VENDOR_SERVICES[key];
    } else if (elem.name && elem.name !== exhibName && !elem.name.startsWith("Stand")) {
      exhibService = elem.name;
    }
  } else {
    exhibName = elem.name;
    const key = exhibName.toLowerCase().trim();
    if (VENDOR_SERVICES[key]) {
      exhibService = VENDOR_SERVICES[key];
    }
  }

  const labelSprite = create3DLabel(exhibName, exhibService, elem.color || "#d4af37");
  labelSprite.position.set(0, 3.8, 0);
  group.add(labelSprite);
}

// 2. Mesas
function build3DTable(group, elem) {
  const isCircle = elem.shape === "circle";
  const numChairs = elem.chairs || 10;
  const radius = elem.w / 2;
  const tH = 0.75;
  const hex = parseInt(elem.color.replace("#", "0x"));
  
  let tableMesh;
  const clothMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, metalness: 0.05 });
  
  if (isCircle) {
    tableMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tH, 30), clothMat);
  } else {
    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(elem.w, tH, elem.h), clothMat);
  }
  tableMesh.position.y = tH / 2;
  tableMesh.castShadow = true;
  tableMesh.receiveShadow = true;
  group.add(tableMesh);

  const plateGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.01, 16);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });

  const chairsOffset = 0.32;
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
    instance.rotation.y = angle + Math.PI;
    group.add(instance);

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

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), seatMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  chairG.add(seat);

  const backL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), woodMat);
  backL.position.set(-0.18, 0.7, -0.18);
  backL.castShadow = true;
  chairG.add(backL);
  
  const backR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), woodMat);
  backR.position.set(0.18, 0.7, -0.18);
  backR.castShadow = true;
  chairG.add(backR);

  const backTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.03), woodMat);
  backTop.position.set(0, 0.93, -0.18);
  chairG.add(backTop);
  
  for (let h = 0.55; h < 0.9; h += 0.12) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.015), woodMat);
    bar.position.set(0, h, -0.18);
    chairG.add(bar);
  }

  const legGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8);
  const legFL = new THREE.Mesh(legGeom, woodMat);
  legFL.position.set(-0.18, 0.225, 0.18);
  legFL.castShadow = true;
  chairG.add(legFL);

  const legFR = new THREE.Mesh(legGeom, woodMat);
  legFR.position.set(0.18, 0.225, 0.18);
  legFR.castShadow = true;
  chairG.add(legFR);

  const legBL = new THREE.Mesh(legGeom, woodMat);
  legBL.position.set(-0.18, 0.225, -0.18);
  legBL.castShadow = true;
  chairG.add(legBL);

  const legBR = new THREE.Mesh(legGeom, woodMat);
  legBR.position.set(0.18, 0.225, -0.18);
  legBR.castShadow = true;
  chairG.add(legBR);

  return chairG;
}

// 3. Sala Lounge
function build3DLounge(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const sofaMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 });

  const sofaG = new THREE.Group();
  sofaG.position.set(0, 0, -elem.h/3);
  const base = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.8, 0.2, 0.6), sofaMat);
  base.position.y = 0.1;
  base.castShadow = true;
  sofaG.add(base);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.76, 0.18, 0.56), sofaMat);
  cushion.position.y = 0.22;
  sofaG.add(cushion);
  const back = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.8, 0.6, 0.15), sofaMat);
  back.position.set(0, 0.4, -0.225);
  back.castShadow = true;
  sofaG.add(back);
  group.add(sofaG);

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

  const table = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.35, 0.3, elem.h * 0.35), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
  table.position.y = 0.15;
  table.castShadow = true;
  group.add(table);
}

// 4. Letras Gigantes
function build3DGiantLetters(group, elem) {
  const lettersText = elem.text || "LOVE";
  const hex = parseInt(elem.color.replace("#", "0x"));
  const letterMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  
  const chars = lettersText.split("");
  const charW = 0.6;
  const spacing = 0.15;
  const startX = -((chars.length * charW + (chars.length - 1) * spacing) / 2) + charW/2;
  
  chars.forEach((char, idx) => {
    const charG = new THREE.Group();
    charG.position.set(startX + idx * (charW + spacing), 0, 0);
    buildSingleBlockLetter(charG, char, letterMat, bulbMat);
    group.add(charG);
  });
}

function buildSingleBlockLetter(group, char, mat, bulbMat) {
  const h = 1.3;
  const w = 0.6;
  const d = 0.18;
  const th = 0.14;

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
    createSegment(th, h, d, -w/2 + th/2, h/2, 0);
    createSegment(w - th, th, d, th/2, th/2, 0);
    createBulb(-w/2 + th/2, 0.2, 0);
    createBulb(-w/2 + th/2, 0.6, 0);
    createBulb(-w/2 + th/2, 1.0, 0);
    createBulb(0.1, th/2, 0);
    createBulb(0.24, th/2, 0);
  } 
  else if (c === "O" || c === "0") {
    createSegment(th, h, d, -w/2 + th/2, h/2, 0);
    createSegment(th, h, d, w/2 - th/2, h/2, 0);
    createSegment(w - th*2, th, d, 0, th/2, 0);
    createSegment(w - th*2, th, d, 0, h - th/2, 0);
    createBulb(-w/2 + th/2, 0.3, 0);
    createBulb(-w/2 + th/2, 0.9, 0);
    createBulb(w/2 - th/2, 0.3, 0);
    createBulb(w/2 - th/2, 0.9, 0);
    createBulb(0, th/2, 0);
    createBulb(0, h - th/2, 0);
  }
  else if (c === "E") {
    createSegment(th, h, d, -w/2 + th/2, h/2, 0);
    createSegment(w - th, th, d, th/2, th/2, 0);
    createSegment(w - th*1.3, th, d, -th/10, h/2, 0);
    createSegment(w - th, th, d, th/2, h - th/2, 0);
    createBulb(-w/2 + th/2, 0.3, 0);
    createBulb(-w/2 + th/2, 0.9, 0);
    createBulb(0.1, th/2, 0);
    createBulb(0.05, h/2, 0);
    createBulb(0.1, h - th/2, 0);
  }
  else if (c === "V") {
    createSegment(th, h, d, -w/4, h/2, 0);
    createSegment(th, h, d, w/4, h/2, 0);
    createSegment(w/2, th, d, 0, th/2, 0);
    createBulb(-w/4, 0.3, 0);
    createBulb(-w/4, 0.9, 0);
    createBulb(w/4, 0.3, 0);
    createBulb(w/4, 0.9, 0);
    createBulb(0, th/2, 0);
  }
  else if (c === "X") {
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
    createSegment(w, h, d, 0, h/2, 0);
    createBulb(0, h/2, 0);
    createBulb(-w/3, h/3, 0);
    createBulb(w/3, h*0.66, 0);
  }
}

// 5. Espejo
function build3DMirror(group, elem) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, metalness: 0.95, roughness: 0.02 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.0, elem.h), frameMat);
  frame.position.y = 1.0;
  frame.castShadow = true;
  group.add(frame);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.88, 1.8, elem.h + 0.02), glassMat);
  glass.position.y = 1.0;
  group.add(glass);
}

// 6. Cabina Fotos
function build3DPhotobooth(group, elem) {
  const hex = parseInt(elem.color.replace("#", "0x"));
  const structureMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, metalness: 0.1 });
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 2.2, elem.h), structureMat);
  cab.position.y = 1.1;
  cab.castShadow = true;
  group.add(cab);

  const curtain = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.7, 1.9, 0.05), curtainMat);
  curtain.position.set(0, 0.95, elem.h/2 + 0.01);
  group.add(curtain);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.7, -elem.h/2 - 0.01);
  group.add(lens);
}

// 7. DJ
function build3DDJ(group, elem) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 });

  const table = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 1.0, elem.h), tableMat);
  table.position.y = 0.5;
  table.castShadow = true;
  group.add(table);

  const djConsole = new THREE.Mesh(new THREE.BoxGeometry(elem.w * 0.6, 0.05, elem.h * 0.7), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  djConsole.position.set(0, 1.025, 0);
  group.add(djConsole);

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
}

// 8. Arbusto
function build3DShrub(group, elem) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
  trunk.position.y = 0.2;
  group.add(trunk);

  const leavesMat = new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 0.95 });
  const radius = elem.w / 2;
  
  const fL = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.8, 8, 8), leavesMat);
  fL.position.y = 0.65;
  fL.castShadow = true;
  group.add(fL);
}

// 9. Mesa Periquera / Sombrilla
function build3DHighTable(group, elem) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85 });

  const tH = 1.1;
  const radius = elem.w / 2;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), metalMat);
  base.position.y = 0.02;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, tH, 12), metalMat);
  pillar.position.y = tH / 2;
  group.add(pillar);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.05, 20), woodMat);
  top.position.y = tH;
  top.castShadow = true;
  group.add(top);

  if (elem.type === "umbrella") {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8), metalMat);
    pole.position.y = 1.1;
    group.add(pole);

    const umbrellaGeom = new THREE.CylinderGeometry(0.02, radius, 0.6, 16, 1, true);
    const fabricMat = new THREE.MeshStandardMaterial({ color: parseInt(elem.color.replace("#", "0x")), roughness: 0.8 });
    const fabric = new THREE.Mesh(umbrellaGeom, fabricMat);
    fabric.position.y = 1.9;
    fabric.castShadow = true;
    group.add(fabric);
  }

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

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), seatMat);
  seat.position.y = 0.75;
  seat.castShadow = true;
  stoolG.add(seat);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.73, 8), woodMat);
    leg.position.set(Math.sin(angle) * 0.14, 0.365, Math.cos(angle) * 0.14);
    leg.rotation.z = Math.sin(angle) * 0.06;
    leg.rotation.x = -Math.cos(angle) * 0.06;
    leg.castShadow = true;
    stoolG.add(leg);
  }

  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 16), metalMat);
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 0.25;
  stoolG.add(torus);

  return stoolG;
}

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

  const edges = new THREE.EdgesGeometry(box.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
  line.position.y = tH / 2;
  group.add(line);
}

function build3DDoor(group, elem) {
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

  const frameColor = 0x3e2723;
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6, metalness: 0.1 });
  
  // Poste Izquierdo
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), frameMat);
  postL.position.set(-elem.w/2 + 0.05, 1.2, 0);
  postL.castShadow = true;
  group.add(postL);

  // Poste Derecho
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), frameMat);
  postR.position.set(elem.w/2 - 0.05, 1.2, 0);
  postR.castShadow = true;
  group.add(postR);

  // Viga superior
  const beam = new THREE.Mesh(new THREE.BoxGeometry(elem.w, 0.1, 0.1), frameMat);
  beam.position.set(0, 2.35, 0);
  beam.castShadow = true;
  group.add(beam);

  // Panel de cristal
  const glassGeom = new THREE.BoxGeometry(elem.w - 0.15, 2.3, 0.02);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.9
  });
  const glass = new THREE.Mesh(glassGeom, glassMat);
  glass.position.set(0, 1.15, 0);
  group.add(glass);

  // Jaladeras de la puerta (doradas)
  const handleGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
  const handleMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.8, roughness: 0.2 });
  
  const handleL = new THREE.Mesh(handleGeom, handleMat);
  handleL.position.set(-0.08, 1.1, 0.02);
  group.add(handleL);

  const handleR = new THREE.Mesh(handleGeom, handleMat);
  handleR.position.set(0.08, 1.1, 0.02);
  group.add(handleR);
}

function clearWalls3D() {
  if (!wallsGroup) return;
  while (wallsGroup.children.length > 0) {
    const obj = wallsGroup.children[0];
    wallsGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  }
}

function updateWalls3D(elementsArray) {
  if (!wallsGroup) return;
  clearWalls3D();

  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  const wallColor = isBw ? 0x000000 : (isCadL ? 0x475569 : (isCadD ? 0x00ff00 : COLORS.walls));
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.8,
    metalness: 0.05
  });

  // Buscar el salón dinámico activo para obtener sus límites
  const salonElem = elementsArray.find(e => e.type === "salon");
  
  // Límites por defecto (del original 36x58 centrado en 28,41)
  let sX = 28.0;
  let sY = 41.0;
  let sW = 36.0;
  let sH = 58.0;
  
  if (salonElem) {
    sX = salonElem.x;
    sY = salonElem.y;
    sW = salonElem.w;
    sH = salonElem.h;
  }

  const minX = sX - sW / 2;
  const maxX = sX + sW / 2;
  const minZ = sY - sH / 2;
  const maxZ = sY + sH / 2;

  // Recolectar gaps para cada muro
  const leftGaps = [];
  const rightGaps = [];
  const topGaps = [];
  const bottomGaps = [];

  elementsArray.forEach(elem => {
    if (elem.type !== "door") return;

    // Calcular distancia de la puerta a los 4 bordes del salón dinámico
    const distL = Math.abs(elem.x - minX);
    const distR = Math.abs(elem.x - maxX);
    const distT = Math.abs(elem.y - minZ);
    const distB = Math.abs(elem.y - maxZ);

    const minDist = Math.min(distL, distR, distT, distB);
    if (minDist > 3.0) return; // No está en ningún muro perimetral del salón

    if (minDist === distL) {
      leftGaps.push([elem.y - elem.w / 2, elem.y + elem.w / 2]);
    } else if (minDist === distR) {
      rightGaps.push([elem.y - elem.w / 2, elem.y + elem.w / 2]);
    } else if (minDist === distT) {
      topGaps.push([elem.x - elem.w / 2, elem.x + elem.w / 2]);
    } else if (minDist === distB) {
      bottomGaps.push([elem.x - elem.w / 2, elem.x + elem.w / 2]);
    }
  });

  // Auxiliar para dividir intervalo
  const splitInterval = (minVal, maxVal, gaps) => {
    let segments = [[minVal, maxVal]];
    gaps.forEach(([gStart, gEnd]) => {
      let nextSegments = [];
      segments.forEach(([sStart, sEnd]) => {
        if (gEnd <= sStart || gStart >= sEnd) {
          nextSegments.push([sStart, sEnd]);
        } else {
          if (gStart > sStart) nextSegments.push([sStart, gStart]);
          if (gEnd < sEnd) nextSegments.push([gEnd, sEnd]);
        }
      });
      segments = nextSegments;
    });
    return segments;
  };

  // 1. Muro Superior (Z = minZ, X desde minX hasta maxX)
  const topSegments = splitInterval(minX, maxX, topGaps);
  topSegments.forEach(([x1, x2]) => {
    const length = x2 - x1;
    if (length < 0.05) return;
    const geom = new THREE.BoxGeometry(length, 6.0, 0.3);
    const mesh = new THREE.Mesh(geom, wallMat);
    mesh.position.set((x1 + x2) / 2, 3.0, minZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  });

  // 2. Muro Inferior (Z = maxZ, X desde minX hasta maxX)
  const bottomSegments = splitInterval(minX, maxX, bottomGaps);
  bottomSegments.forEach(([x1, x2]) => {
    const length = x2 - x1;
    if (length < 0.05) return;
    const geom = new THREE.BoxGeometry(length, 6.0, 0.3);
    const mesh = new THREE.Mesh(geom, wallMat);
    mesh.position.set((x1 + x2) / 2, 3.0, maxZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  });

  // 3. Muro Izquierdo (X = minX, Z desde minZ hasta maxZ)
  const leftSegments = splitInterval(minZ, maxZ, leftGaps);
  leftSegments.forEach(([z1, z2]) => {
    const length = z2 - z1;
    if (length < 0.05) return;
    const geom = new THREE.BoxGeometry(0.3, 6.0, length);
    const mesh = new THREE.Mesh(geom, wallMat);
    mesh.position.set(minX, 3.0, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  });

  // 4. Muro Derecho (X = maxX, Z desde minZ hasta maxZ)
  const rightSegments = splitInterval(minZ, maxZ, rightGaps);
  rightSegments.forEach(([z1, z2]) => {
    const length = z2 - z1;
    if (length < 0.05) return;
    const geom = new THREE.BoxGeometry(0.3, 6.0, length);
    const mesh = new THREE.Mesh(geom, wallMat);
    mesh.position.set(maxX, 3.0, (z1 + z2) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  });

  // 5. Columnas (distribuidas dinámicamente cada 6 metros)
  const colGeom = new THREE.BoxGeometry(0.5, 6, 0.5);
  for (let z = minZ + 4.0; z < maxZ; z += 6.0) {
    const inLeftGap = leftGaps.some(([gStart, gEnd]) => z >= gStart - 0.25 && z <= gEnd + 0.25);
    if (!inLeftGap) {
      const colL = new THREE.Mesh(colGeom, wallMat);
      colL.position.set(minX + 0.35, 3.0, z);
      colL.castShadow = true;
      wallsGroup.add(colL);
    }

    const inRightGap = rightGaps.some(([gStart, gEnd]) => z >= gStart - 0.25 && z <= gEnd + 0.25);
    if (!inRightGap) {
      const colR = new THREE.Mesh(colGeom, wallMat);
      colR.position.set(maxX - 0.35, 3.0, z);
      colR.castShadow = true;
      wallsGroup.add(colR);
    }
  }
}

function build3DSalon(group, elem) {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  const salonFloorMat = new THREE.MeshStandardMaterial({
    color: isBw ? 0xffffff : (isCadL ? 0xe2e8f0 : (isCadD ? 0x000000 : 0x1e293b)),
    roughness: 0.45,
    metalness: 0.1
  });

  const salonGeom = new THREE.BoxGeometry(elem.w, 0.05, elem.h);
  const salonFloor = new THREE.Mesh(salonGeom, salonFloorMat);
  salonFloor.position.y = 0.025;
  salonFloor.receiveShadow = true;
  group.add(salonFloor);

  // Area Label
  const label = create3DLabel("SALÓN TECHADO", "Área Principal de Expositores", "#f05a7e");
  label.position.set(0, 5.0, 0);
  group.add(label);
}

function build3DGarden(group, elem) {
  const isBw = currentTheme === 'minimalist';
  const isCadD = currentTheme === 'cad-dark';

  if (isBw || isCadD) {
    const geom = new THREE.BoxGeometry(elem.w, 0.02, elem.h);
    const mat = new THREE.MeshStandardMaterial({ color: isBw ? 0xffffff : 0x111111, roughness: 0.9 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.01;
    group.add(mesh);
    return;
  }

  const gardenGeom = new THREE.BoxGeometry(elem.w, 0.02, elem.h);
  const gardenMat = new THREE.MeshStandardMaterial({ color: COLORS.grass || 0x1b4332, roughness: 0.9 });
  const garden = new THREE.Mesh(gardenGeom, gardenMat);
  garden.position.y = 0.01;
  garden.receiveShadow = true;
  group.add(garden);

  const ftRx = elem.w * (5.0 / 24.0);
  const ftRy = elem.h * (10.0 / 40.0);
  const ftYOffset = -2.0 * (elem.h / 40.0);

  const ftGroup = new THREE.Group();
  ftGroup.position.set(0, 0.02, ftYOffset);

  const rimGeom = new THREE.CylinderGeometry(1, 1, 0.4, 24);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const rim = new THREE.Mesh(rimGeom, rimMat);
  rim.position.y = 0.2;
  rim.scale.set(ftRx, 1.0, ftRy);
  rim.castShadow = true;
  ftGroup.add(rim);

  const waterGeom = new THREE.CylinderGeometry(1, 1, 0.3, 24);
  const waterMat = new THREE.MeshStandardMaterial({ color: COLORS.water || 0x0ea5e9, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.position.y = 0.22;
  water.scale.set(ftRx - 0.3, 1.0, ftRy - 0.3);
  ftGroup.add(water);

  const jetGeom = new THREE.CylinderGeometry(0.05, 0.3, 2.0, 12);
  const jetMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 });
  const jet = new THREE.Mesh(jetGeom, jetMat);
  jet.position.y = 1.2;
  ftGroup.add(jet);
  
  group.add(ftGroup);

  // Area Label
  const label = create3DLabel("ÁREA DE JARDÍN", "Exhibición Exterior", "#10b981");
  label.position.set(0, 5.0, 0);
  group.add(label);
}

function build3DEntrance(group, elem) {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  if (isBw) {
    build3DMonochrome(group, elem);
    return;
  }
  if (isCadD) {
    build3DWireframe(group, elem, 0x00ff00);
    return;
  }

  const rampWidth = 4.0;
  const rampLength = elem.w - 4.0;
  const rampHeightZ = 0.4;

  const rampShape = new THREE.Shape();
  rampShape.moveTo(0, rampHeightZ);
  rampShape.lineTo(rampLength, 0.0);
  rampShape.lineTo(rampLength, 0.0);
  rampShape.lineTo(0, 0.0);
  rampShape.closePath();
  
  const extrudeSettings = { depth: rampWidth, bevelEnabled: false };
  const rampGeom = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
  const rampMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
  const ramp = new THREE.Mesh(rampGeom, rampMat);
  ramp.position.set(-elem.w/2, 0.01, -elem.h/2);
  ramp.receiveShadow = true;
  group.add(ramp);

  const walkwayGeom = new THREE.BoxGeometry(4.0, 0.02, elem.h);
  const walkwayMat = new THREE.MeshStandardMaterial({
    color: isCadL ? 0xe2e8f0 : 0x334155,
    roughness: 0.8
  });
  const walkway = new THREE.Mesh(walkwayGeom, walkwayMat);
  walkway.position.set(elem.w/2 - 2.0, 0.01, 0);
  walkway.receiveShadow = true;
  group.add(walkway);

  const courtyardGeom = new THREE.BoxGeometry(elem.w - 4.0, 0.01, elem.h - 4.0);
  const courtyardMat = new THREE.MeshStandardMaterial({
    color: isCadL ? 0xf1f5f9 : 0x1e293b,
    roughness: 0.85
  });
  const courtyard = new THREE.Mesh(courtyardGeom, courtyardMat);
  courtyard.position.set(-2.0, 0.005, 2.0);
  courtyard.receiveShadow = true;
  group.add(courtyard);

  // Area Label
  const label = create3DLabel("ACCESO PRINCIPAL", "Entrada y Registro", "#94a3b8");
  label.position.set(0, 4.0, 0);
  group.add(label);
}

function build3DBathroom(group, elem) {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  if (isBw) {
    build3DMonochrome(group, elem);
    return;
  }
  if (isCadD) {
    build3DWireframe(group, elem, 0x00ffff);
    return;
  }

  const wH = 6.0;
  const wcWallMat = new THREE.MeshStandardMaterial({
    color: isCadL ? 0x64748b : 0x475569,
    roughness: 0.6
  });

  const boxGeom = new THREE.BoxGeometry(elem.w, wH, elem.h);
  const box = new THREE.Mesh(boxGeom, wcWallMat);
  box.position.y = wH / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#10b981";
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WC", 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const signMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const signPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), signMat);
  
  signPlane.position.set(0, 4.5, elem.h / 2 + 0.01);
  group.add(signPlane);

  // Area Label
  const label = create3DLabel("SERVICIOS SANITARIOS", "Sanitarios de la Expo", "#0ea5e9");
  label.position.set(0, 7.0, 0);
  group.add(label);
}

function build3DStage(group, elem) {
  const isBw = currentTheme === 'minimalist';
  const isCadL = currentTheme === 'cad-light';
  const isCadD = currentTheme === 'cad-dark';

  if (isBw) {
    build3DMonochrome(group, elem);
    return;
  }
  if (isCadD) {
    build3DWireframe(group, elem, 0xff00ff);
    return;
  }

  const rx = elem.w * (8.0 / 14.0);
  const ry = elem.h * (4.0 / 18.0);
  const tBarH = elem.h * (4.0 / 18.0);
  const tBarW = elem.w;
  const cwW = elem.w * (2.0 / 14.0);
  const cwH = elem.h;

  const stageMeshGeom = new THREE.CylinderGeometry(rx, rx, 0.8, 32, 1, false, -Math.PI / 2, Math.PI);
  const stageMeshMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.5 });
  const stageMesh = new THREE.Mesh(stageMeshGeom, stageMeshMat);
  stageMesh.scale.set(1.0, 1.0, ry / rx);
  stageMesh.rotation.y = 0;
  stageMesh.position.set(0, 0.4, -elem.h/2);
  stageMesh.receiveShadow = true;
  stageMesh.castShadow = true;
  group.add(stageMesh);

  if (!isCadL) {
    const ledGeom = new THREE.CylinderGeometry(rx + 0.02, rx + 0.02, 0.06, 32, 1, true, -Math.PI / 2, Math.PI);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.scale.set(1.0, 1.0, ry / rx);
    led.position.set(0, 0.8, -elem.h/2);
    group.add(led);
  }

  const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.5 });

  const stem = new THREE.Mesh(new THREE.BoxGeometry(cwW, 0.6, cwH - tBarH - ry), catwalkMat);
  stem.position.set(0, 0.3, -elem.h/2 + ry + (cwH - tBarH - ry)/2);
  stem.receiveShadow = true;
  stem.castShadow = true;
  group.add(stem);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(tBarW, 0.6, tBarH), catwalkMat);
  bar.position.set(0, 0.3, elem.h/2 - tBarH/2);
  bar.receiveShadow = true;
  bar.castShadow = true;
  group.add(bar);

  // Area Label
  const label = create3DLabel("ESCENARIO Y PASARELA", "Presentaciones en Vivo", "#c084fc");
  label.position.set(0, 4.0, -elem.h / 4);
  group.add(label);
}
