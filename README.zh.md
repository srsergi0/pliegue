# 📄 Pliegue (简体中文)

<div align="center">
  <img src="public/icon.png" width="104" height="104" alt="Pliegue Logo" />
  <h2>专业级 PDF 智能拼版与数码印前处理软件</h2>
  <p><strong>以毫米级工业精度生成印刷大版、骑马订折页、多帖书刊、名片与折页 — 100% 本地离线高私密性处理。</strong></p>

  <p>
    <a href="README.md">English</a> •
    <a href="README.es.md">Español</a> •
    <a href="README.ja.md">日本語</a> •
    <a href="README.zh.md"><strong>简体中文</strong></a>
  </p>

  <p>
    <a href="https://github.com/srsergi0/pliegue/releases/latest"><img src="https://img.shields.io/github/v/release/srsergi0/pliegue?style=for-the-badge&color=amber&logo=github" alt="Latest Release" /></a>
    <a href="https://github.com/srsergi0/pliegue/actions"><img src="https://img.shields.io/github/actions/workflow/status/srsergi0/pliegue/release.yml?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI Build Status" /></a>
    <a href="https://github.com/srsergi0/pliegue/releases"><img src="https://img.shields.io/github/downloads/srsergi0/pliegue/total?style=for-the-badge&color=blue&logo=windows" alt="Total Downloads" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License: MIT" /></a>
    <a href="https://github.com/srsergi0/pliegue/stargazers"><img src="https://img.shields.io/github/stars/srsergi0/pliegue?style=for-the-badge&color=yellow&logo=star" alt="GitHub Stars" /></a>
  </p>

  <p>
    <a href="#-软件下载">下载</a> •
    <a href="#-核心功能">功能特性</a> •
    <a href="#%EF%B8%8F-键盘快捷键">快捷键</a> •
    <a href="#%EF%B8%8F-本地开发">开发指南</a> •
    <a href="CONTRIBUTING.md">参与贡献</a>
  </p>
</div>

---

## 📥 软件下载（官方安装包与便携版）

请前往 **[GitHub Releases](https://github.com/srsergi0/pliegue/releases/latest)** 下载适用于您操作系统的最新版：

| 操作系统 | 官方安装包 | 便携免安装版 / 独立运行包 |
| :--- | :--- | :--- |
| **Windows** (x64) | [下载安装程序 `.exe`](https://github.com/srsergi0/pliegue/releases/latest) | [下载绿色便携版 `.exe`](https://github.com/srsergi0/pliegue/releases/latest) |
| **macOS** (Apple Silicon / Intel) | [下载 `.dmg` 镜像](https://github.com/srsergi0/pliegue/releases/latest) | [下载 `.zip` 压缩包](https://github.com/srsergi0/pliegue/releases/latest) |
| **Linux** (Debian / Ubuntu / Arch) | [下载 `.deb` 包](https://github.com/srsergi0/pliegue/releases/latest) | [下载 `.AppImage` 运行包](https://github.com/srsergi0/pliegue/releases/latest) |

---

## ✨ 核心功能

- 📖 **骑马订小册子拼版 (Booklet / Saddle Stitch)**:
  - 自动数学配页算法，适用于折页中缝骑马订或锁线装订。
  - 支持 **多帖分组 (Signatures)**，适用于大页码书刊（每印张4、8、12、16、24、32页）。
  - 智能补齐空白页，确保印张倍数严谨精确。
- 🖨️ **连晒、网格阵列与多模拼版 (N-Up & Step and Repeat)**:
  - 单页连晒复制（适用于名片、不干胶贴纸或宣传单页）。
  - 支持按行或按列顺序连续排列。
  - **裁切与堆叠 (Cut & Stack)** 模式，切纸机分切后直接依序成叠，无需人工繁琐配页。
- 🔦 **透光台 / 透视对版模式 (正反对位检查)**:
  - 半透明叠加印张正面与背面，实时检验套印精度与正反面对位情况。
  - 一键快速正反面翻转，检查订口、切口、边距及角线。
- ✂️ **矢量裁切角线与出血位 (Bleed) 精确控制**:
  - 外角及内缝高精度矢量裁切标记线。
  - 可自由调节角线长度、线宽、对称出血位以及间距。
- ⚡ **车间一键工艺预设**:
  - A4 纸拼 A5 对折单页（二折页）。
  - A3 纸拼 A4 杂志双面。
  - 3mm 出血标准名片阵列拼版（8模 / 10模）。
  - 16 页书帖折手工业级拼版。
- 🔒 **100% 本地运行与隐私保护**:
  - 纯本地高速解析渲染，您的 PDF 文档绝不上载任何云端服务器。

---

## ⌨️ 键盘快捷键

| 快捷键 | 功能说明 |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | 打开 PDF 文档 |
| `Ctrl + S` / `Cmd + S` | 导出并保存拼版后的大版 PDF |
| `Ctrl + 0` | 视图重置为 100% 原始比例 |
| `Ctrl + +` / `Ctrl + -` | 视图放大 / 缩小 |
| `F12` / `Ctrl + Shift + I` | 打开开发者调试工具 (DevTools) |

---

## 🛠️ 本地开发

本项目基于 **Bun**、**React 19**、**TypeScript**、**Tailwind CSS** 与 **Electron** 构建。

```bash
# 1. 克隆代码仓库
git clone https://github.com/srsergi0/pliegue.git
cd pliegue

# 2. 使用 Bun 安装依赖
bun install

# 3. 启动开发服务器（Vite + Electron 热重载）
bun run dev

# 4. 打包桌面端发行二进制文件
bun run dist:win    # Windows (.exe 安装包与便携版)
bun run dist:mac    # macOS (.dmg 与 .zip)
bun run dist:linux  # Linux (.AppImage 与 .deb)
```

---

## 🤝 社区与贡献

欢迎提交代码与工艺预设！在提交 Pull Request 前，请阅读 [贡献指南](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md)。

如遇到任何问题或功能建议，请随时在 [GitHub Issues](https://github.com/srsergi0/pliegue/issues) 提交反馈。

---

## 📄 开源许可证

遵循 **MIT 许可证** 开源。详情见 [LICENSE](LICENSE)。
