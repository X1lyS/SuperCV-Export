# SuperCV Export — 技术原理与绕过分析报告

> 超级简历 (WonderCV) 收费逻辑与水印保护机制的逆向分析与绕过方案

## 一、目标平台

| 项目 | 值 |
|------|-----|
| 网站 | https://www.wondercv.com |
| 前端框架 | Vue 2 + Vuex + Vite |
| 后端API | https://api.wondercv.com/cv (Kong 网关) |
| 认证方式 | JWT (存储于 Cookie `_t` 和 `_t_at`) |

## 二、收费逻辑分析

### 2.1 会员体系

超级简历有三种导出PDF的收费校验：

| 错误码 | 含义 | 触发条件 |
|--------|------|----------|
| `80160` | 非会员拦截 | `is_membership = false` |
| `80161` | 终身会员样式拦截 | 简历使用了 `life_member` 专属模板样式 |
| `use_vip: true` | 前端弹窗拦截 | `check_use_vip` API 返回需要会员 |

### 2.2 校验调用链

```
用户点击「下载PDF」
  │
  ├─ [前端校验] checkUserVip()
  │   API: GET /v3/cvs/{token}/check_use_vip
  │   返回: {use_vip: true/false}
  │   逻辑: use_vip && !isMember → 弹VIP购买窗
  │
  └─ [后端校验] downloadCv()
      API: GET /v4/cvs/{token}/download_url?watermark=no
      返回:
        1000 + data.url   → 成功, 返回 OSS 签名下载 URL
        80160             → 非会员拦截
        80161             → 终身会员样式拦截 (数据库存储, 无法前端绕过)
```

### 2.3 绕过原理

**核心思路: 不调用后端 download_url API, 直接从浏览器已渲染的 DOM 中提取简历内容, 通过浏览器原生打印功能输出为 PDF。**

```
正常流程:   点击按钮 → API校验 → 后端生成PDF → 返回URL → 下载
绕过流程:   DOM克隆 → 去水印 → CSS注入 → window.print() → 另存PDF
```

**为什么这是可行的:**

1. 简历编辑器页面 (`/cvs/{token}/editor`) 已经在客户端完整渲染了简历
2. DOM 中包含所有内容、颜色、字体、排版、分页信息
3. 浏览器 `window.print()` → 「另存为 PDF」生成的 PDF 是矢量格式, 质量等同于后端导出
4. 整个过程不经过任何后端 API, 收费校验完全被绕过

### 2.4 反调试保护绕过

页面注入了三层反调试保护以防止开发者工具的使用:

| 保护层 | 代码 | 绕过方法 |
|--------|------|----------|
| 禁止右键 | `contextmenu → preventDefault()` | `document.addEventListener('contextmenu', e => e.stopImmediatePropagation(), true)` |
| 禁止 F12 / Ctrl+Shift+C | `keydown → 检测 keyCode=123` | 在捕获阶段 `stopImmediatePropagation()` 放行按键 |
| 无限 debugger 循环 | `setInterval(() => { debugger; }, 500)` | ① 清除所有 interval ID ② 劫持 `setInterval` 拦截 debugger 回调 |

```javascript
// 反调试核心代码
for (var i = 99999; i >= 1; i--) { clearInterval(i); clearTimeout(i); }

// 劫持 setInterval, 拦截 debugger 回调
window.setInterval = new Proxy(window.setInterval, {
  apply: function(t, _, a) {
    return String(a[0]).indexOf('debugger') >= 0 ? 0 : Reflect.apply(t, _, a);
  }
});

// 劫持 addEventListener, 阻止页面注册 F12 拦截
EventTarget.prototype.addEventListener = function(e, f, o) {
  if ((e === 'contextmenu' && this === window) ||
      (e === 'keydown' && this === window && String(f).indexOf('123') >= 0))
    return;
  return original.call(this, e, f, o);
};
```

## 三、水印机制分析

### 3.1 水印类型

经过深度诊断（全局 TreeWalker 扫描、CSS 伪元素扫描、低透明度元素扫描、Shadow DOM 扫描），确定超级简历的水印由两部分组成：

| 水印类型 | 渲染方式 | 位置 |
|----------|----------|------|
| **图案水印** | `<img>` 标签, 图片来自 `logo.wondercv.com/banners/` | 简历页面内 (如圆形/波纹装饰) |
| **背景图水印** | CSS `background-image` 指向 banner 图片 | 简历背景层 |

### 3.2 水印诊断过程

经过 10+ 次迭代和全量 DOM 扫描脚本, 最终确定:

```
全页文本节点扫描:  ✅ 无水印文字
CSS 伪元素扫描:    ✅ 391个伪元素中无一个含水印关键词
低透明度元素扫描:   ✅ 无水印浮层
Shadow DOM 扫描:    ✅ 无 Shadow DOM
iframe 扫描:        ✅ 无相关 iframe
```

**结论: 水印不是文字, 不是 CSS content, 不是 Shadow DOM, 而是 `<img>` 标签和 CSS `background-image`。**

### 3.3 去水印策略 (双层防护)

**JS 层 (clone 阶段):**

```javascript
function nukeWatermark(el) {
  // 1. 删除所有非白名单图片
  el.querySelectorAll('img').forEach(function(x) {
    var src = (x.src || '').toLowerCase();
    // 白名单: 用户头像照片
    if (src.indexOf('cv_accounts/avatars') >= 0) return;
    if (src.indexOf('prod-file-uploaded') >= 0 &&
        (src.indexOf('photo') >= 0 || src.indexOf('avatar') >= 0)) return;
    x.remove();
  });

  // 2. 删除 SVG / Canvas / Video
  el.querySelectorAll('svg,canvas,video,iframe,embed,object').forEach(function(x) {
    x.remove();
  });
}

// 3. 插入 DOM 后清除背景图 (必须在DOM中才能用 getComputedStyle)
function nukeAfterInsert(cover) {
  cover.querySelectorAll('*').forEach(function(x) {
    var cbg = window.getComputedStyle(x).backgroundImage || '';
    if (cbg && cbg !== 'none' && cbg.indexOf('url(') >= 0) {
      x.style.setProperty('background-image', 'none', 'important');
    }
  });
}
```

**CSS 层 (@media print 核弹):**

```css
@media print {
  /* 全局: 禁止所有图片/矢量/画布 */
  img, svg, canvas { display: none !important; }

  /* 全局: 禁止所有背景图 */
  * { background-image: none !important; }

  /* 全杀伪元素 */
  *::before, *::after {
    content: none !important;
    display: none !important;
    visibility: hidden !important;
    background-image: none !important;
    opacity: 0 !important;
  }

  /* 精确杀水印类名 */
  [class*="cv-pattern"],
  [class*="watermark"],
  [class*="water-mark"],
  [class*="mark-layer"] {
    display: none !important;
    opacity: 0 !important;
  }
}
```

JS 层在 clone 后立即删除水印 DOM 节点, CSS 层在打印时再杀一遍所有可能遗漏的图片和背景。双层防护确保任何形式的水印都无法通过打印输出。

## 四、导出流程

### 4.1 完整调用链

```
用户触发导出 (Popup按钮 或 Ctrl+Shift+P)
  │
  ├─ Step 0: 反调试解除
  │
  ├─ Step 1: 查找简历容器
  │   扫描全页 DOM → 匹配 .resume-preview-wrapper 或 .cvs-component
  │
  ├─ Step 2: cloneNode(true) 深克隆简历区域
  │
  ├─ Step 3: 去水印
  │   ├─ 删除所有非白名单 <img>
  │   ├─ 删除 <svg>/<canvas>/<video>
  │   └─ 删除编辑UI元素
  │
  ├─ Step 4: 注入 CSS
  │   ├─ 屏幕层: 覆盖层样式
  │   └─ @media print: 隐藏原页面 + 全局去水印核弹 + A4边距
  │
  ├─ Step 5: 创建覆盖层
  │   ├─ #wcv-cover (全屏白底)
  │   ├─ 插入 clone
  │   └─ nukeAfterInsert() — DOM中二次清除背景图
  │
  └─ Step 6: window.print()
      浏览器打印对话框 → 另存为 PDF
```

### 4.2 关键设计决策

| 决策 | 原因 |
|------|------|
| **克隆 DOM 而非调用 API** | 绕过后端收费校验 |
| **同页面覆盖层而非新窗口** | clone 节点在同一 document 中 → CSS 样式不丢失 → Vue scoped 样式完整 |
| **覆盖层白底 + 居中** | 隔离原页面 UI, 只打印简历 |
| **margin: 0 auto** | 720px 宽度简历在 A4 (≈794px) 纸上左右对称居中 |
| **210mm 宽打印** | A4 纸张尺寸, match 简历原始渲染宽度 |
| **双层去水印** | JS 删 DOM 节点 + CSS 全杀, 杜绝任何遗漏 |

## 五、安全声明

本研究出于以下目的:

1. 理解前端收费逻辑的校验机制
2. 分析客户端水印的生成与注入方式
3. 探索浏览器打印 API 的 PDF 生成能力
4. 展示 DOM 操作与 CSS 注入的前端技术应用

本工具**不**涉及:

- 对后端服务器的任何攻击或渗透
- 数据库的修改或注入
- 用户数据的窃取或篡改
- API 的伪造或重放

所有操作均在浏览器客户端沙箱内完成, 利用的是页面本身已渲染的公开 DOM 内容。
