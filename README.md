# SuperCV Export

一键导出超级简历 (WonderCV) 为**无水印矢量 PDF**，保留 100% 模板样式与排版。

> Chrome 浏览器扩展 · 开箱即用 · 零配置

## ✨ 功能

- **无水印导出** — 自动移除页面中的图案水印与文字水印
- **矢量 PDF** — 浏览器打印引擎输出，文字与图形无限缩放不失真
- **模板完整保留** — 颜色、字体、背景图案、模块排版原样呈现
- **零边距** — A4 纸面满铺，简历在页面上左右对称居中
- **一键操作** — popup 面板点击或 `Ctrl` + `Shift` + `P`
- **按需注入** — 默认关闭，开启后才对页面生效，零干扰
- **反调试兼容** — 自动解除页面的 F12 拦截与 debugger 循环

## 📦 安装

1. 下载本仓库或 `git clone`
2. 打开 Chrome，访问 `chrome://extensions/`
3. 右上角开启 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `supercv-export/` 文件夹
6. 图标出现在工具栏，即安装完成

## 🔧 使用

| 方式 | 操作 |
|------|------|
| **Popup 面板** | 点击工具栏图标 → 打开开关 → 点击导出按钮 |
| **快捷键** | 在编辑页面按 `Ctrl` + `Shift` + `P` |
| **未开启时导出** | 直接点 popup 按钮 → 自动注入并导出（一步完成） |

打印设置建议：

- 边距：**无**
- 纸张：**A4**
- ☑ **背景图形**

## 🛠️ 原理

```
编辑器页面 DOM
     │
     ├─ cloneNode(true)  →  克隆简历内容区域
     ├─ 删除 <img> + background-image → 去除水印
     ├─ margin:0 auto   →  居中定位
     ├─ 注入 @media print CSS  →  隐藏UI + 全局去水印核弹
     └─ window.print()  →  浏览器打印 → 另存为 PDF
```

### 去水印策略

| 层 | 方法 |
|---|------|
| **JS 层 (clone 后)** | 移除所有 `<img>`、`<svg>`、`<canvas>`、低透明度浮层、编辑 UI 元素 |
| **CSS 层 (@media print)** | 全局 `img,svg,canvas{display:none}` + `*{background-image:none}` + 伪元素全杀 |

## 📁 项目结构

```
supercv-export/
├── manifest.json      # Chrome 扩展清单 (MV3)
├── inject.js          # Content Script — 按需注入核心脚本
├── core.js            # 核心逻辑 — 反调试 / 容器查找 / 去水印 / 导出
├── popup.html         # 扩展弹窗 UI
├── popup.js           # 弹窗逻辑 — 开关状态管理
├── icons/             # 图标 (16 / 48 / 128)
└── README.md
```

## ⚠️ 声明

本工具仅供学习与研究用途。请尊重平台版权，合理使用。

## 📄 License

MIT
