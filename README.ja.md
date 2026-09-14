# 📄 Pliegue (日本語)

<div align="center">
  <img src="public/icon.png" width="104" height="104" alt="Pliegue Logo" />
  <h2>プロフェッショナルPDF面付け＆デジタルプリプレスソフトウェア</h2>
  <p><strong>印刷用紙への面付け、中綴じ小冊子、多丁製本、名刺やチラシの連付けをミリ単位の精度で実現。完全ローカル・オフライン動作。</strong></p>

  <p>
    <a href="README.md">English</a> •
    <a href="README.es.md">Español</a> •
    <a href="README.ja.md"><strong>日本語</strong></a> •
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
    <a href="#-ダウンロード">ダウンロード</a> •
    <a href="#-主な機能">主な機能</a> •
    <a href="#%EF%B8%8F-ショートカットキー">ショートカット</a> •
    <a href="#%EF%B8%8F-ローカル開発環境">開発環境</a> •
    <a href="CONTRIBUTING.md">コントリビューション</a>
  </p>
</div>

---

## 📥 ダウンロード（インストーラー＆ポータブル版）

最新版の実行バイナリは **[GitHub Releases](https://github.com/srsergi0/pliegue/releases/latest)** よりダウンロード可能です：

| プラットフォーム | 公式インストーラー | ポータブル版 / 単体バイナリ |
| :--- | :--- | :--- |
| **Windows** (x64) | [インストーラー `.exe` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) | [ポータブル版 `.exe` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) |
| **macOS** (Apple Silicon / Intel) | [`.dmg` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) | [`.zip` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) |
| **Linux** (Debian / Ubuntu / Arch) | [`.deb` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) | [`.AppImage` をダウンロード](https://github.com/srsergi0/pliegue/releases/latest) |

---

## ✨ 主な機能

- 📖 **中綴じ冊子の面付け (Booklet / Saddle Stitch)**:
  - 折り丁の順序に沿ってページを自動対向配置（センター綴じ・ステープル）。
  - 糸綴じ本向け **折丁分割（シグネチャ）** 対応（用紙あたり4、8、12、16、24、32ページ）。
  - ページ数の倍数に合わせた白紙ページの自動挿入機能。
- 🖨️ **連付け・ステップ＆リピート (N-Up / Grids)**:
  - 同一デザインの連続配置（名刺、ラベルシール、チラシ等）。
  - 行・列方向への連番配置。
  - **カット＆スタック (Cut & Stack)** モードにより、断裁機でカットした後に並べ替えることなく製本可能。
- 🔦 **ライトテーブル / 透視対向モード (表裏見当確認)**:
  - 表面と裏面を半透明でリアルタイム重ね合わせ、見当ズレを検査。
  - ワンクリックで表裏を瞬時に切り替えてアキ・ノド・トンボを確認。
- ✂️ **ベクタートンボ＆裁ち落とし（ドブ）管理**:
  - 外周四隅およびページ境界への高精度ベクタートンボ配置。
  - トンボの長さ、線幅、塗り足し幅（Bleed）、アキを自由に調整可能。
- ⚡ **ワンクリック工房プリセット**:
  - A4用紙にA5 2つ折り（二つ折りパンフレット）。
  - A3用紙にA4中綴じ誌（表裏両面）。
  - 3mmドブ付き名刺の多面付け（8面 / 10面）。
  - 16ページ折り丁書籍製本。
- 🔒 **100% オフライン＆プライバシー保護**:
  - PDFファイルが外部サーバーやクラウドに送信されることは一切ありません。

---

## ⌨️ ショートカットキー

| ショートカット | 動作 |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | PDFドキュメントを開く |
| `Ctrl + S` / `Cmd + S` | 面付け済みPDFをエクスポート・保存 |
| `Ctrl + 0` | ズーム倍率を100%にリセット |
| `Ctrl + +` / `Ctrl + -` | 拡大 / 縮小 |
| `F12` / `Ctrl + Shift + I` | 開発者ツールを開く |

---

## 🛠️ ローカル開発環境

本プロジェクトは **Bun**、**React 19**、**TypeScript**、**Tailwind CSS**、**Electron** を採用しています。

```bash
# 1. リポジトリのクローン
git clone https://github.com/srsergi0/pliegue.git
cd pliegue

# 2. Bunによる依存関係インストール
bun install

# 3. 開発サーバーの起動（Vite + Electron ホットリロード）
bun run dev

# 4. 配布バイナリのビルド
bun run dist:win    # Windows (.exe Setup & Portable)
bun run dist:mac    # macOS (.dmg & .zip)
bun run dist:linux  # Linux (.AppImage & .deb)
```

---

## 🤝 コントリビューション

開発へのご協力をお待ちしております！プルリクエストを送信する前に、[貢献ガイド](CONTRIBUTING.md) および [行動規範](CODE_OF_CONDUCT.md) をご確認ください。

不具合の報告や新機能のご提案は [GitHub Issues](https://github.com/srsergi0/pliegue/issues) までお気軽にお寄せください。

---

## 📄 ライセンス

本ソフトウェアは **MIT ライセンス** のもとで公開されています。詳細は [LICENSE](LICENSE) をご参照ください。
