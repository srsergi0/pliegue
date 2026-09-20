# 📄 Pliegue (Español)

<div align="center">
  <img src="public/icon.png" width="104" height="104" alt="Pliegue Logo" />
  <h2>Software Profesional de Imposición de Páginas y Preprensa Digital</h2>
  <p><strong>Genera pliegos de impresión, cuadernillos para encuadernación, revistas, folletos y tarjetas con precisión milimétrica 100% en local.</strong></p>

  <p>
    <a href="README.md">English</a> •
    <a href="README.es.md"><strong>Español</strong></a> •
    <a href="README.ja.md">日本語</a> •
    <a href="README.zh.md">简体中文</a>
  </p>

  <p>
    <a href="https://github.com/srsergi0/pliegue/releases/latest"><img src="https://img.shields.io/github/v/release/srsergi0/pliegue?style=for-the-badge&color=amber&logo=github" alt="Latest Release" /></a>
    <a href="https://github.com/srsergi0/pliegue/actions"><img src="https://img.shields.io/github/actions/workflow/status/srsergi0/pliegue/release.yml?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI Build Status" /></a>
    <a href="https://github.com/srsergi0/pliegue/releases"><img src="https://img.shields.io/github/downloads/srsergi0/pliegue/total?style=for-the-badge&color=blue&logo=windows" alt="Total Downloads" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT" /></a>
    <a href="https://github.com/srsergi0/pliegue/stargazers"><img src="https://img.shields.io/github/stars/srsergi0/pliegue?style=for-the-badge&color=yellow&logo=star" alt="GitHub Stars" /></a>
  </p>

  <p>
    <a href="#-descargas">Descargas</a> •
    <a href="#-características-principales">Características</a> •
    <a href="#%EF%B8%8F-atajos-de-teclado">Atajos</a> •
    <a href="#%EF%B8%8F-desarrollo-local">Desarrollo</a> •
    <a href="CONTRIBUTING.md">Contribuir</a>
  </p>
</div>

---

## 📥 Descargas (Instaladores y Portables)

Descarga la versión más reciente lista para usar desde **[GitHub Releases](https://github.com/srsergi0/pliegue/releases/latest)**:

| Plataforma | Instalador Oficial | Versión Portable / Binario |
| :--- | :--- | :--- |
| **Windows** (x64) | [Descargar Instalador `.exe`](https://github.com/srsergi0/pliegue/releases/latest) | [Descargar Portable `.exe`](https://github.com/srsergi0/pliegue/releases/latest) |
| **macOS** (Intel / Apple Silicon) | [Descargar `.dmg`](https://github.com/srsergi0/pliegue/releases/latest) | [Descargar `.zip`](https://github.com/srsergi0/pliegue/releases/latest) |
| **Linux** (Debian / Ubuntu / Arch) | [Descargar `.deb`](https://github.com/srsergi0/pliegue/releases/latest) | [Descargar `.AppImage`](https://github.com/srsergi0/pliegue/releases/latest) |

---

## ✨ Características Principales

- 📖 **Imposición para Cuadernillos (Booklet / Saddle Stitch)**:
  - Ordenación matemática automática para grapado al centro o cosido de lomo.
  - Soporte para **Signaturas / Cuadernillos agrupados** (4, 8, 12, 16, 24, 32 páginas por pliego) para encuadernación cosida.
  - Relleno automático de páginas en blanco para múltiplos exactos de pliego.
- 🖨️ **Montajes N-Up, Repetición y Grillas**:
  - Repetición de la misma página (*Step and Repeat*) para tarjetas de presentación, etiquetas adhesivas o flyers.
  - Ordenación consecutiva por filas o columnas.
  - Modo **Corte y Apilado (*Cut & Stack*)** para corte veloz directo a guillotina sin barajar.
- 🧭 **Flujo de Imposición Enfocado**:
  - Panel de control lineal en 5 pasos plegables: Producto, Pliego, Distribución, Impresión y Acabado.
  - Resumen del trabajo con chips que saltan a cada paso y barra de estado inferior con totales de producción e info del pliego actual.
  - Navegación de pliegos coloreada cara/reverso y panel ocultable con las páginas desactivadas.
- 🌐 **Interfaz Multilingüe**:
  - Interfaz completa en español, inglés, japonés y chino simplificado, con detección del idioma del sistema al primer arranque.
- ✂️ **Marcas de Corte y Sangrado (*Bleed*)**:
  - Marcas de corte vectoriales en esquinas y medianiles internos.
  - Longitud, grosor, sangrado simétrico y separación de medianiles totalmente personalizables.
- ⚡ **Plantillas de Taller de 1 Clic**:
  - Díptico A5 en pliego A4.
  - Revista A4 en pliego A3 (Tiro y Retiro).
  - 4× A5 en pliego A3 doble.
  - Tarjetas de presentación con sangrado de 3 mm.
  - Libro en cuadernillos de 16 páginas.
- 🔒 **100% Privado y Local**:
  - Tus documentos jamás se suben a servidores externos ni a la nube. Procesamiento ultrarrápido en tu propio procesador.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | Abrir documento PDF |
| `Ctrl + S` / `Cmd + S` | Exportar pliegos PDF listos para imprimir |
| `Ctrl + 0` | Restablecer nivel de zoom al 100% |
| `Ctrl + +` / `Ctrl + -` | Aumentar o disminuir zoom |
| `F12` / `Ctrl + Shift + I` | Abrir herramientas de desarrollador |

---

## 🛠️ Desarrollo Local

Este proyecto está construido con **Bun**, **React 19**, **TypeScript**, **Tailwind CSS** y **Electron**.

```bash
# 1. Clonar el repositorio
git clone https://github.com/srsergi0/pliegue.git
cd pliegue

# 2. Instalar dependencias con Bun
bun install

# 3. Iniciar en modo desarrollo (Vite + Electron con Hot Reload)
bun run dev

# 4. Compilar binarios de producción
bun run dist:win    # Windows (.exe Setup y Portable)
bun run dist:mac    # macOS (.dmg y .zip)
bun run dist:linux  # Linux (.AppImage y .deb)
```

---

## 🤝 Contribuciones y Comunidad

¡Las contribuciones son bienvenidas! Revisa la [Guía de Contribución](CONTRIBUTING.md) y nuestro [Código de Conducta](CODE_OF_CONDUCT.md) antes de enviar un Pull Request.

Para dudas, sugerencias o reportes de bugs, por favor abre un [GitHub Issue](https://github.com/srsergi0/pliegue/issues).

---

## 📄 Licencia

Distribuido bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
