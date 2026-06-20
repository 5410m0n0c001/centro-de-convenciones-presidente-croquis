/**
 * elements.js
 * Definición del terreno (70m x 90m), las estructuras fijas del Centro de Convenciones Presidente
 * digitalizadas del croquis a escala.
 * Escala: 1m = 15px en el canvas SVG (1050 x 1350 px).
 */

export const CANVAS_WIDTH = 70.0;  // 70 metros de ancho
export const CANVAS_HEIGHT = 90.0; // 90 metros de largo (eje Y en 2D, eje Z en 3D)

// Dimensiones y posición del Salón Techado principal
export const SALON = {
  x: 10.0,      // Comienza en 10m
  y: 12.0,      // Comienza en 12m
  width: 36.0,  // 36m de ancho (24 - 6 = 18 cuadrados * 2m = 36m)
  height: 58.0  // 58m de largo (36 - 7 = 29 cuadrados * 2m = 58m)
};

// Estructuras fijas (muros, WC, escenario, rampa, fuente)
export const STATIC_STRUCTURES = {
  walls: [],
  bathrooms: [],
  stage: null,
  entrance: null,
  garden: null,
  doors: []
};

// Elementos iniciales de muestra
export const INITIAL_ELEMENTS = [
  {
    id: "stand-init-1",
    type: "stand",
    name: "Stand 01",
    exhibitor: "Expositor Moda",
    x: 14.0,
    y: 38.0,
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    rotation: 0,
    color: "#065f46",
    editable: true,
    removable: true
  },
  {
    id: "stand-init-2",
    type: "stand",
    name: "Stand 02",
    exhibitor: "Expositor Joyería",
    x: 42.0,
    y: 38.0,
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    rotation: 0,
    color: "#78350f",
    editable: true,
    removable: true
  },
  {
    id: "dancefloor-main",
    type: "dancefloor",
    name: "Pista de Baile",
    x: 28.0,
    y: 48.0,
    w: 8.0,
    h: 6.0,
    shape: "rectangle",
    rotation: 0,
    color: "#820ad1",
    editable: true,
    removable: true
  },
  {
    id: "dj-main",
    type: "dj",
    name: "Cabina DJ",
    x: 28.0,
    y: 56.0,
    w: 4.0,
    h: 1.5,
    shape: "rectangle",
    rotation: 0,
    color: "#0d0c1d",
    editable: true,
    removable: true
  },
  { id: "table-1", type: "table", name: "Mesa 1", x: 18.0, y: 48.0, w: 1.6, h: 1.6, shape: "circle", rotation: 0, chairs: 10, color: "#b45309", editable: true, removable: true },
  { id: "table-2", type: "table", name: "Mesa 2", x: 38.0, y: 48.0, w: 1.6, h: 1.6, shape: "circle", rotation: 0, chairs: 10, color: "#b45309", editable: true, removable: true },
  { id: "e1", type: "door", name: "E1", x: 46.0, y: 22.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 270, color: "#C9A96E", editable: true, removable: true },
  { id: "e2", type: "door", name: "E2 (Rampa)", x: 46.0, y: 56.0, w: 4.0, h: 0.3, shape: "rectangle", rotation: 270, color: "#C9A96E", editable: true, removable: true },
  { id: "e3", type: "door", name: "E3", x: 38.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#C9A96E", editable: true, removable: true },
  { id: "e4", type: "door", name: "E4", x: 28.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#C9A96E", editable: true, removable: true },
  { id: "e5", type: "door", name: "E5", x: 18.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#C9A96E", editable: true, removable: true },
  { id: "e6", type: "door", name: "E6", x: 10.0, y: 54.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 90, color: "#C9A96E", editable: true, removable: true },
  { id: "e7", type: "door", name: "E7", x: 10.0, y: 22.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 90, color: "#C9A96E", editable: true, removable: true },
  {
    id: "salon-main",
    type: "salon",
    name: "Salón Techado",
    x: 28.0,
    y: 41.0,
    w: 36.0,
    h: 58.0,
    shape: "rectangle",
    rotation: 0,
    color: "#1e293b",
    editable: true,
    removable: false
  },
  {
    id: "garden-main",
    type: "garden",
    name: "Área de Jardín",
    x: 58.0,
    y: 32.0,
    w: 24.0,
    h: 40.0,
    shape: "rectangle",
    rotation: 0,
    color: "#166534",
    editable: true,
    removable: false
  },
  {
    id: "entrance-main",
    type: "entrance",
    name: "Entrada y Rampa",
    x: 58.0,
    y: 62.0,
    w: 24.0,
    h: 16.0,
    shape: "rectangle",
    rotation: 0,
    color: "#475569",
    editable: true,
    removable: false
  },
  {
    id: "bathroom-left",
    type: "bathroom",
    name: "WC Izquierdo",
    x: 9.0,
    y: 14.0,
    w: 2.0,
    h: 4.0,
    shape: "rectangle",
    rotation: 0,
    color: "#334155",
    editable: true,
    removable: false
  },
  {
    id: "bathroom-right",
    type: "bathroom",
    name: "WC Derecho",
    x: 47.0,
    y: 14.0,
    w: 2.0,
    h: 4.0,
    shape: "rectangle",
    rotation: 0,
    color: "#334155",
    editable: true,
    removable: false
  },
  {
    id: "stage-main",
    type: "stage",
    name: "Escenario y Pasarela",
    x: 28.0,
    y: 21.0,
    w: 14.0,
    h: 18.0,
    shape: "rectangle",
    rotation: 0,
    color: "#5c3d2e",
    editable: true,
    removable: false
  }
];

export const TOOLBOX_TEMPLATES = [
  {
    type: "stand",
    name: "Stand Comercial",
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    color: "#065f46",
    exhibitor: "Nuevo Expositor",
    icon: "store"
  },
  {
    type: "door",
    name: "Puerta de Acceso",
    w: 2.0,
    h: 0.3,
    shape: "rectangle",
    color: "#C9A96E",
    icon: "door-open"
  },
  {
    type: "salon",
    name: "Salón Principal",
    w: 36.0,
    h: 58.0,
    shape: "rectangle",
    color: "#1e293b",
    icon: "square"
  },
  {
    type: "garden",
    name: "Área de Jardín",
    w: 24.0,
    h: 40.0,
    shape: "rectangle",
    color: "#166534",
    icon: "leaf"
  },
  {
    type: "entrance",
    name: "Entrada y Rampa",
    w: 24.0,
    h: 16.0,
    shape: "rectangle",
    color: "#475569",
    icon: "road"
  },
  {
    type: "bathroom",
    name: "Baño WC",
    w: 2.0,
    h: 4.0,
    shape: "rectangle",
    color: "#334155",
    icon: "restroom"
  },
  {
    type: "stage",
    name: "Escenario Principal",
    w: 14.0,
    h: 18.0,
    shape: "rectangle",
    color: "#5c3d2e",
    icon: "star"
  },
  {
    type: "table_round",
    name: "Mesa Redonda (10p)",
    w: 1.6,
    h: 1.6,
    shape: "circle",
    color: "#b45309",
    chairs: 10,
    icon: "circle"
  },
  {
    type: "table_square",
    name: "Mesa Imperial/Cuadrada",
    w: 1.6,
    h: 1.6,
    shape: "square",
    color: "#78350f",
    chairs: 10,
    icon: "square"
  },
  {
    type: "chair",
    name: "Silla Individual",
    w: 0.5,
    h: 0.5,
    shape: "square",
    color: "#475569",
    chairs: 0,
    icon: "chair"
  },
  {
    type: "bar_stool",
    name: "Mesa Periquera (+4s)",
    w: 1.0,
    h: 1.0,
    shape: "circle",
    color: "#b45309",
    chairs: 4,
    icon: "circle-notch"
  },
  {
    type: "lounge",
    name: "Sala Lounge",
    w: 2.5,
    h: 2.5,
    shape: "rectangle",
    color: "#be185d",
    chairs: 0,
    icon: "couch"
  },
  {
    type: "umbrella",
    name: "Mesa con Sombrilla",
    w: 2.2,
    h: 2.2,
    shape: "circle",
    color: "#0369a1",
    chairs: 6,
    icon: "umbrella"
  },
  {
    type: "giant_letters",
    name: "Letras Gigantes",
    w: 4.0,
    h: 1.0,
    shape: "rectangle",
    color: "#f59e0b",
    text: "LOVE",
    icon: "font"
  },
  {
    type: "mirror",
    name: "Espejo Decorativo",
    w: 1.5,
    h: 0.4,
    shape: "rectangle",
    color: "#e2e8f0",
    icon: "square-poll-vertical"
  },
  {
    type: "photobooth",
    name: "Cabina de Fotos",
    w: 2.0,
    h: 2.0,
    shape: "rectangle",
    color: "#1e3a8a",
    icon: "camera"
  },
  {
    type: "dj_audio",
    name: "Cabina DJ Adicional",
    w: 3.0,
    h: 1.5,
    shape: "rectangle",
    color: "#0f172a",
    icon: "music"
  },
  {
    type: "shrub",
    name: "Arbusto Decorativo",
    w: 1.2,
    h: 1.2,
    shape: "circle",
    color: "#166534",
    icon: "leaf"
  }
];
