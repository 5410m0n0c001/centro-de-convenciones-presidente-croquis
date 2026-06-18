/**
 * app.js
 * Orquestador principal y gestor de estado central (Single Source of Truth).
 * Conecta los eventos del Editor 2D (SVG), el Visor 3D (Three.js),
 * el panel de control de temas, la caja de herramientas y el inspector.
 */

import { INITIAL_ELEMENTS, TOOLBOX_TEMPLATES, CANVAS_WIDTH, CANVAS_HEIGHT, STATIC_STRUCTURES } from "./elements.js";
import { init2D, updateElements2D, selectElement2D, setGridSnap, setBgOpacity, zoomIn, zoomOut, resetZoom } from "./editor2d.js";
import { init3D, destroy3D, syncWithData, selectElement3D, resetCamera3D } from "./visualizer3d.js";

// Estado global de la aplicación
const state = {
  elements: [],
  selectedElement: null,
  activeView: "2d", // "2d" o "3d"
  useGrid: true,
  bgOpacity: 0.55,
  currentTheme: "premium"
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. Cargar datos iniciales (desde LocalStorage o desde elements.js)
  const savedLayout = localStorage.getItem("cc_presidente_layout");
  if (savedLayout) {
    try {
      state.elements = JSON.parse(savedLayout);
    } catch (e) {
      console.error("Error al cargar distribución guardada. Usando valores iniciales.", e);
      state.elements = JSON.parse(JSON.stringify(INITIAL_ELEMENTS));
    }
  } else {
    state.elements = JSON.parse(JSON.stringify(INITIAL_ELEMENTS));
  }

  // 2. Inicializar interfaces del HUD y paneles
  setupUI();
  populateToolbox();

  // 3. Inicializar el canvas 2D
  const svgCanvas = document.getElementById("event-svg");
  init2D(svgCanvas, state.elements, handleElementSelected, handleElementMoved);

  // 4. Configurar listeners de controles e inspector
  setupControlListeners();
  setupInspectorListeners();

  // Sincronizar recuentos métricos
  updateMetrics();
});

/* --- CONFIGURACIÓN DE NAVEGACIÓN Y MENÚS DE LA UI --- */
function setupUI() {
  const btn2d = document.getElementById("btn-view-2d");
  const btn3d = document.getElementById("btn-view-3d");
  const container2d = document.getElementById("container-2d");
  const container3d = document.getElementById("container-3d");

  btn2d.addEventListener("click", () => {
    if (state.activeView === "2d") return;
    state.activeView = "2d";
    
    btn2d.classList.add("active");
    btn3d.classList.remove("active");
    container2d.classList.add("active");
    container3d.classList.remove("active");
    
    // Apagar motor 3D para optimizar recursos
    destroy3D();
    
    // Re-dibujar SVG 2D
    updateElements2D(state.elements);
    setBgOpacity(state.bgOpacity);
    if (state.selectedElement) {
      selectElement2D(state.selectedElement.id);
    }
  });

  btn3d.addEventListener("click", () => {
    if (state.activeView === "3d") return;
    state.activeView = "3d";
    
    btn3d.classList.add("active");
    btn2d.classList.remove("active");
    container3d.classList.add("active");
    container2d.classList.remove("active");
    
    // Inicializar Three.js en el contenedor
    init3D(container3d, state.elements, state.currentTheme);
    if (state.selectedElement) {
      selectElement3D(state.selectedElement.id);
    }
  });

  // HUD botones de Zoom
  document.getElementById("btn-zoom-in").addEventListener("click", zoomIn);
  document.getElementById("btn-zoom-out").addEventListener("click", zoomOut);
  document.getElementById("btn-zoom-reset").addEventListener("click", resetZoom);
  
  document.getElementById("btn-reset-cam-3d").addEventListener("click", () => {
    if (state.activeView === "3d") {
      resetCamera3D();
    }
  });

  // Mobile drawer logic
  const mobileToggle = document.getElementById("mobile-toggle-btn");
  const sidebar = document.querySelector(".sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  if (mobileToggle && sidebar && backdrop) {
    const toggleSidebar = () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
    };
    mobileToggle.addEventListener("click", toggleSidebar);
    backdrop.addEventListener("click", toggleSidebar);
    document.querySelectorAll(".mobile-close-sidebar-btn").forEach(btn => {
      btn.addEventListener("click", toggleSidebar);
    });
  }
}

/* --- CARGAR TEMPLATES EN LA CAJA DE HERRAMIENTAS --- */
function populateToolbox() {
  const toolboxGrid = document.getElementById("toolbox-grid");
  if (!toolboxGrid) return;
  toolboxGrid.innerHTML = "";

  TOOLBOX_TEMPLATES.forEach(tmpl => {
    const item = document.createElement("div");
    item.className = "tool-item";
    
    // Icono correspondiente de FontAwesome
    let iconHTML = `<i class="fa-solid fa-shapes"></i>`;
    if (tmpl.icon) {
      iconHTML = `<i class="fa-solid fa-${tmpl.icon}"></i>`;
    }
    
    item.innerHTML = `
      ${iconHTML}
      <span>${tmpl.name}</span>
    `;

    item.addEventListener("click", () => {
      addNewElement(tmpl);
    });
    
    toolboxGrid.appendChild(item);
  });
}

/* --- OPERACIONES CON ELEMENTOS (CREAR, CLONAR, ELIMINAR) --- */
function addNewElement(tmpl) {
  const timestamp = Date.now();
  const newId = `${tmpl.type}-${timestamp}`;

  // Centrar el nuevo objeto en la mitad del salón techado (x:30, y:40) con leve dispersión
  const offset = (Math.random() - 0.5) * 4;
  const newX = parseFloat((30.0 + offset).toFixed(1));
  const newY = parseFloat((40.0 + offset).toFixed(1));

  const newElem = {
    id: newId,
    type: tmpl.type.startsWith("table") ? "table" : tmpl.type,
    name: tmpl.name.replace(" (10p)", "").replace(" (+4s)", ""),
    x: newX,
    y: newY,
    w: tmpl.w,
    h: tmpl.h,
    shape: tmpl.shape || "rectangle",
    rotation: 0,
    chairs: tmpl.chairs || 0,
    color: tmpl.color,
    editable: true,
    removable: true
  };

  if (tmpl.exhibitor) newElem.exhibitor = tmpl.exhibitor;
  if (tmpl.text) newElem.text = tmpl.text;

  state.elements.push(newElem);
  syncAllViews();
  showToast("Elemento agregado al plano");
  
  // Auto-seleccionar el nuevo elemento
  handleElementSelected(newElem, true);
}

function cloneElement() {
  if (!state.selectedElement) return;
  const elem = state.selectedElement;
  
  const timestamp = Date.now();
  const newId = `${elem.type}-clone-${timestamp}`;
  
  const clone = JSON.parse(JSON.stringify(elem));
  clone.id = newId;
  clone.name = elem.name + " (Copia)";
  // Desplazar levemente para que no se superponga
  clone.x = parseFloat(Math.min(CANVAS_WIDTH - elem.w, elem.x + 1.5).toFixed(1));
  clone.y = parseFloat(Math.min(CANVAS_HEIGHT - elem.h, elem.y + 1.5).toFixed(1));
  
  state.elements.push(clone);
  syncAllViews();
  showToast("Elemento duplicado");
  handleElementSelected(clone, true);
}

function deleteElement() {
  if (!state.selectedElement) return;
  const id = state.selectedElement.id;
  
  state.elements = state.elements.filter(e => e.id !== id);
  state.selectedElement = null;
  
  // Cerrar inspector
  closeInspector();
  
  syncAllViews();
  showToast("Elemento eliminado");
}

/* --- SINCRONIZACIÓN DE COMPONENTES 2D / 3D --- */
function syncAllViews() {
  // Guardar en cache
  localStorage.setItem("cc_presidente_layout", JSON.stringify(state.elements));

  if (state.activeView === "2d") {
    updateElements2D(state.elements);
    if (state.selectedElement) {
      selectElement2D(state.selectedElement.id);
    }
  } else {
    syncWithData(state.elements);
    if (state.selectedElement) {
      selectElement3D(state.selectedElement.id);
    }
  }

  updateMetrics();
}

/* --- EVENTOS DE COMUNICACIÓN CON LOS LIENZOS --- */
function handleElementSelected(elem, openPanel = true) {
  state.selectedElement = elem;
  
  if (!elem) {
    closeInspector();
    if (state.activeView === "2d") selectElement2D(null);
    else selectElement3D(null);
    return;
  }

  // Activar selección visual
  if (state.activeView === "2d") {
    selectElement2D(elem.id);
  } else {
    selectElement3D(elem.id);
  }

  // Llenar panel inspector
  populateInspector(elem);
  
  // Abrir panel en móvil/pantallas chicas si es requerido
  if (openPanel) {
    const drawer = document.getElementById("detail-drawer");
    if (drawer) drawer.classList.add("open");
  }
}

function handleElementMoved(elem) {
  // Actualizar coordenadas en el estado
  const index = state.elements.findIndex(e => e.id === elem.id);
  if (index !== -1) {
    state.elements[index].x = elem.x;
    state.elements[index].y = elem.y;
  }
  
  // Guardar cambio
  localStorage.setItem("cc_presidente_layout", JSON.stringify(state.elements));
  
  // Actualizar campos numéricos del inspector si está activo
  if (state.selectedElement && state.selectedElement.id === elem.id) {
    document.getElementById("prop-x").value = elem.x;
    document.getElementById("prop-y").value = elem.y;
    calculateLogisticsDistances(elem);
  }

  // Si está en 3D, sincronizar la posición
  if (state.activeView === "3d") {
    syncWithData(state.elements);
  }
  
  updateMetrics();
}

/* --- GESTIÓN DE CONFIGURACIÓN Y CONTROLES GENERALES --- */
function setupControlListeners() {
  // Limpiar plano
  document.getElementById("btn-clear-layout").addEventListener("click", () => {
    if (confirm("¿Seguro que deseas limpiar todo el plano? Se borrarán todos los stands y muebles.")) {
      state.elements = [];
      state.selectedElement = null;
      closeInspector();
      syncAllViews();
      showToast("Plano limpio");
    }
  });

  // Snapping a rejilla
  const gridCheck = document.getElementById("layer-grid");
  if (gridCheck) {
    gridCheck.addEventListener("change", (e) => {
      state.useGrid = e.target.checked;
      setGridSnap(state.useGrid);
    });
  }

  // Opacidad de Croquis base
  const opacityInput = document.getElementById("bg-opacity-input");
  const opacityValText = document.getElementById("bg-opacity-val");
  if (opacityInput) {
    opacityInput.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      state.bgOpacity = val;
      if (opacityValText) opacityValText.textContent = `${Math.round(val * 100)}%`;
      setBgOpacity(val);
    });
  }

  // Temas / Estilos de visualización
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetBtn = e.target.closest(".theme-btn");
      const theme = targetBtn.id.replace("theme-", "");
      state.currentTheme = theme;
      
      // Activar botón en UI
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      targetBtn.classList.add("active");
      
      // Aplicar al body
      document.body.setAttribute("data-theme", theme);
      
      // Si está activa la vista 3D, reiniciar escena con la nueva iluminación/niebla/materiales
      if (state.activeView === "3d") {
        const container3d = document.getElementById("container-3d");
        destroy3D();
        init3D(container3d, state.elements, state.currentTheme);
        if (state.selectedElement) {
          selectElement3D(state.selectedElement.id);
        }
      }
      
      showToast(`Estilo cambiado a: ${targetBtn.textContent.trim()}`);
    });
  });

  // Exportar plano a archivo JSON
  document.getElementById("btn-export-json").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.elements, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `croquis_presidente_layout.json`);
    dlAnchorElem.click();
    showToast("Archivo JSON exportado");
  });

  // Importar plano desde JSON
  const fileInput = document.getElementById("import-file-input");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            state.elements = parsed;
            state.selectedElement = null;
            closeInspector();
            syncAllViews();
            showToast("Plano importado exitosamente");
          } else {
            alert("El archivo JSON no tiene un formato válido de distribución.");
          }
        } catch (err) {
          alert("Error al leer el archivo JSON.");
        }
      };
      reader.readAsText(file);
      // Limpiar input
      fileInput.value = "";
    });
  }

  // Botón para compartir o simular link
  const btnShare = document.getElementById("btn-share");
  if (btnShare) {
    btnShare.addEventListener("click", () => {
      const url = new URL(window.location.href);
      // Podríamos codificar la distribución en base64 en la URL, pero para este RAG basta con mostrar el aviso
      navigator.clipboard.writeText(url.href).then(() => {
        showToast("Enlace de diseño copiado al portapapeles");
      });
    });
  }

  // Cerrar pantalla de bienvenida
  const welcomeBtn = document.getElementById("welcome-close-btn");
  if (welcomeBtn) {
    welcomeBtn.addEventListener("click", () => {
      const welcome = document.getElementById("welcome-overlay");
      if (welcome) {
        welcome.style.opacity = "0";
        setTimeout(() => welcome.remove(), 500);
      }
    });
  }
}

/* --- CONTROLADORES DEL INSPECTOR LATERAL --- */
function setupInspectorListeners() {
  const closeBtn = document.getElementById("btn-close-drawer");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeInspector);
  }

  // Actualizadores de inputs
  const updateProp = (key, value) => {
    if (!state.selectedElement) return;
    
    // Modificar propiedad en el elemento
    state.selectedElement[key] = value;
    
    // Sincronizar en el arreglo
    const index = state.elements.findIndex(e => e.id === state.selectedElement.id);
    if (index !== -1) {
      state.elements[index][key] = value;
    }
    
    syncAllViews();
  };

  document.getElementById("prop-name").addEventListener("input", (e) => updateProp("name", e.target.value));
  document.getElementById("prop-exhibitor").addEventListener("input", (e) => updateProp("exhibitor", e.target.value));
  document.getElementById("prop-text").addEventListener("input", (e) => updateProp("text", e.target.value));

  document.getElementById("prop-x").addEventListener("change", (e) => updateProp("x", parseFloat(parseFloat(e.target.value).toFixed(2))));
  document.getElementById("prop-y").addEventListener("change", (e) => updateProp("y", parseFloat(parseFloat(e.target.value).toFixed(2))));
  document.getElementById("prop-w").addEventListener("change", (e) => updateProp("w", parseFloat(parseFloat(e.target.value).toFixed(2))));
  document.getElementById("prop-h").addEventListener("change", (e) => updateProp("h", parseFloat(parseFloat(e.target.value).toFixed(2))));
  document.getElementById("prop-rotation").addEventListener("change", (e) => updateProp("rotation", parseInt(e.target.value)));

  const shapeSelect = document.getElementById("prop-shape");
  if (shapeSelect) {
    shapeSelect.addEventListener("change", (e) => {
      updateProp("shape", e.target.value);
    });
  }

  const chairsSelect = document.getElementById("prop-chairs");
  if (chairsSelect) {
    chairsSelect.addEventListener("change", (e) => {
      updateProp("chairs", parseInt(e.target.value));
    });
  }

  const colorSelect = document.getElementById("prop-color");
  if (colorSelect) {
    colorSelect.addEventListener("change", (e) => {
      updateProp("color", e.target.value);
    });
  }

  // Botón clonar e eliminar del inspector
  document.getElementById("btn-clone-prop").addEventListener("click", cloneElement);
  document.getElementById("btn-delete-prop").addEventListener("click", deleteElement);
}

function populateInspector(elem) {
  document.getElementById("prop-name").value = elem.name;
  document.getElementById("prop-x").value = elem.x;
  document.getElementById("prop-y").value = elem.y;
  document.getElementById("prop-w").value = elem.w;
  document.getElementById("prop-h").value = elem.h;
  document.getElementById("prop-rotation").value = elem.rotation || 0;
  document.getElementById("prop-color").value = elem.color;

  // Campos condicionales según tipo
  const groupExhibitor = document.getElementById("group-prop-exhibitor");
  const groupText = document.getElementById("group-prop-text");
  const groupChairs = document.getElementById("group-prop-chairs");
  const groupShape = document.getElementById("group-prop-shape");

  // Ocultar todos por defecto
  groupExhibitor.style.display = "none";
  groupText.style.display = "none";
  groupChairs.style.display = "none";
  groupShape.style.display = "none";

  if (elem.type === "stand") {
    groupExhibitor.style.display = "flex";
    document.getElementById("prop-exhibitor").value = elem.exhibitor || "";
  } 
  else if (elem.type === "giant_letters") {
    groupText.style.display = "flex";
    document.getElementById("prop-text").value = elem.text || "LOVE";
  } 
  else if (elem.type === "table" || elem.type === "umbrella" || elem.type === "bar_stool") {
    groupChairs.style.display = "flex";
    groupShape.style.display = "flex";
    document.getElementById("prop-chairs").value = elem.chairs || 0;
    document.getElementById("prop-shape").value = elem.shape || "circle";
  }

  // Calcular métricas de logística para el elemento
  calculateLogisticsDistances(elem);
}

function closeInspector() {
  const drawer = document.getElementById("detail-drawer");
  if (drawer) drawer.classList.remove("open");
  state.selectedElement = null;
  if (state.activeView === "2d") selectElement2D(null);
  else selectElement3D(null);
}

/* --- CALCULO LOGISTICO DE DISTANCIAS REALES --- */
function calculateLogisticsDistances(elem) {
  // Coordenadas fijas de las estructuras CCP
  // Escenario
  const stgX = STATIC_STRUCTURES.stage.x;
  const stgY = STATIC_STRUCTURES.stage.y;
  
  // Baño más cercano
  const wcLX = STATIC_STRUCTURES.bathrooms[0].x + STATIC_STRUCTURES.bathrooms[0].w/2;
  const wcLY = STATIC_STRUCTURES.bathrooms[0].y + STATIC_STRUCTURES.bathrooms[0].h/2;
  const wcRX = STATIC_STRUCTURES.bathrooms[1].x + STATIC_STRUCTURES.bathrooms[1].w/2;
  const wcRY = STATIC_STRUCTURES.bathrooms[1].y + STATIC_STRUCTURES.bathrooms[1].h/2;
  
  // Entrada
  const entX = STATIC_STRUCTURES.entrance.x;
  const entY = STATIC_STRUCTURES.entrance.y;

  // Calcular
  const distStage = Math.hypot(elem.x - stgX, elem.y - stgY);
  const distWcL = Math.hypot(elem.x - wcLX, elem.y - wcLY);
  const distWcR = Math.hypot(elem.x - wcRX, elem.y - wcRY);
  const distWc = Math.min(distWcL, distWcR);
  const distEntrance = Math.hypot(elem.x - entX, elem.y - entY);

  document.getElementById("dist-stage-val").textContent = `${distStage.toFixed(1)} metros`;
  document.getElementById("dist-wc-val").textContent = `${distWc.toFixed(1)} metros`;
  document.getElementById("dist-entrance-val").textContent = `${distEntrance.toFixed(1)} metros`;
}

/* --- METRICAS DE LA PARTE INFERIOR Y BADGES --- */
function updateMetrics() {
  let capacity = 0;
  let tablesCount = 0;
  let standsCount = 0;

  state.elements.forEach(elem => {
    if (elem.type === "table" || elem.type === "umbrella" || elem.type === "bar_stool") {
      capacity += elem.chairs || 0;
      tablesCount++;
    } else if (elem.type === "stand") {
      standsCount++;
    }
  });

  // Escribir en la UI
  document.getElementById("metric-capacity").textContent = capacity.toString();
  document.getElementById("metric-tables").textContent = tablesCount.toString();
  document.getElementById("metric-stands").textContent = standsCount.toString();
  
  // Ficha comercial de impresión
  const printCap = document.getElementById("print-layout-capacity");
  if (printCap) printCap.textContent = `${capacity} Comensales / ${standsCount} Stands`;
}

/* --- TOAST NOTIFICATIONS --- */
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
