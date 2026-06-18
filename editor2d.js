/**
 * editor2d.js
 * Motor interactivo 2D para el plano en planta (SVG).
 * Maneja el dibujo de las estructuras fijas vectoriales digitalizadas a escala,
 * el arrastre de objetos, ajuste a rejilla (10cm), selección y transformaciones de zoom/panning.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./elements.js";

const SCALE = 15; // 1m = 15px (70m x 90m = 1050px x 1350px)
let activeSvg = null;
let currentElements = [];
let selectedElementId = null;
let isDragging = false;
let dragTarget = null;
let dragOffset = { x: 0, y: 0 };
let useGrid = true;
const GRID_SNAP_VAL = 0.1; // Ajuste cada 10 cm (0.1m)

// Variables de visualización (Zoom & Panning)
let zoom = 1.0;
let pan = { x: 0, y: 0 };
let isPanning = false;
let startPan = { x: 0, y: 0 };

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
  const gridOverlay = document.getElementById("svg-grid-overlay");
  if (gridOverlay) {
    gridOverlay.style.opacity = active ? "1" : "0";
  }
}

/* --- TRANSFORMACIONES DE COORDENADAS MOUSE-SVG-METROS --- */
function getMouseCoords(evt) {
  const rect = activeSvg.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  
  // Convertir a coordenadas nativas de viewBox (1050 x 1350)
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
  // Zoom centrado en el centro geométrico del plano (525, 675)
  pan.x = 525 - (525 - pan.x) * (zoom / oldZoom);
  pan.y = 675 - (675 - pan.y) * (zoom / oldZoom);
  applyZoomPan();
}

export function zoomOut() {
  const oldZoom = zoom;
  zoom = Math.max(0.4, zoom - 0.15);
  pan.x = 525 - (525 - pan.x) * (zoom / oldZoom);
  pan.y = 675 - (675 - pan.y) * (zoom / oldZoom);
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
  // 1. Dibujar Estructuras Fijas del Salón
  renderStaticStructures();

  // 2. Dibujar Elementos Dinámicos
  const elementsGroup = document.getElementById("svg-elements-group");
  if (!elementsGroup) return;
  
  elementsGroup.innerHTML = "";
  
  // Ordenar elementos para asegurar que las estructuras de fondo se dibujen primero
  const sortedElements = [...currentElements].sort((a, b) => {
    const typeOrder = { "salon": 1, "garden": 2, "entrance": 3, "bathroom": 4, "stage": 5 };
    const valA = typeOrder[a.type] || 10;
    const valB = typeOrder[b.type] || 10;
    return valA - valB;
  });
  
  sortedElements.forEach(elem => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `draggable ${elem.type}`);
    group.setAttribute("data-id", elem.id);
    group.setAttribute("transform", `translate(${elem.x * SCALE}, ${elem.y * SCALE}) rotate(${elem.rotation || 0})`);
    
    if (elem.id === selectedElementId) {
      group.classList.add("selected");
    }
    
    switch (elem.type) {
      case "salon":
        renderSalon2D(group, elem);
        break;
      case "garden":
        renderGarden2D(group, elem);
        break;
      case "entrance":
        renderEntrance2D(group, elem);
        break;
      case "bathroom":
        renderBathroom2D(group, elem);
        break;
      case "stage":
        renderStage2D(group, elem);
        break;
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
      case "door":
        renderDoor(group, elem);
        break;
      default:
        renderGeneric(group, elem);
        break;
    }
    
    setupDragEvents(group, elem);
    elementsGroup.appendChild(group);
  });
}

/* --- RENDERIZACIÓN DE COMPONENTES FIJOS --- */
function renderStaticStructures() {
  const staticGroup = document.getElementById("svg-static-group");
  if (!staticGroup) return;
  staticGroup.innerHTML = "";
}

/* --- RENDERIZACIÓN DE MUEBLES --- */
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

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "-4");
  title.setAttribute("font-size", "11");
  title.setAttribute("font-weight", "800");
  title.setAttribute("fill", "#ffffff");
  title.setAttribute("text-anchor", "middle");
  title.textContent = elem.name;
  group.appendChild(title);

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

function renderTable(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
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

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "4");
  title.setAttribute("font-size", "9");
  title.setAttribute("font-weight", "700");
  title.setAttribute("fill", "#ffffff");
  title.setAttribute("text-anchor", "middle");
  title.textContent = elem.name;
  group.appendChild(title);

  const numChairs = elem.chairs || 0;
  const chairsOffset = 5;
  
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
    const cSize = 6;
    chair.setAttribute("x", (-cSize/2).toString());
    chair.setAttribute("y", (-cSize/2).toString());
    chair.setAttribute("width", cSize.toString());
    chair.setAttribute("height", cSize.toString());
    chair.setAttribute("rx", "1.5");
    chair.setAttribute("class", "svg-chair");
    
    const rotDeg = (angle * 180) / Math.PI;
    chair.setAttribute("transform", `translate(${chX}, ${chY}) rotate(${-rotDeg})`);
    group.appendChild(chair);
  }
}

function renderLounge(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;
  
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

  const sofaW = wPx * 0.75;
  const sofaH = 6;
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

  const tableW = wPx * 0.4;
  const tableH = 4;
  const table = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  table.setAttribute("x", (-tableW/2).toString());
  table.setAttribute("y", (-tableH/2).toString());
  table.setAttribute("width", tableW.toString());
  table.setAttribute("height", tableH.toString());
  table.setAttribute("fill", "#ffffff");
  table.setAttribute("rx", "1");
  group.appendChild(table);
}

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
}

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

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "0");
  label.setAttribute("y", "3");
  label.setAttribute("font-size", "8");
  label.setAttribute("fill", "#ffffff");
  label.setAttribute("font-weight", "700");
  label.setAttribute("text-anchor", "middle");
  label.textContent = "FOTO";
  group.appendChild(label);
}

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
}

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
}

function renderHighTable(group, elem) {
  const wPx = elem.w * SCALE;

  if (elem.type === "umbrella") {
    const umbrella = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    umbrella.setAttribute("cx", "0");
    umbrella.setAttribute("cy", "0");
    umbrella.setAttribute("r", (wPx/2).toString());
    umbrella.setAttribute("fill", elem.color || "#0284c7");
    umbrella.setAttribute("fill-opacity", "0.85");
    umbrella.setAttribute("stroke", "#0369a1");
    umbrella.setAttribute("stroke-width", "1");
    group.appendChild(umbrella);
  }

  const centerTable = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  centerTable.setAttribute("cx", "0");
  centerTable.setAttribute("cy", "0");
  centerTable.setAttribute("r", (wPx * 0.25).toString());
  centerTable.setAttribute("fill", "#b45309");
  centerTable.setAttribute("stroke", "#ffffff");
  group.appendChild(centerTable);

  const numStools = elem.chairs || 4;
  for (let i = 0; i < numStools; i++) {
    const angle = (i * 2 * Math.PI) / numStools;
    const stX = Math.sin(angle) * (wPx * 0.42);
    const stY = Math.cos(angle) * (wPx * 0.42);
    
    const stool = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    stool.setAttribute("cx", stX.toString());
    stool.setAttribute("cy", stY.toString());
    stool.setAttribute("r", "3.0");
    stool.setAttribute("fill", "#475569");
    stool.setAttribute("stroke", "#1e293b");
    group.appendChild(stool);
  }
}

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
}

function renderDoor(group, elem) {
  const dW = elem.w * SCALE;
  
  // Fondo ocultador para simular el hueco en el muro en 2D
  const gap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  gap.setAttribute("x", (-dW/2).toString());
  gap.setAttribute("y", "-4");
  gap.setAttribute("width", dW.toString());
  gap.setAttribute("height", "8");
  gap.setAttribute("fill", "var(--svg-bg)");
  group.appendChild(gap);

  // Línea de la puerta abierta
  const doorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  doorLine.setAttribute("x1", (-dW/2).toString());
  doorLine.setAttribute("y1", "0");
  doorLine.setAttribute("x2", (-dW/2).toString());
  doorLine.setAttribute("y2", (-dW).toString());
  doorLine.setAttribute("class", "svg-door");
  group.appendChild(doorLine);

  // Arco de apertura
  const swing = document.createElementNS("http://www.w3.org/2000/svg", "path");
  swing.setAttribute("d", `M ${-dW/2} ${-dW} A ${dW} ${dW} 0 0 1 ${dW/2} 0`);
  swing.setAttribute("class", "svg-door");
  swing.setAttribute("stroke-dasharray", "4 3");
  group.appendChild(swing);

  // Etiqueta identificativa
  const doorLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  doorLbl.setAttribute("x", "0");
  doorLbl.setAttribute("y", (-dW - 6).toString());
  doorLbl.setAttribute("class", "svg-label");
  doorLbl.setAttribute("text-anchor", "middle");
  doorLbl.setAttribute("font-size", "10");
  doorLbl.setAttribute("transform", `rotate(${-(elem.rotation || 0)})`);
  doorLbl.textContent = elem.name.toUpperCase();
  group.appendChild(doorLbl);
}

function renderSalon2D(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("fill", elem.color || "#1e293b");
  box.setAttribute("fill-opacity", "0.08");
  box.setAttribute("stroke", "var(--svg-wall-stroke)");
  box.setAttribute("stroke-width", "3.0");
  group.appendChild(box);

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "6");
  title.setAttribute("class", "svg-label");
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "14");
  title.setAttribute("font-weight", "800");
  title.textContent = elem.name.toUpperCase();
  group.appendChild(title);
}

function renderGarden2D(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  // Jardín/Césped
  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("class", "svg-garden-zone");
  if (elem.color) {
    box.setAttribute("fill", elem.color);
  }
  group.appendChild(box);

  // Fuente ovalada (proporcional al tamaño del jardín)
  const ftRx = elem.w * (5.0 / 24.0) * SCALE;
  const ftRy = elem.h * (10.0 / 40.0) * SCALE;
  const ftYOffset = -2.0 * (elem.h / 40.0) * SCALE;

  const fountainOuter = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  fountainOuter.setAttribute("cx", "0");
  fountainOuter.setAttribute("cy", ftYOffset.toString());
  fountainOuter.setAttribute("rx", ftRx.toString());
  fountainOuter.setAttribute("ry", ftRy.toString());
  fountainOuter.setAttribute("class", "svg-fountain-outer");
  group.appendChild(fountainOuter);
  
  const fountainInner = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  fountainInner.setAttribute("cx", "0");
  fountainInner.setAttribute("cy", ftYOffset.toString());
  fountainInner.setAttribute("rx", (ftRx * 0.45).toString());
  fountainInner.setAttribute("ry", (ftRy * 0.45).toString());
  fountainInner.setAttribute("fill", "#60a5fa");
  group.appendChild(fountainInner);

  // Etiqueta
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", (hPx/2 - 12).toString());
  title.setAttribute("class", "svg-label");
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "11");
  title.textContent = elem.name.toUpperCase();
  group.appendChild(title);
}

function renderEntrance2D(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  // Límite punteado
  const boundary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  boundary.setAttribute("x", (-wPx/2).toString());
  boundary.setAttribute("y", (-hPx/2).toString());
  boundary.setAttribute("width", wPx.toString());
  boundary.setAttribute("height", hPx.toString());
  boundary.setAttribute("fill", "none");
  boundary.setAttribute("stroke", "var(--svg-wall-stroke)");
  boundary.setAttribute("stroke-width", "1.5");
  boundary.setAttribute("stroke-dasharray", "8 4");
  group.appendChild(boundary);

  // Patio
  const courtyard = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  courtyard.setAttribute("x", (-wPx/2).toString());
  courtyard.setAttribute("y", (-hPx/2 + 4.0 * SCALE).toString());
  courtyard.setAttribute("width", (wPx - 4.0 * SCALE).toString());
  courtyard.setAttribute("height", (hPx - 4.0 * SCALE).toString());
  courtyard.setAttribute("fill", "none");
  courtyard.setAttribute("stroke", "var(--svg-wall-stroke)");
  courtyard.setAttribute("stroke-width", "0.8");
  courtyard.setAttribute("stroke-dasharray", "4 4");
  group.appendChild(courtyard);

  // Pasillo
  const walkway = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  walkway.setAttribute("x", (wPx/2 - 4.0 * SCALE).toString());
  walkway.setAttribute("y", (-hPx/2).toString());
  walkway.setAttribute("width", (4.0 * SCALE).toString());
  walkway.setAttribute("height", hPx.toString());
  walkway.setAttribute("fill", "var(--svg-ramp)");
  walkway.setAttribute("fill-opacity", "0.3");
  walkway.setAttribute("stroke", "var(--svg-wall-stroke)");
  walkway.setAttribute("stroke-width", "1");
  group.appendChild(walkway);

  // Rampa
  const ramp = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  ramp.setAttribute("x", (-wPx/2).toString());
  ramp.setAttribute("y", (-hPx/2).toString());
  ramp.setAttribute("width", (wPx - 4.0 * SCALE).toString());
  ramp.setAttribute("height", (4.0 * SCALE).toString());
  ramp.setAttribute("class", "svg-ramp-zone");
  group.appendChild(ramp);

  // Flecha
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const ax = 0;
  const ay = -hPx/2 + 2.0 * SCALE;
  arrow.setAttribute("d", `M ${ax+15} ${ay-7} L ${ax} ${ay} L ${ax+15} ${ay+7} M ${ax} ${ay} L ${ax+25} ${ay}`);
  arrow.setAttribute("stroke", "#ffffff");
  arrow.setAttribute("stroke-width", "1.5");
  arrow.setAttribute("fill", "none");
  group.appendChild(arrow);

  // Etiqueta
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", (wPx/2 - 2.0 * SCALE).toString());
  title.setAttribute("y", "0");
  title.setAttribute("class", "svg-label");
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "10");
  title.setAttribute("transform", `rotate(90, ${wPx/2 - 2.0 * SCALE}, 0)`);
  title.textContent = elem.name.toUpperCase();
  group.appendChild(title);
}

function renderBathroom2D(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  box.setAttribute("x", (-wPx/2).toString());
  box.setAttribute("y", (-hPx/2).toString());
  box.setAttribute("width", wPx.toString());
  box.setAttribute("height", hPx.toString());
  box.setAttribute("class", "svg-wc-zone");
  if (elem.color) {
    box.setAttribute("fill", elem.color);
  }
  group.appendChild(box);

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "0");
  title.setAttribute("y", "4");
  title.setAttribute("class", "svg-label");
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "11");
  title.textContent = elem.name.toUpperCase();
  group.appendChild(title);
}

function renderStage2D(group, elem) {
  const wPx = elem.w * SCALE;
  const hPx = elem.h * SCALE;

  const rx = elem.w * (8.0 / 14.0) * SCALE;
  const ry = elem.h * (4.0 / 18.0) * SCALE;
  const tBarH = elem.h * (4.0 / 18.0) * SCALE;
  const tBarW = wPx;
  const cwW = elem.w * (2.0 / 14.0) * SCALE;

  // Escenario
  const stage = document.createElementNS("http://www.w3.org/2000/svg", "path");
  stage.setAttribute("d", `M ${-rx} ${-hPx/2} A ${rx} ${ry} 0 0 0 ${rx} ${-hPx/2} Z`);
  stage.setAttribute("class", "svg-stage-zone");
  if (elem.color) {
    stage.setAttribute("fill", elem.color);
  }
  group.appendChild(stage);

  // Pasarela
  const catwalk = document.createElementNS("http://www.w3.org/2000/svg", "path");
  catwalk.setAttribute("d", `
    M ${-cwW/2} ${-hPx/2 + ry} 
    L ${-cwW/2} ${hPx/2 - tBarH}
    L ${-tBarW/2} ${hPx/2 - tBarH}
    L ${-tBarW/2} ${hPx/2}
    L ${tBarW/2} ${hPx/2}
    L ${tBarW/2} ${hPx/2 - tBarH}
    L ${cwW/2} ${hPx/2 - tBarH}
    L ${cwW/2} ${-hPx/2 + ry} Z
  `);
  catwalk.setAttribute("class", "svg-catwalk-zone");
  if (elem.color) {
    catwalk.setAttribute("fill", elem.color);
  }
  group.appendChild(catwalk);

  // Etiquetas
  const stageTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
  stageTxt.setAttribute("x", "0");
  stageTxt.setAttribute("y", (-hPx/2 + ry/2 + 2).toString());
  stageTxt.setAttribute("class", "svg-label");
  stageTxt.setAttribute("text-anchor", "middle");
  stageTxt.textContent = "ESCENARIO";
  group.appendChild(stageTxt);

  const catwalkTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
  catwalkTxt.setAttribute("x", "0");
  catwalkTxt.setAttribute("y", (hPx/2 - tBarH/2 + 3).toString());
  catwalkTxt.setAttribute("class", "svg-label");
  catwalkTxt.setAttribute("text-anchor", "middle");
  catwalkTxt.textContent = "PASARELA";
  group.appendChild(catwalkTxt);
}

/* --- EVENTOS DE ARRASTRE DE ELEMENTOS --- */
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
    
    const fakeEvent = { clientX: pointer.clientX, clientY: pointer.clientY };
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
      
      if (onSelectedCallback) onSelectedCallback(elem, !hasMoved);
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
  
  newX = Math.max(elementRadiusW, Math.min(CANVAS_WIDTH - elementRadiusW, newX));
  newY = Math.max(elementRadiusH, Math.min(CANVAS_HEIGHT - elementRadiusH, newY));
  
  if (useGrid) {
    newX = Math.round(newX / GRID_SNAP_VAL) * GRID_SNAP_VAL;
    newY = Math.round(newY / GRID_SNAP_VAL) * GRID_SNAP_VAL;
  }
  
  newX = parseFloat(newX.toFixed(2));
  newY = parseFloat(newY.toFixed(2));
  
  dragTarget.x = newX;
  dragTarget.y = newY;
  
  const g = activeSvg.querySelector(`.draggable[data-id="${dragTarget.id}"]`);
  if (g) {
    g.setAttribute("transform", `translate(${newX * SCALE}, ${newY * SCALE}) rotate(${dragTarget.rotation || 0})`);
  }
  
  if (onMovedCallback) onMovedCallback(dragTarget);
}
