# 🗺️ Centro de Convenciones Presidente - Planificador 2D/3D

Este proyecto es una aplicación web interactiva premium diseñada para la maquetación comercial y planeación espacial del **Centro de Convenciones Presidente (CCP)** en Cuernavaca. Combina un editor vectorial 2D en planta (SVG) con un visor tridimensional inmersivo en tiempo real utilizando **Three.js**.

La aplicación permite posicionar de manera precisa **stands de expositores** y **mobiliario de gala** sobre un croquis base a mano alzada, facilitando la logística de distribución en eventos corporativos, ferias y exposiciones.

---

## 🎨 Características Clave

1. **Superposición de Croquis Base:**
   - Carga la imagen `croquis base.jpeg` en el fondo del lienzo 2D con un control deslizante de opacidad, permitiendo calzar y alinear perfectamente los stands sobre el boceto original.
2. **Editor 2D Interactivo (SVG):**
   - **Arrastrar y soltar (Drag-and-Drop):** Mueve libremente stands, mesas y demás mobiliario.
   - **Ajuste a Rejilla (Snapping):** Rejilla magnética cada 10 cm para alineación profesional.
   - **Clonado y Borrado:** Duplica o elimina elementos seleccionados en un clic.
   - **Zoom y Panning:** Desplazamiento fluido y acercamiento interactivo con la rueda del ratón o gestos táctiles.
3. **Visor Inmersivo 3D (Three.js):**
   - Rota (360°), desplaza y acerca la cámara con iluminación cálida de atardecer y proyección de sombras.
   - **Stands Procedurales:** Renderiza cubículos en 3D con letreros flotantes que muestran dinámicamente la marca o nombre del expositor en texto tridimensional.
   - **Letras Gigantes y Luminosas:** Genera letreros volumétricos iluminados con bombillas incandescentes.
   - **Mobiliario Detallado:** Mesas con mantelería fina y sillas Tiffany colocadas con precisión matemática.
4. **Inspector de Propiedades Dinámico:**
   - Modifica posición, tamaño, rotación, color, marcas de expositores y cantidad de sillas.
   - **Cálculo de Distancia de Logística:** Muestra automáticamente la distancia real (en metros) del elemento seleccionado al escenario, los baños (WC) y la rampa de acceso principal.
5. **Cuatro Temas / Modos de Visualización:**
   - **Render 2D / 3D:** Colores y materiales realistas.
   - **CAD Oscuro y CAD Claro:** Trazos lineales de alta visibilidad que simulan la interfaz técnica de AutoCAD.
   - **Técnico B&W:** Formato monocromo de alto contraste optimizado para impresión.
6. **Importación / Exportación (.json):**
   - Guarda el diseño actual como archivo local `.json` para recuperarlo o compartirlo más adelante, con respaldo automático en `LocalStorage`.

---

## 🚀 Cómo Iniciar la Aplicación

Los navegadores modernos bloquean la carga de scripts JS locales (`file://`) por seguridad. Por ende, **es necesario servir la aplicación a través de un servidor web local**.

### Opción A: Usando Python (Recomendado)
Abre tu terminal en la carpeta del proyecto y ejecuta:
```bash
python -m http.server 8000
```
Luego ve a: 👉 [http://localhost:8000](http://localhost:8000)

### Opción B: Usando Node.js (npx)
Si tienes Node.js instalado, ejecuta:
```bash
npx http-server -p 8000
```
Luego ingresa a: 👉 [http://localhost:8000](http://localhost:8000)

---

## 📂 Estructura del Código

*   `index.html` - Estructura semántica, paneles glassmorphism, barra de herramientas y carga de dependencias CDN.
*   `styles.css` - Estilos visuales de gala, responsividad para móviles y adaptabilidad de temas (Render, CAD, B/N).
*   `elements.js` - Definición geométrica base del terreno (60m x 80m), muros estructurales, accesos e1-e7, escenario, rampa y fuente.
*   `editor2d.js` - Lógica de dibujo SVG 2D, snapping, arrastre, zoom, y opacidad del croquis de fondo.
*   `visualizer3d.js` - Renderizador WebGL 3D (Three.js), sombreado y modelado procedural de stands y letreros.
*   `app.js` - Controlador del estado global, persistencia, importación/exportación y cálculos métricos.
