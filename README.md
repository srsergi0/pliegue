# 📄 Pliegue

<div align="center">
  <img src="public/icon.png" width="96" height="96" alt="Pliegue Logo" />
  <h3>Software Profesional de Imposición de Páginas y Preprensa Digital</h3>
  <p>Genera pliegos de impresión, cuadernillos para encuadernación, revistas, folletos y tarjetas con precisión milimétrica 100% en local.</p>

  [![Release](https://img.shields.io/github/v/release/srsergi0/pliegue?style=flat-square&color=amber)](https://github.com/srsergi0/pliegue/releases)
  [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)](#descargas)
</div>

---

## ✨ Características Principales

- 📖 **Imposición para Cuadernillos (Booklet / Saddle Stitch)**:
  - Ordenación automática para grapado al centro o cosido.
  - Soporte para **Signaturas / Cuadernillos agrupados** (4, 8, 12, 16, 24, 32 páginas por pliego).
  - Cálculo automático de páginas en blanco para múltiplos exactos.
- 🖨️ **Montajes N-Up, Repetición y Grillas**:
  - Repetición de la misma página (*Step and Repeat*) para tarjetas de presentación, etiquetas o flyers.
  - Ordenación consecutiva por filas o columnas.
  - Modo **Corte y Apilado (*Cut & Stack*)** para guillotina rápida.
- 🔦 **Modo Trasluz / Flip Cara (Mesa de Luz)**:
  - Inspección translúcida en tiempo real para verificar el registro exacto entre la cara frontal (tiro) y el dorso (retiro).
  - Volteo rápido de pliego para comprobar alineación de medianiles y márgenes de corte.
- ✂️ **Marcas de Corte y Sangrado (*Bleed*)**:
  - Marcas de corte vectoriales en las esquinas y medianiles.
  - Longitud y grosor configurables.
  - Sangrado simétrico y medianiles personalizables.
- ⚡ **Plantillas de Taller de 1 Clic**:
  - Folleto A5 en pliego A4 (Díptico).
  - Revista A4 en pliego A3 (Tapa y páginas).
  - 4× A5 en pliego A3 (Tiro y Retiro doble).
  - Tarjetas de presentación (8 o 10 por pliego con sangrado).
  - Flyers A6 4-Up en pliego A4.
  - Libro en cuadernillos de 16 páginas.
- 🔒 **100% Privado y Local**:
  - Tus documentos PDF jamás se suben a servidores externos ni a la nube.
  - Procesamiento ultra-rápido en tu propio procesador.

---

## 📥 Descargas

Descarga el instalador o ejecutable portable para tu sistema operativo desde la sección de **[Releases](https://github.com/srsergi0/pliegue/releases)**:

| Sistema Operativo | Formato de Instalación | Portable |
| :--- | :--- | :--- |
| **Windows** | `.exe` (Instalador NSIS) | `.exe` (Portable sin instalación) |
| **macOS** | `.dmg` | `.zip` |
| **Linux** | `.deb` | `.AppImage` |

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | Abrir documento PDF |
| `Ctrl + S` / `Cmd + S` | Exportar pliegos PDF listos para imprimir |
| `F12` o `Ctrl + Shift + I` | Abrir consola de desarrollo (DevTools) |

---

## 🛠️ Desarrollo Local

Este proyecto utiliza **Bun** como entorno de ejecución y gestor de paquetes de alto rendimiento, junto a **Vite**, **React**, **Tailwind CSS** y **Electron**.

```bash
# 1. Clonar el repositorio
git clone https://github.com/srsergi0/pliegue.git
cd pliegue

# 2. Instalar dependencias
bun install

# 3. Iniciar en modo desarrollo (Vite + Electron con Hot Reload)
bun run dev

# 4. Compilar binarios de escritorio
bun run dist:win    # Windows (.exe)
bun run dist:mac    # macOS (.dmg)
bun run dist:linux  # Linux (.AppImage, .deb)
```

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
