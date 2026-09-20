# 📄 Pliegue

<div align="center">
  <img src="public/icon.png" width="104" height="104" alt="Pliegue Logo" />
  <h2>Professional PDF Imposition & Digital Prepress Software</h2>
  <p><strong>Generate print sheets, saddle-stitch booklets, multi-signature books, flyers, and business cards with millimeter precision — 100% local and offline.</strong></p>

  <p>
    <a href="README.md"><strong>English</strong></a> •
    <a href="README.es.md">Español</a> •
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
    <a href="#-downloads">Downloads</a> •
    <a href="#-key-features">Features</a> •
    <a href="#%EF%B8%8F-keyboard-shortcuts">Shortcuts</a> •
    <a href="#%EF%B8%8F-local-development">Development</a> •
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

---

## 📥 Downloads (Installers & Portables)

Download the latest production release ready to run from **[GitHub Releases](https://github.com/srsergi0/pliegue/releases/latest)**:

| Platform | Official Installer | Portable / Standalone Binary |
| :--- | :--- | :--- |
| **Windows** (x64) | [Download Setup `.exe`](https://github.com/srsergi0/pliegue/releases/latest) | [Download Portable `.exe`](https://github.com/srsergi0/pliegue/releases/latest) |
| **macOS** (Apple Silicon / Intel) | [Download `.dmg`](https://github.com/srsergi0/pliegue/releases/latest) | [Download `.zip`](https://github.com/srsergi0/pliegue/releases/latest) |
| **Linux** (Debian / Ubuntu / Arch) | [Download `.deb`](https://github.com/srsergi0/pliegue/releases/latest) | [Download `.AppImage`](https://github.com/srsergi0/pliegue/releases/latest) |

---

## ✨ Key Features

- 📖 **Saddle-Stitch Booklet Imposition**:
  - Automatic page pairing algorithm for center folding, stapling, or sewing.
  - Support for **Multi-Signature grouping** (4, 8, 12, 16, 24, 32 pages per signature) for case-bound books.
  - Intelligent blank page padding to maintain exact sheet multiples.
- 🖨️ **N-Up, Step & Repeat, and Grid Layouts**:
  - Single-page repeat (*Step & Repeat*) for business cards, adhesive labels, or flyers.
  - Consecutive page sequencing by rows or columns.
  - **Cut & Stack** mode for rapid guillotine trimming with zero manual collating.
- 🧭 **Focused Imposition Workflow**:
  - Linear control panel in 5 collapsible steps: Product, Sheet, Distribution, Printing, Finishing.
  - Job summary chips that jump to any step, plus a bottom status bar with production totals and the current sheet info.
  - Front/back colour-coded sheet navigation and a hideable panel listing the disabled pages.
- 🌐 **Multilingual Interface**:
  - Full UI in Spanish, English, Japanese and Simplified Chinese, following the system language on first launch.
- ✂️ **Vector Printer Marks & Bleed Control**:
  - Crisp vector crop marks at outer corners and inter-page gutters.
  - Configurable mark length, stroke width, symmetric bleed, and page spacing.
- ⚡ **1-Click Workshop Presets**:
  - A5 brochure on A4 sheet (Half-fold / Bi-fold).
  - A4 magazine on A3 sheet (Front & Back).
  - 4× A5 on double A3 sheet.
  - Business cards with 3 mm bleed (8 or 10-up).
  - 16-page book signatures.
- 🔒 **100% Private & Offline**:
  - Zero cloud reliance: PDF documents never leave your computer. High-speed local processing.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | Open PDF document |
| `Ctrl + S` / `Cmd + S` | Export & save imposed PDF |
| `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + +` / `Ctrl + -` | Zoom in / Zoom out |
| `F12` / `Ctrl + Shift + I` | Open Developer Tools |

---

## 🛠️ Local Development

Pliegue is built with **Bun**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Electron**.

```bash
# 1. Clone the repository
git clone https://github.com/srsergi0/pliegue.git
cd pliegue

# 2. Install dependencies with Bun
bun install

# 3. Start development server with Hot Reload (Vite + Electron)
bun run dev

# 4. Package desktop applications
bun run dist:win    # Windows (.exe Setup & Portable)
bun run dist:mac    # macOS (.dmg & .zip)
bun run dist:linux  # Linux (.AppImage & .deb)
```

---

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a Pull Request.

For bugs, feature ideas, or workshop presets, open an issue on [GitHub Issues](https://github.com/srsergi0/pliegue/issues).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
