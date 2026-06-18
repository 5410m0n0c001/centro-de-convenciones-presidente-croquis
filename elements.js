/**
 * elements.js
 * Definición del terreno (60m x 80m), las estructuras fijas del Centro de Convenciones Presidente
 * (muros, baños, puertas, escenario con pasarela, rampa y fuente) y plantillas del catálogo.
 * Escala: 1m = 20px en el canvas SVG (1200 x 1600 px).
 */

export const CANVAS_WIDTH = 60.0;  // 60 metros de ancho
export const CANVAS_HEIGHT = 80.0; // 80 metros de largo (eje Y en 2D, eje Z en 3D)

// Dimensiones y posición del Salón Techado principal
export const SALON = {
  x: 10.0,      // Comienza en 10m
  y: 18.0,      // Comienza en 18m
  width: 40.0,  // 40m de ancho
  height: 44.0  // 44m de largo (hasta los 62m)
};

// Estructuras fijas iniciales (muros, WC, escenario, rampa, fuente, etc.)
export const STATIC_STRUCTURES = {
  // Salón Techado (Muros)
  walls: [
    // Muro Superior
    { x1: 10.0, y1: 18.0, x2: 50.0, y2: 18.0 },
    // Muro Izquierdo
    { x1: 10.0, y1: 18.0, x2: 10.0, y2: 62.0 },
    // Muro Derecho
    { x1: 50.0, y1: 18.0, x2: 50.0, y2: 62.0 },
    // Muro Inferior (dividido para dejar espacio a la entrada principal)
    { x1: 10.0, y1: 62.0, x2: 26.0, y2: 62.0 },
    { x1: 34.0, y1: 62.0, x2: 50.0, y2: 62.0 }
  ],
  
  // Baños (dos marcados como WC en el croquis)
  bathrooms: [
    { id: "wc-left", name: "WC Damas", x: 10.2, y: 18.2, w: 6.0, h: 5.0, label: "WC" },
    { id: "wc-right", name: "WC Caballeros", x: 43.8, y: 18.2, w: 6.0, h: 5.0, label: "WC" }
  ],

  // Escenario (Stage) en media luna y Pasarela en T
  stage: {
    // Escenario principal (media luna en la parte superior central)
    x: 30.0, // Centro
    y: 24.0, // Posición vertical
    radiusX: 8.0,
    radiusY: 4.0,
    heightZ: 0.8, // Altura 3D
    
    // Pasarela conectada (catwalk en T que se desprende del escenario)
    catwalk: {
      x: 30.0,      // Centrada
      y: 28.0,      // Empieza al final del escenario
      w: 2.0,       // Ancho de la pasarela
      h: 8.0,       // Largo de la pasarela
      tBarW: 6.0,   // Ancho del travesaño de la T
      tBarH: 1.8,   // Grosor del travesaño de la T
      heightZ: 0.6  // Ligeramente más baja que el escenario
    }
  },

  // Rampa de Acceso y Entrada Principal (en la abertura del muro inferior)
  entrance: {
    x: 30.0,
    y: 62.0,
    w: 8.0,
    h: 6.0, // Se extiende hacia afuera (jardín)
    rampLength: 6.0,
    rampWidth: 4.0,
    rampHeightZ: 0.4 // Sube desde 0.0 hasta 0.4m (nivel del salón)
  },

  // Área de Jardín y Fuente
  garden: {
    x: 10.0,
    y: 62.0,
    w: 40.0,
    h: 16.0, // Espacio verde en la parte inferior del terreno
    fountain: {
      x: 43.0,
      y: 70.0,
      radius: 3.5,
      heightZ: 0.5
    }
  },

  // Puertas de acceso (e1 a e7)
  doors: [
    { id: "e1", name: "Acceso E1", x: 10.0, y: 28.0, w: 2.0, angle: 90, side: "left" },
    { id: "e2", name: "Acceso E2", x: 10.0, y: 44.0, w: 2.0, angle: 90, side: "left" },
    { id: "e3", name: "Acceso E3", x: 10.0, y: 56.0, w: 2.0, angle: 90, side: "left" },
    { id: "e4", name: "Acceso E4", x: 50.0, y: 28.0, w: 2.0, angle: 270, side: "right" },
    { id: "e5", name: "Acceso E5", x: 50.0, y: 44.0, w: 2.0, angle: 270, side: "right" },
    { id: "e6", name: "Acceso E6", x: 50.0, y: 56.0, w: 2.0, angle: 270, side: "right" },
    { id: "e7", name: "Acceso E7 (Principal)", x: 30.0, y: 62.0, w: 8.0, angle: 0, side: "bottom" }
  ]
};

// Elementos iniciales por defecto en el plano (pueden ser modificados por el usuario)
export const INITIAL_ELEMENTS = [
  // Stand de muestra para iniciar
  {
    id: "stand-init-1",
    type: "stand",
    name: "Stand 01",
    exhibitor: "Expositor Premium",
    x: 14.0,
    y: 36.0,
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    rotation: 0,
    color: "#0f5132",
    editable: true,
    removable: true
  },
  {
    id: "stand-init-2",
    type: "stand",
    name: "Stand 02",
    exhibitor: "Expositor Moda",
    x: 46.0,
    y: 36.0,
    w: 4.0,
    h: 3.0,
    shape: "rectangle",
    rotation: 0,
    color: "#7c1a22",
    editable: true,
    removable: true
  },

  // Pista de baile central frente a la pasarela
  {
    id: "dancefloor-main",
    type: "dancefloor",
    name: "Pista de Baile",
    x: 30.0,
    y: 44.0,
    w: 8.0,
    h: 6.0,
    shape: "rectangle",
    rotation: 0,
    color: "#820ad1",
    editable: true,
    removable: true
  },

  // Área de DJ
  {
    id: "dj-main",
    type: "dj",
    name: "Cabina DJ / Audio",
    x: 30.0,
    y: 52.0,
    w: 4.0,
    h: 1.5,
    shape: "rectangle",
    rotation: 0,
    color: "#0d0c1d",
    editable: true,
    removable: true
  },

  // Mesas iniciales
  { id: "table-1", type: "table", name: "Mesa 1", x: 20.0, y: 44.0, w: 1.6, h: 1.6, shape: "circle", rotation: 0, chairs: 10, color: "#b45309", editable: true, removable: true },
  { id: "table-2", type: "table", name: "Mesa 2", x: 40.0, y: 44.0, w: 1.6, h: 1.6, shape: "circle", rotation: 0, chairs: 10, color: "#b45309", editable: true, removable: true }
];

// Catálogo de plantillas para la caja de herramientas (Toolbox)
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
