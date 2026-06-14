# SuperCV Export

一键导出超级简历 (WonderCV) 为**无水印矢量 PDF**。

> Chrome 扩展 · 点击即用 · 极简交互

## ✨ 功能

- **一次点击** — 打开插件面板，点按钮，完成导出
- **无水印** — 自动清除图案水印与文字水印
- **矢量 PDF** — 文字图形无限缩放不失真
- **模板保留** — 颜色、字体、模块排版完整呈现
- **左右居中** — A4 纸面居中排版，视觉舒适
- **快捷键** — `Ctrl` + `Shift` + `P` 一键导出
- **反调试** — 自动解除页面 F12 拦截

## 📦 安装

1. `git clone` 本仓库
2. 打开 `chrome://extensions/`，开启**开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `supercv-export/` 文件夹

## 🔧 使用

| 方式 | 操作 |
|------|------|
| **插件面板** | 在编辑器页面点击扩展图标 → 点导出按钮 |
| **快捷键** | `Ctrl` + `Shift` + `P` |

打印设置：**边距 = 无 | 纸张 = A4 | ☑ 背景图形**

## 🛠️ 原理

```
页面 DOM
  → cloneNode 简历区域
  → 删除 <img> / 清理背景图
  → margin: 0 auto 居中
  → @media print CSS 全局去水印
  → window.print() → 另存 PDF
```

## 📁 结构

```
supercv-export/
├── manifest.json
├── inject.js        Content Script
├── core.js          核心：反调试 + 去水印 + 导出
├── popup.html       弹窗 UI
├── popup.js         弹窗逻辑
├── icons/
└── README.md
```

## ⚠️ 声明

仅供学习研究用途。

## 📄 License

MIT
