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
  // Salón Techado (Muros)
  walls: [
    // Muro Superior
    { x1: 10.0, y1: 12.0, x2: 46.0, y2: 12.0 },
    // Muro Izquierdo
    { x1: 10.0, y1: 12.0, x2: 10.0, y2: 70.0 },
    // Muro Derecho (dividido para dejar espacio al acceso de la rampa E2)
    { x1: 46.0, y1: 12.0, x2: 46.0, y2: 54.0 },
    { x1: 46.0, y1: 58.0, x2: 46.0, y2: 70.0 },
    // Muro Inferior
    { x1: 10.0, y1: 70.0, x2: 46.0, y2: 70.0 }
  ],
  
  // Baños WC exteriores (esquinas superiores del salón)
  bathrooms: [
    { id: "wc-left", name: "WC", x: 8.0, y: 12.0, w: 2.0, h: 4.0, label: "WC" },
    { id: "wc-right", name: "WC", x: 46.0, y: 12.0, w: 2.0, h: 4.0, label: "WC" }
  ],

  // Escenario (Stage) en media luna y Pasarela en T
  stage: {
    x: 28.0, // Centro del salón (10 + 36/2)
    y: 12.0, // Al fondo
    radiusX: 8.0,
    radiusY: 4.0,
    heightZ: 0.8,
    
    // Pasarela conectada (catwalk en T)
    catwalk: {
      x: 28.0,      // Centrada
      y: 16.0,      // Arranca al final del escenario
      w: 2.0,       // Ancho pasarela (tallo de la T)
      h: 14.0,      // Largo pasarela total
      tBarW: 14.0,  // Ancho barra horizontal de la T
      tBarH: 4.0,   // Grosor barra horizontal de la T
      heightZ: 0.6
    }
  },

  // Entrada Principal y rampa en el cuadrante inferior derecho
  entrance: {
    x: 58.0,      // Centro del área total de entrada (de x=46 a x=70 -> (46+70)/2 = 58)
    y: 62.0,      // Centro vertical (de y=54 a y=70 -> (54+70)/2 = 62)
    w: 24.0,      // Ancho total del área (desde salón x=46 hasta límite negro x=70)
    h: 16.0,      // Alto total del área (desde y=54 hasta y=70)
    rampX: 46.0,  // Inicio de la rampa exactamente en la pared del salón (x=46)
    rampY: 54.0,  // Inicio de la rampa en Y (alineado con la puerta E2 de y=54 a y=58)
    rampWidth: 4.0, // Ancho de la rampa
    rampLength: 20.0, // Se extiende hasta conectar con el pasillo de la entrada (x=46 a x=66)
    rampHeightZ: 0.4
  },

  // Área de Fuente y Jardín derecho
  garden: {
    x: 46.0,
    y: 12.0,
    w: 24.0,
    h: 40.0,
    fountain: {
      x: 58.0,
      y: 30.0,
      radiusX: 5.0, // Radio X de la fuente (ovalada)
      radiusY: 10.0, // Radio Y de la fuente
      heightZ: 0.5
    }
  },

  // Puertas de acceso (e1 a e7) ahora dinámicas
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
  { id: "e1", type: "door", name: "E1", x: 46.0, y: 22.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 270, color: "#d4af37", editable: true, removable: true },
  { id: "e2", type: "door", name: "E2 (Rampa)", x: 46.0, y: 56.0, w: 4.0, h: 0.3, shape: "rectangle", rotation: 270, color: "#d4af37", editable: true, removable: true },
  { id: "e3", type: "door", name: "E3", x: 38.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#d4af37", editable: true, removable: true },
  { id: "e4", type: "door", name: "E4", x: 28.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#d4af37", editable: true, removable: true },
  { id: "e5", type: "door", name: "E5", x: 18.0, y: 70.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 180, color: "#d4af37", editable: true, removable: true },
  { id: "e6", type: "door", name: "E6", x: 10.0, y: 54.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 90, color: "#d4af37", editable: true, removable: true },
  { id: "e7", type: "door", name: "E7", x: 10.0, y: 22.0, w: 2.0, h: 0.3, shape: "rectangle", rotation: 90, color: "#d4af37", editable: true, removable: true }
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
    color: "#d4af37",
    icon: "door-open"
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
