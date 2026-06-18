/**
 * editor2d.js
 * Motor interactivo 2D para el plano en planta (SVG).
 * Maneja el dibujo de las estructuras fijas, la superposición de croquis base.jpeg,
 * el arrastre de objetos, ajuste a rejilla (10cm), selección y transformaciones de zoom/panning.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, STATIC_STRUCTURES } from "./elements.js";

const SCALE = 20; // 1m = 20px
let activeSvg = null;
let currentElements = [];
let selectedElementId = null;
let isDragging = false;
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let useGrid = true;
const GRID_SNAP_VAL = 0.1; // Ajuste cada 10 cm (0.1m)

// Variables de visualización
let zoom = 1.0;
let pan = { x: 0, y: 0 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let bgOpacity = 0.55; // Opacidad por defecto del croquis base

// Callbacks para comunicar con app.js
let onSelectedCallback = null;
let onMovedCallback = null;

export function init2D(svgElement, initialElements, onSelected, onMoved) {
  activeSvg = svgElement;
  currentElements = initialElements;
  onSelectedCallback = onSelected;
  onMovedCallback = onMoved;
  
  setupCanvasEvents();
  render();
  applyZoomPan();
}

export function updateElements2D(elementsArray) {
  currentElements = elementsArray;
  render();
}

export function selectElement2D(elementId) {
  selectedElementId = elementId;
  
  // Actualizar clases CSS sin re-renderizar todo
  const allGroups = activeSvg.querySelectorAll(".draggable");
  allGroups.forEach(g => {
    if (g.getAttribute("data-id") === elementId) {
      g.classList.add("selected");
    } else {
      g.classList.remove("selected");
    }
  });
}

export function setGridSnap(active) {
  useGrid = active;
  const gridPattern = document.getElementById("canvas-grid");
  if (gridPattern) {
    gridPattern.style.opacity = active ? "1" : "0";
  }
}

export function setBgOpacity(opacityVal) {
  bgOpacity = opacityVal;
  const bgImg = document.getElementById("svg-bg-image");
  if (bgImg) {
    bgImg.setAttribute("opacity", opacityVal);
  }
}

/* --- TRANSFORMACIONES DE COORDENADAS MOUSE-SVG-METROS --- */
function getMouseCoords(evt) {
  const rect = activeSvg.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  
  // Convertir a coordenadas nativas de viewBox (1200 x 1600)
  const svgX = (x / rect.width) * (CANVAS_WIDTH * SCALE);
  const svgY = (y / rect.height) * (CANVAS_HEIGHT * SCALE);
  
  // Transformación inversa considerando Zoom y Paneo
  const mX = (svgX - pan.x) / (zoom * SCALE);
  const mY = (svgY - pan.y) / (zoom * SCALE);
  
  return {
    mX: parseFloat(Math.max(0, Math.min(CANVAS_WIDTH, mX)).toFixed(2)),
    mY: parseFloat(Math.max(0, Math.min(CANVAS_HEIGHT, mY)).toFixed(2))
  };
}

function applyZoomPan() {
  const zoomGroup = document.getElementById("svg-zoom-group");
  if (zoomGroup) {
    zoomGroup.setAttribute("transform", `translate(${pan.x}, ${pan.y}) scale(${zoom})`);
  }
}

export function zoomIn() {
  const oldZoom = zoom;
  zoom = Math.min(3.0, zoom + 0.15);
  // Zoom enfocado en el centro geométrico del plano (600, 800)
  pan.x = 600 - (600 - pan.x) * (zoom / oldZoom);
  pan.y = 800 - (800 - pan.y) * (zoom / oldZoom);
  applyZoomPan();
}

export function zoomOut() {
  const oldZoom = zoom;
  zoom = Math.max(0.4, zoom - 0.15);
  pan.x = 600 - (600 - pan.x) * (zoom / oldZoom);
  pan.y = 800 - (800 - pan.y) * (zoom / oldZoom);
  applyZoomPan();
}

export function resetZoom() {
  zoom = 1.0;
  pan.x = 0;
  pan.y = 0;
  applyZoomPan();
}

/* --- CONFIGURACIÓN DE EVENTOS GENERALES DEL CANVAS --- */
function setupCanvasEvents() {
  // 1. Mostrar coordenadas arquitectónicas en el HUD
  activeSvg.addEventListener("mousemove", (evt) => {
    const coords = getMouseCoords(evt);
    const coordHud = document.getElementById("coord-hud");
    if (coordHud) {
      coordHud.innerHTML = `<i class="fa-solid fa-crosshairs"></i> X: ${coords.mX.toFixed(1)}m, Y: ${coords.mY.toFixed(1)}m`;
    }
  });
  
  // 2. Deseleccionar elementos al hacer clic en el fondo vacío
  activeSvg.addEventListener("click", (evt) => {
    const draggable = evt.target.closest(".draggable");
    if (!draggable) {
      selectedElementId = null;
      if (onSelectedCallback) onSelectedCallback(null);
      render();
    }
  });

  // 3. Zoom mediante la rueda del ratón (Wheel)
  activeSvg.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    const oldZoom = zoom;
    const intensity = 0.08;
    
    const rect = activeSvg.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    
    const x_f = (mouseX / rect.width) * (CANVAS_WIDTH * SCALE);
    const y_f = (mouseY / rect.height) * (CANVAS_HEIGHT * SCALE);
    
    if (evt.deltaY < 0) {
      zoom = Math.min(3.0, zoom + intensity);
    } else {
      zoom = Math.max(0.4, zoom - intensity);
    }
    
    pan.x = x_f - (x_f - pan.x) * (zoom / oldZoom);
    pan.y = y_f - (y_f - pan.y) * (zoom / oldZoom);
    
    applyZoomPan();
  }, { passive: false });

  // 4. Desplazamiento del lienzo 2D (Panning)
  activeSvg.addEventListener("mousedown", (evt) => {
    // Solo panea si NO estamos tocando un elemento arrastrable
    const draggable = evt.target.closest(".draggable");
    if (!draggable) {
      isPanning = true;
      startPan.x = evt.clientX - pan.x;
      startPan.y = evt.clientY - pan.y;
      activeSvg.style.cursor = "grabbing";
      
      const onMouseMovePan = (moveEvt) => {
        if (isPanning) {
          pan.x = moveEvt.clientX - startPan.x;
          pan.y = moveEvt.clientY - startPan.y;
          applyZoomPan();
        }
      };
      
      const onMouseUpPan = () => {
        isPanning = false;
        activeSvg.style.cursor = "default";
        window.removeEventListener("mousemove", onMouseMovePan);
        window.removeEventListener("mouseup", onMouseUpPan);
      };
      
      window.addEventListener("mousemove", onMouseMovePan);
      window.addEventListener("mouseup", onMouseUpPan);
    }
  });
}

/* --- RENDERIZADOR GENERAL DE CAPAS --- */
function render() {
  // 1. Dibujar Imagen Base / Croquis (como fondo)
  const bgGroup = document.getElementById("svg-bg-group");
  if (bgGroup) {
    bgGroup.innerHTML = "";
    const bgImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
    bgImg.setAttribute("id", "svg-bg-image");
    bgImg.setAttribute("href", "croquis base.jpeg");
    bgImg.setAttribute("x", "0");
    bgImg.setAttribute("y", "0");
    bgImg.setAttribute("width", (CANVAS_WIDTH * SCALE).toString());
    bgImg.setAttribute("height", (CANVAS_HEIGHT * SCALE).toString());
    bgImg.setAttribute("opacity", bgOpacity.toString());
    bgGroup.appendChild(bgImg);
  }

  // 2. Dibujar Estructuras Fijas del Salón
  renderStaticStructures();

  // 3. Dibujar Elementos Dinámicos (Stands, Mesas, Mobiliario)
  const elementsGroup = document.getElementById("svg-elements-group");
  if (!elementsGroup) return;
  
  elementsGroup.innerHTML = "";
  
  currentElements.forEach(elem => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `draggable ${elem.type}`);
    group.setAttribute("data-id", elem.id);
    group.setAttribute("transform", `translate(${elem.x * SCALE}, ${elem.y * SCALE}) rotate(${elem.rotation || 0})`);
    
    if (elem.id === selectedElementId) {
      group.classList.add("selected");
    }
    
    switch (elem.type) {
      case "stand":
        renderStand(group, elem);
        break;
      case "table":
        renderTable(group, elem);
        break;
      case "lounge":
        renderLounge(group, elem);
        break;
      case "giant_letters":
        renderGiantLetters(group, elem);
        break;
      case "mirror":
        renderMirror(group, elem);
        break;
      case "photobooth":
        renderPhotobooth(group, elem);
        break;
      case "dj":
      case "dj_audio":
        renderDJ(group, elem);
        break;
      case "shrub":
        renderShrub(group, elem);
        break;
      case "umbrella":
      case "bar_stool":
        renderHighTable(group, elem);
        break;
      default:
        renderGeneric(group, elem);
        break;
    }
    
    setupDragEvents(group, elem);
    elementsGroup.appendChild(group);
  });
}

/* --- RENDERIZACIÓN DE COMPONENTES FIJOS (MUROS, BAÑOS, ESCENARIO) --- */
function renderStaticStructures() {
  const staticGroup = document.getElementById("svg-static-group");
  if (!staticGroup) return;
  staticGroup.innerHTML = "";

  // A) Dibujar Jardín y Césped
  const gd = STATIC_STRUCTURES.garden;
  const gardenRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  gardenRect.setAttribute("x", (gd.x * SCALE).toString());
  gardenRect.setAttribute("y", (gd.y * SCALE).toString());
  gardenRect.setAttribute("width", (gd.w * SCALE).toString());
  gardenRect.setAttribute("height", (gd.h * SCALE).toString());
  gardenRect.setAttribute("class", "svg-garden-zone");
  staticGroup.appendChild(gardenRect);

  // B) Dibujar Fuente en el jardín
  const ft = gd.fountain;
  const fountainOuter = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fountainOuter.setAttribute("cx", (ft.x * SCALE).toString());
  fountainOuter.setAttribute("cy", (ft.y * SCALE).toString());
  fountainOuter.setAttribute("r", (ft.radius * SCALE).toString());
  fountainOuter.setAttribute("class", "svg-fountain-outer");
  staticGroup.appendChild(fountainOuter);
  
  const fountainInner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fountainInner.setAttribute("cx", (ft.x * SCALE).toString());
  fountainInner.setAttribute("cy", (ft.y * SCALE).toString());
  fountainInner.setAttribute("r", (ft.radius * 0.4 * SCALE).toString());
  fountainInner.setAttribute("fill", "#60a5fa");
  staticGroup.appendChild(fountainInner);

  // C) Dibujar Rampa y Lobby de Entrada
  const ent = STATIC_STRUCTURES.entrance;
  const ramp = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  ramp.setAttribute("x", ((ent.x - ent.rampWidth/2) * SCALE).toString());
  ramp.setAttribute("y", (ent.y * SCALE).toString());
  ramp.setAttribute("width", (ent.rampWidth * SCALE).toString());
  ramp.setAttribute("height", (ent.rampLength * SCALE).toString());
  ramp.setAttribute("class", "svg-ramp-zone");
  staticGroup.appendChild(ramp);

  // Dibuja flechas en la rampa indicando subida
  const rampArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const ax = ent.x * SCALE;
  const ay = (ent.y + ent.rampLength * 0.7) * SCALE;
  rampArrow.setAttribute("d", `M ${ax-10} ${ay} L ${ax} ${ay-15} L ${ax+10} ${ay} M ${ax} ${ay-15} L ${ax} ${ay+10}`);
  rampArrow.setAttribute("stroke", "#ffffff");
  rampArrow.setAttribute("stroke-width", "1.5");
  rampArrow.setAttribute("fill", "none");
  staticGroup.appendChild(rampArrow);

  // D) Dibujar Baños (WC)
  STATIC_STRUCTURES.bathrooms.forEach(bath => {
    const wc = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    wc.setAttribute("x", (bath.x * SCALE).toString());
    wc.setAttribute("y", (bath.y * SCALE).toString());
    wc.setAttribute("width", (bath.w * SCALE).toString());
    wc.setAttribute("height", (bath.h * SCALE).toString());
    wc.setAttribute("class", "svg-wc-zone");
    staticGroup.appendChild(wc);

    const wcText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    wcText.setAttribute("x", ((bath.x + bath.w/2) * SCALE).toString());
    wcText.setAttribute("y", ((bath.y + bath.h/2 + 0.2) * SCALE).toString());
    wcText.setAttribute("class", "svg-label");
    wcText.setAttribute("text-anchor", "middle");
    wcText.textContent = bath.name;
    staticGroup.appendChild(wcText);
  });

  // E) Dibujar Escenario en Media Luna
  const stg = STATIC_STRUCTURES.stage;
  const stagePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  // Ruta de media luna que une los extremos
  const stX = stg.x * SCALE;
  const stY = stg.y * SCALE;
  const rx = stg.radiusX * SCALE;
  const ry = stg.radiusY * SCALE;
  // Arco desde el extremo izquierdo al derecho, y luego línea recta superior
  stagePath.setAttribute("d", `M ${stX - rx} ${stY} A ${rx} ${ry} 0 0 0 ${stX + rx} ${stY} Z`);
  stagePath.setAttribute("class", "svg-stage-zone");
  staticGroup.appendChild(stagePath);

  const stageText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  stageText.setAttribute("x", stX.toString());
  stageText.setAttribute("y", (stY + ry/2).toString());
  stageText.setAttribute("class", "svg-label");
  stageText.setAttribute("text-anchor", "middle");
  stageText.textContent = "ESCENARIO";
  staticGroup.appendChild(stageText);

  // F) Dibujar Pasarela en T
  const cw = stg.catwalk;
  const catwalkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const cx = cw.x * SCALE;
  const cy = cw.y * SCALE;
  const cwW = cw.w * SCALE;
  const cwH = cw.h * SCALE;
  const tW = cw.tBarW * SCALE;
  const tH = cw.tBarH * SCALE;
  // Dibujar contorno de la pasarela en forma de T
  catwalkPath.setAttribute("d", `
    M ${cx - cwW/2} ${cy} 
    L ${cx - cwW/2} ${cy + cwH - tH}
    L ${cx - tW/2} ${cy + cwH - tH}
    L ${cx - tW/2} ${cy + cwH}
    L ${cx + tW/2} ${cy + cwH}
    L ${cx + tW/2} ${cy + cwH - tH}
    L ${cx + cwW/2} ${cy + cwH - tH}
    L ${cx + cwW/2} ${cy} Z
  `);
  catwalkPath.setAttribute("class", "svg-catwalk-zone");
  staticGroup.appendChild(catwalkPath);

  const catwalkText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  catwalkText.setAttribute("x", cx.toString());
  catwalkText.setAttribute("y", (cy + cwH/2).toString());
  catwalkText.setAttribute("class", "svg-label");
  catwalkText.setAttribute("text-anchor", "middle");
  catwalkText.setAttribute("font-size", "10");
  catwalkText.textContent = "PASARELA";
  staticGroup.appendChild(catwalkText);

  // G) Dibujar Muros del Salón
  STATIC_STRUCTURES.walls.forEach(wall => {
    const wl = document.createElementNS("http://www.w3.org/2000/svg", "line");
    wl.setAttribute("x1", (wall.x1 * SCALE).toString());
    wl.setAttribute("y1", (wall.y1 * SCALE).toString());
    wl.setAttribute("x2", (wall.x2 * SCALE).toString());
    wl.setAttribute("y2", (wall.y2 * SCALE).toString());
    wl.setAttribute("class", "svg-wall");
    staticGroup.appendChild(wl);
  });

  // H) Dibujar Puertas e1 a e7
  STATIC_STRUCTURES.doors.forEach(door => {
    const gDoor = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gDoor.setAttribute("transform", `translate(${door.x * SCALE}, ${door.y * SCALE}) rotate(${door.angle})`);
    
    // Ancho de la puerta
    const dW = door.w * SCALE;
    
    // Hueco del muro
    const gap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    gap.setAttribute("x", (-dW/2).toString());
    gap.setAttribute("y", "-4");
    gap.setAttribute("width", dW.toString());
    gap.setAttribute("height", "8");
    gap.setAttribute("fill", "var(--svg-bg)");
    gDoor.appendChild(gap);

    if (door.id !== "e7") {
      // Línea de la puerta abierta
      const doorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      doorLine.setAttribute("x1", (-dW/2).toString());
      doorLine.setAttribute("y1", "0");
      doorLine.setAttribute("x2", (-dW/2).toString());
      doorLine.setAttribute("y2", (-dW).toString());
      doorLine.setAttribute("class", "svg-door");
      gDoor.appendChild(doorLine);

      // Arco de giro
      const swing = document.createElementNS("http://www.w3.org/2000/svg", "path");
      swing.setAttribute("d", `M ${-dW/2} ${-dW} A ${dW} ${dW} 0 0 1 ${dW/2} 0`);
      swing.setAttribute("class", "svg-door");
      swing.setAttribute("stroke-dasharray", "4 3");
      gDoor.appendChild(swing);
    }

    // Texto de la puerta (e.g. E1)
    const doorLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    doorLbl.setAttribute("x", "0");
    doorLbl.setAttribute("y", (door.id === "e7" ? 15 : -dW - 6).toString());
    doorLbl.setAttribute("class", "svg-label");
    doorLbl.setAttribute("text-anchor", "middle");
    doorLbl.setAttribute("font-size", "10");
    // Rotar texto para que quede horizontal
    doorLbl.setAttribute("transform", `rotate(${-door.angle})`);
    doorLbl.textContent = door.id.toUpperCase();
    gDoor.appendChild(doorLbl);

    staticGroup.appendChild(gDoor);
  });
}

/* --- RENDERIZACIÓN DE MUEBLES DINÁMICOS --- */

// 1. Renderizar Stand de Expositor
function renderStand(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("fill", elem.color || "#065f46");
  box.setAttribute("fill-opacity", "0.22");
  box.setAttribute("stroke", elem.color || "#065f46");
  box.setAttribute("stroke-width", "2.5");
  box.setAttribute("rx", "6");
  group.appendChild(box);

  // Letrero del stand
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "-4");
  title.setAttribute("font-size", "11");
  title.setAttribute("font-weight", "800");
  title.setAttribute("fill", "#ffffff");
  title.setAttribute("text-anchor", "middle");
  title.textContent = elem.name;
  group.appendChild(title);

  // Nombre del expositor
  const exp = document.createElementNS("http://www.w3.org/2000/svg", "text");
  exp.setAttribute("x", "0");
  exp.setAttribute("y", "12");
  exp.setAttribute("font-size", "9");
  exp.setAttribute("font-weight", "500");
  exp.setAttribute("fill", "var(--text-muted)");
  exp.setAttribute("text-anchor", "middle");
  exp.textContent = elem.exhibitor || "Vacío";
  group.appendChild(exp);
}

// 2. Renderizar Mesas con sus comensales Tiffany
function renderTable(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Mesa Física
  if (elem.shape === "circle") {
    const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circ.setAttribute("cx", "0");
    circ.setAttribute("cy", "0");
    circ.setAttribute("r", (wPx/2).toString());
    circ.setAttribute("fill", elem.color || "#b45309");
    circ.setAttribute("stroke", "#ffffff");
    circ.setAttribute("stroke-width", "1");
    group.appendChild(circ);
  } else {
    const rct = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rct.setAttribute("x", (-wPx/2).toString());
    rct.setAttribute("y", (-hPx/2).toString());
    rct.setAttribute("width", wPx.toString());
    rct.setAttribute("height", hPx.toString());
    rct.setAttribute("fill", elem.color || "#78350f");
    rct.setAttribute("stroke", "#ffffff");
    rct.setAttribute("stroke-width", "1");
    rct.setAttribute("rx", "2");
    group.appendChild(rct);
  }

  // Identificador de la mesa
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "4");
  title.setAttribute("font-size", "9");
  title.setAttribute("font-weight", "700");
  title.setAttribute("fill", "#ffffff");
  title.setAttribute("text-anchor", "middle");
  title.textContent = elem.name;
  group.appendChild(title);

  // Dibujar Sillas alrededor
  const numChairs = elem.chairs || 0;
  const chairsOffset = 6; // px fuera del contorno de la mesa
  
  for (let i = 0; i < numChairs; i++) {
    const angle = (i * 2 * Math.PI) / numChairs;
    let chX = 0;
    let chY = 0;
    
    if (elem.shape === "circle") {
      chX = Math.sin(angle) * (wPx/2 + chairsOffset);
      chY = Math.cos(angle) * (wPx/2 + chairsOffset);
    } else {
      chX = Math.sin(angle) * (wPx/2 + chairsOffset);
      chY = Math.cos(angle) * (hPx/2 + chairsOffset);
    }
    
    const chair = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const cSize = 7; // px de la silla en 2D
    chair.setAttribute("x", (-cSize/2).toString());
    chair.setAttribute("y", (-cSize/2).toString());
    chair.setAttribute("width", cSize.toString());
    chair.setAttribute("height", cSize.toString());
    chair.setAttribute("rx", "1.5");
    chair.setAttribute("class", "svg-chair");
    
    // Rotar la silla para que apunte al centro de la mesa
    const rotDeg = (angle * 180) / Math.PI;
    chair.setAttribute("transform", `translate(${chX}, ${chY}) rotate(${-rotDeg})`);
    group.appendChild(chair);
  }
}

// 3. Renderizar Sala Lounge
function renderLounge(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  // Marco de la sala
  const area = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  area.setAttribute("x", (-wPx/2).toString());
  area.setAttribute("y", (-hPx/2).toString());
  area.setAttribute("width", wPx.toString());
  area.setAttribute("height", hPx.toString());
  area.setAttribute("fill", "rgba(190, 24, 93, 0.1)");
  area.setAttribute("stroke", elem.color || "#be185d");
  area.setAttribute("stroke-width", "1");
  area.setAttribute("stroke-dasharray", "4 3");
  area.setAttribute("rx", "4");
  group.appendChild(area);

  // Sillones laterales
  const sofaW = wPx * 0.75;
  const sofaH = 8;
  const sofa = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  sofa.setAttribute("x", (-sofaW/2).toString());
  sofa.setAttribute("y", (-hPx/2 + 2).toString());
  sofa.setAttribute("width", sofaW.toString());
  sofa.setAttribute("height", sofaH.toString());
  sofa.setAttribute("fill", elem.color || "#be185d");
  sofa.setAttribute("rx", "2");
  group.appendChild(sofa);

  const sofa2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  sofa2.setAttribute("x", (-sofaW/2).toString());
  sofa2.setAttribute("y", (hPx/2 - sofaH - 2).toString());
  sofa2.setAttribute("width", sofaW.toString());
  sofa2.setAttribute("height", sofaH.toString());
  sofa2.setAttribute("fill", elem.color || "#be185d");
  sofa2.setAttribute("rx", "2");
  group.appendChild(sofa2);

  // Mesa de centro
  const tableW = wPx * 0.4;
  const tableH = 6;
  const table = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  table.setAttribute("x", (-tableW/2).toString());
  table.setAttribute("y", (-tableH/2).toString());
  table.setAttribute("width", tableW.toString());
  table.setAttribute("height", tableH.toString());
  table.setAttribute("fill", "#ffffff");
  table.setAttribute("rx", "1");
  group.appendChild(table);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "0");
  text.setAttribute("y", "14");
  text.setAttribute("font-size", "7");
  text.setAttribute("fill", "#ffffff");
  text.setAttribute("text-anchor", "middle");
  text.textContent = "LOUNGE";
  group.appendChild(text);
}

// 4. Renderizar Letras Gigantes
function renderGiantLetters(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("fill", "none");
  box.setAttribute("stroke", elem.color || "#f59e0b");
  box.setAttribute("stroke-width", "1.5");
  box.setAttribute("stroke-dasharray", "3 3");
  group.appendChild(box);

  const textVal = elem.text || "LOVE";
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "0");
  label.setAttribute("y", "4");
  label.setAttribute("font-size", "14");
  label.setAttribute("font-weight", "900");
  label.setAttribute("fill", elem.color || "#f59e0b");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("letter-spacing", "0.2em");
  label.textContent = textVal;
  group.appendChild(label);
}

// 5. Renderizar Espejo
function renderMirror(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  const frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  frame.setAttribute("x", (-wPx/2).toString());
  frame.setAttribute("y", (-hPx/2).toString());
  frame.setAttribute("width", wPx.toString());
  frame.setAttribute("height", hPx.toString());
  frame.setAttribute("fill", "#38bdf8");
  frame.setAttribute("fill-opacity", "0.2");
  frame.setAttribute("stroke", elem.color || "#d4af37");
  frame.setAttribute("stroke-width", "2");
  group.appendChild(frame);

  const reflection = document.createElementNS("http://www.w3.org/2000/svg", "line");
  reflection.setAttribute("x1", (-wPx/3).toString());
  reflection.setAttribute("y1", (hPx/3).toString());
  reflection.setAttribute("x2", (wPx/3).toString());
  reflection.setAttribute("y2", (-hPx/3).toString());
  reflection.setAttribute("stroke", "#ffffff");
  reflection.setAttribute("stroke-width", "1.5");
  reflection.setAttribute("opacity", "0.6");
  group.appendChild(reflection);
}

// 6. Renderizar Cabina de Fotos
function renderPhotobooth(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("fill", elem.color || "#1e3a8a");
  box.setAttribute("stroke", "#ffffff");
  box.setAttribute("stroke-width", "1.5");
  box.setAttribute("rx", "3");
  group.appendChild(box);

  const camIcon = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  camIcon.setAttribute("cx", "0");
  camIcon.setAttribute("cy", "-2");
  camIcon.setAttribute("r", (wPx/5).toString());
  camIcon.setAttribute("fill", "none");
  camIcon.setAttribute("stroke", "#ffffff");
  camIcon.setAttribute("stroke-width", "1.5");
  group.appendChild(camIcon);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "0");
  label.setAttribute("y", (hPx/3).toString());
  label.setAttribute("font-size", "8");
  label.setAttribute("fill", "#ffffff");
  label.setAttribute("font-weight", "700");
  label.setAttribute("text-anchor", "middle");
  label.textContent = "CABINA";
  group.appendChild(label);
}

// 7. Renderizar DJ / Cabina de Música
function renderDJ(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
  const consoleRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  consoleRect.setAttribute("x", (-wPx/2).toString());
  consoleRect.setAttribute("y", (-hPx/2).toString());
  consoleRect.setAttribute("width", wPx.toString());
  consoleRect.setAttribute("height", hPx.toString());
  consoleRect.setAttribute("fill", elem.color || "#0f172a");
  consoleRect.setAttribute("stroke", "#6366f1");
  consoleRect.setAttribute("stroke-width", "1.5");
  consoleRect.setAttribute("rx", "2");
  group.appendChild(consoleRect);

  // Discos giratorios
  const diskL = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  diskL.setAttribute("cx", (-wPx/4).toString());
  diskL.setAttribute("cy", "0");
  diskL.setAttribute("r", (hPx/3.5).toString());
  diskL.setAttribute("fill", "#000000");
  diskL.setAttribute("stroke", "#818cf8");
  group.appendChild(diskL);

  const diskR = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  diskR.setAttribute("cx", (wPx/4).toString());
  diskR.setAttribute("cy", "0");
  diskR.setAttribute("r", (hPx/3.5).toString());
  diskR.setAttribute("fill", "#000000");
  diskR.setAttribute("stroke", "#818cf8");
  group.appendChild(diskR);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "0");
  label.setAttribute("y", "3");
  label.setAttribute("font-size", "7");
  label.setAttribute("fill", "#ffffff");
  label.setAttribute("text-anchor", "middle");
  label.textContent = "DJ";
  group.appendChild(label);
}

// 8. Renderizar Arbusto
function renderShrub(group, elem) {
  const wPx = elem.w * SCALE;
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "0");
  circle.setAttribute("cy", "0");
  circle.setAttribute("r", (wPx/2).toString());
  circle.setAttribute("fill", elem.color || "#166534");
  circle.setAttribute("stroke", "#14532d");
  circle.setAttribute("stroke-width", "1.5");
  group.appendChild(circle);

  // Toques orgánicos
  for (let i = 0; i < 4; i++) {
    const leaf = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const angle = (i * Math.PI) / 2;
    leaf.setAttribute("cx", (Math.sin(angle) * wPx/4).toString());
    leaf.setAttribute("cy", (Math.cos(angle) * wPx/4).toString());
    leaf.setAttribute("r", (wPx/6).toString());
    leaf.setAttribute("fill", "#22c55e");
    leaf.setAttribute("opacity", "0.7");
    group.appendChild(leaf);
  }
}

// 9. Renderizar Mesa de Periqueras o Mesa con Sombrilla
function renderHighTable(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  if (elem.type === "umbrella") {
    // Sombrilla
    const umbrella = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    umbrella.setAttribute("cx", "0");
    umbrella.setAttribute("cy", "0");
    umbrella.setAttribute("r", (wPx/2).toString());
    umbrella.setAttribute("fill", elem.color || "#0284c7");
    umbrella.setAttribute("fill-opacity", "0.85");
    umbrella.setAttribute("stroke", "#0369a1");
    umbrella.setAttribute("stroke-width", "1");
    group.appendChild(umbrella);

    // Gajos de la sombrilla
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", "0");
      line.setAttribute("x2", (Math.sin(angle) * wPx/2).toString());
      line.setAttribute("y2", (Math.cos(angle) * wPx/2).toString());
      line.setAttribute("stroke", "#ffffff");
      line.setAttribute("stroke-width", "0.7");
      line.setAttribute("opacity", "0.5");
      group.appendChild(line);
    }
  }

  // Mesa centro
  const centerTable = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  centerTable.setAttribute("cx", "0");
  centerTable.setAttribute("cy", "0");
  centerTable.setAttribute("r", (wPx * 0.25).toString());
  centerTable.setAttribute("fill", "#b45309");
  centerTable.setAttribute("stroke", "#ffffff");
  group.appendChild(centerTable);

  // Bancos (sillas altas)
  const numStools = elem.chairs || 4;
  for (let i = 0; i < numStools; i++) {
    const angle = (i * 2 * Math.PI) / numStools;
    const stX = Math.sin(angle) * (wPx * 0.42);
    const stY = Math.cos(angle) * (wPx * 0.42);
    
    const stool = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    stool.setAttribute("cx", stX.toString());
    stool.setAttribute("cy", stY.toString());
    stool.setAttribute("r", "3.5");
    stool.setAttribute("fill", "#475569");
    stool.setAttribute("stroke", "#1e293b");
    group.appendChild(stool);
  }
}

// 10. Renderizador Genérico
function renderGeneric(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("fill", elem.color || "#64748b");
  box.setAttribute("stroke", "#ffffff");
  box.setAttribute("stroke-width", "1");
  box.setAttribute("rx", "3");
  group.appendChild(box);

  const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  lbl.setAttribute("x", "0");
  lbl.setAttribute("y", "4");
  lbl.setAttribute("font-size", "8");
  lbl.setAttribute("fill", "#ffffff");
  lbl.setAttribute("text-anchor", "middle");
  lbl.textContent = elem.name;
  group.appendChild(lbl);
}

/* --- EVENTOS DE ARRASTRE DE ELEMENTOS DRAGGABLE --- */
function setupDragEvents(group, elem) {
  const startDrag = (evt) => {
    evt.stopPropagation();
    
    let isTouch = evt.type.startsWith("touch");
    let pointer = isTouch ? evt.touches[0] : evt;
    
    const startX = pointer.clientX;
    const startY = pointer.clientY;
    let hasMoved = false;
    
    isDragging = true;
    dragTarget = elem;
    
    const fakeEvent = {
      clientX: pointer.clientX,
      clientY: pointer.clientY
    };
    
    const mouseCoords = getMouseCoords(fakeEvent);
    dragOffset.x = mouseCoords.mX - elem.x;
    dragOffset.y = mouseCoords.mY - elem.y;
    
    const onMove = (moveEvt) => {
      if (!isDragging || !dragTarget) return;
      let movePointer = isTouch ? moveEvt.touches[0] : moveEvt;
      
      const distance = Math.hypot(movePointer.clientX - startX, movePointer.clientY - startY);
      if (distance > 4) {
        hasMoved = true;
        if (isTouch) moveEvt.preventDefault();
        
        const rect = activeSvg.getBoundingClientRect();
        const pointerX = movePointer.clientX - rect.left;
        const pointerY = movePointer.clientY - rect.top;
        updateDragPosition(pointerX, pointerY, rect);
      }
    };
    
    const onEnd = () => {
      isDragging = false;
      dragTarget = null;
      
      if (isTouch) {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      } else {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
      }
      
      selectedElementId = elem.id;
      selectElement2D(elem.id);
      
      if (onSelectedCallback) {
        onSelectedCallback(elem, !hasMoved);
      }
      render();
    };
    
    if (isTouch) {
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    } else {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
    }
  };

  group.addEventListener("mousedown", startDrag);
  group.addEventListener("touchstart", startDrag);
}

function updateDragPosition(clientX, clientY, rect) {
  const svgX = (clientX / rect.width) * (CANVAS_WIDTH * SCALE);
  const svgY = (clientY / rect.height) * (CANVAS_HEIGHT * SCALE);
  
  const zoomX = (svgX - pan.x) / zoom;
  const zoomY = (svgY - pan.y) / zoom;
  
  let newX = zoomX / SCALE - dragOffset.x;
  let newY = zoomY / SCALE - dragOffset.y;
  
  const elementRadiusW = dragTarget.w / 2;
  const elementRadiusH = dragTarget.h / 2;
  
  // Limitar dentro del terreno de 60m x 80m
  newX = Math.max(elementRadiusW, Math.min(CANVAS_WIDTH - elementRadiusW, newX));
  newY = Math.max(elementRadiusH, Math.min(CANVAS_HEIGHT - elementRadiusH, newY));
  
  // Snap a rejilla de 10cm
  if (useGrid) {
    newX = Math.round(newX / GRID_SNAP_VAL) * GRID_SNAP_VAL;
    newY = Math.round(newY / GRID_SNAP_VAL) * GRID_SNAP_VAL;
  }
  
  newX = parseFloat(newX.toFixed(2));
  newY = parseFloat(newY.toFixed(2));
  
  dragTarget.x = newX;
  dragTarget.y = newY;
  
  // Actualizar la traslación SVG al instante
  const g = activeSvg.querySelector(`.draggable[data-id="${dragTarget.id}"]`);
  if (g) {
    g.setAttribute("transform", `translate(${newX * SCALE}, ${newY * SCALE}) rotate(${dragTarget.rotation || 0})`);
  }
  
  if (onMovedCallback) {
    onMovedCallback(dragTarget);
  }
}
