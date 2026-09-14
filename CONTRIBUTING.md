# Guía de Contribución / Contributing Guide

¡Gracias por tu interés en contribuir a **Pliegue**! Este proyecto tiene como objetivo democratizar y acelerar las herramientas de preprensa e imposición digital para diseñadores, talleres de impresión e imprentas comerciales.

---

## 🚀 Flujo de Desarrollo Local

### Requisitos previos
- [Bun](https://bun.sh/) (v1.2+) instalado.
- Node.js (v20+) recomendado.
- Git.

### Pasos para iniciar
```bash
# 1. Haz un Fork y clona tu repositorio
git clone https://github.com/TU-USUARIO/pliegue.git
cd pliegue

# 2. Instala dependencias
bun install

# 3. Inicia el entorno de desarrollo con Hot Reload (Vite + Electron)
bun run dev
```

---

## 🛠️ Scripts Útiles

- `bun run build` — Compila tanto el frontend (Vite) como el proceso principal/preload de Electron con esbuild.
- `bun run dist:win` — Genera el instalador NSIS y versión portable para Windows en la carpeta `release/`.
- `bun run dist:mac` — Genera los paquetes `.dmg` y `.zip` para macOS.
- `bun run dist:linux` — Genera los paquetes `.AppImage` y `.deb` para Linux.
- `bun run lint` — Valida tipos de TypeScript sin emitir código.

---

## 🌿 Convención de Ramas y Commits

Seguimos la convención de [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: nueva funcionalidad o plantilla de imposición`
- `fix: corrección de errores de renderizado o cálculo`
- `docs: mejoras a la documentación o README`
- `ci: cambios en flujos de GitHub Actions`
- `chore: actualización de dependencias o versiones`

---

## 🤝 Reporte de Problemas y Sugerencias

- Si encuentras un fallo o comportamiento inesperado, abre un issue utilizando la plantilla [Bug Report](https://github.com/srsergi0/pliegue/issues/new?template=bug_report.yml).
- Si necesitas una nueva plantilla de taller o una función específica, utiliza la plantilla [Feature Request](https://github.com/srsergi0/pliegue/issues/new?template=feature_request.yml).
