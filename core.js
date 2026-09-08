/**
 * SuperCV Export - core
 */
(function() {
  'use strict';
  console.log('%c[SuperCV] core v1.4 loaded', 'color:#dc2127;font-weight:bold');
  var $ = function(s) { return document.querySelector(s); };
  var $$ = function(s) { return [].slice.call(document.querySelectorAll(s)); };
  var PAGE_SELECTOR = '[class*="page-index-"]';

  // ═══ 反调试 ═══
  for (var i = 99999; i >= 1; i--) { clearInterval(i); clearTimeout(i); }
  window.setInterval = new Proxy(window.setInterval, {
    apply: function(t, _, a) { return String(a[0]).indexOf('debugger') >= 0 ? 0 : Reflect.apply(t, _, a); }
  });
  var _ael = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(e, f, o) {
    if ((e === 'contextmenu' && this === window) ||
        (e === 'keydown' && this === window && String(f).indexOf('123') >= 0))
      return;
    return _ael.call(this, e, f, o);
  };
  window.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123 ||
        (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'c'))
      e.stopImmediatePropagation();
  }, true);
  document.addEventListener('contextmenu', function(e) { e.stopImmediatePropagation(); }, true);

  // ═══ 注入打印CSS ═══
  var s = document.createElement('style'); s.id = 'wcv-core-css';
  s.textContent = '' +
    '#wcv-cover{display:none;position:fixed;inset:0;z-index:999999;background:#e8ecf1;overflow-y:auto}' +
    '#wcv-cover.on{display:flex;justify-content:center;align-items:flex-start;padding:0}' +
    '#wcv-cover .wcv-close{position:fixed;top:12px;right:12px;z-index:10000002;width:32px;height:32px;border-radius:50%;border:1px solid #ddd;background:#fff;font-size:14px;cursor:pointer;color:#999;box-shadow:0 1px 6px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center}' +
    '#wcv-cover .wcv-tip{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000001;background:#1c1e26;color:#fff;font-size:12px;line-height:1.6;padding:8px 16px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.18);white-space:nowrap}' +
    '#wcv-cover .wcv-tip b{color:#ffd666}' +
    '@media print{' +
      '@page{size:A4;margin:0}' +
      'html,body{width:100%!important;margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
      'body>*:not(#wcv-cover){display:none!important}' +
      '#wcv-cover{display:block!important;position:static!important;width:auto!important;height:auto!important;overflow:visible!important;background:#fff!important;padding:0!important;margin:0!important}' +
      /* 编辑器用 transform: scale(~0.72) 缩小预览, 内容真实宽度即 A4 满宽 210mm, 打印必须还原, 否则左右留白 ~30mm */
      '#wcv-cover .scale,#wcv-cover .wcv-unscale{transform:none!important}' +
      /* 编辑器按缩放后视觉高度给容器内联写入 calc() 占位高度+overflow:hidden, 恢复满宽后必须解除, 否则底部留白/裁切 */
      '#wcv-cover [class*="resume-main"],#wcv-cover [class*="resume-preview-wrapper"]{height:auto!important;min-height:0!important;overflow:visible!important}' +
      '#wcv-cover,#wcv-cover *{transition:none!important;animation:none!important}' +
      '#wcv-cover [data-wcv-page]{margin:0 auto!important;box-shadow:none!important;break-after:page;page-break-after:always}' +
      '#wcv-cover [data-wcv-last-page]{break-after:auto!important;page-break-after:auto!important}' +
      /* 水印仅按 class 特征精准隐藏; 不再无差别杀 img/svg/背景图/伪元素(模板图标与装饰依赖它们);
         cv-pattern 已证实是模板花纹装饰图(logo.wondercv.com/banners/* 弧线/波浪纹理), 必须保留 */
      '[class*="watermark"],[class*="water-mark"],[class*="mark-layer"]{display:none!important;opacity:0!important}' +
      '#wcv-cover .wcv-close,#wcv-cover .wcv-tip{display:none!important}' +
      '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
    '}';
  document.head.appendChild(s);

  // ═══ 查找简历容器 ═══
  function countPages(el) {
    if (!el || el.nodeType !== 1) return 0;
    var count = el.matches && el.matches(PAGE_SELECTOR) ? 1 : 0;
    return count + el.querySelectorAll(PAGE_SELECTOR).length;
  }

  function markPages(root) {
    if (!root || root.nodeType !== 1) return 0;
    var pages = [];
    if (root.matches && root.matches(PAGE_SELECTOR)) pages.push(root);
    pages = pages.concat([].slice.call(root.querySelectorAll(PAGE_SELECTOR)));
    pages.forEach(function(el) {
      el.removeAttribute('data-wcv-last-page');
      el.setAttribute('data-wcv-page', '1');
    });
    if (pages.length) pages[pages.length - 1].setAttribute('data-wcv-last-page', '1');
    return pages.length;
  }

  function findCV() {
    var best = null, bestScore = -1;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cls = (el.className || '').toString();
      var score = -1;
      var pageCount = countPages(el);
      if (cls.indexOf('resume-preview-wrapper') >= 0) score = 3000;
      else if (cls.indexOf('cvs-component') >= 0) score = 2000;
      else if (el.id === 'cvsEditorDom') score = 1000;
      if (score < 0) continue;

      // 优先选包含完整分页内容的外层容器，避免误选到第一页 wrapper。
      score += pageCount * 10000;
      if (el.clientHeight) score += Math.min(el.clientHeight, 9999);

      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  // ═══ 去水印 ═══
  // 实测: 水印 = 简历页元素的 background-image (editer-preview-watermark.png 平铺),
  // 另有 class 水印层兜底; 模板图标/装饰大量使用 img/svg/伪元素/背景图, 一律保留
  function nukeWatermark(el) {
    // 注: cv-pattern 是模板花纹装饰(banners/* 纹理图), 不可删; .el-tag 可能是简历技能标签, 不可删
    '[class*="watermark"],[class*="water-mark"],[class*="mark-layer"],.el-loading-mask,.el-message,.el-notification,.el-popover,.el-tooltip,.el-dropdown-menu,.el-popper,.el-dialog__wrapper,.el-drawer__wrapper,.el-overlay,.el-badge__content,.drag-handle,.module-actions,.section-actions,.module-toolbar,.scanner-mask,.high-light-error,.error-tip,.match-tips,.resume-error-hint,.skeleton-wrapper,.more-mask,.guide-tip,.onboarding-tip,[class*="edit-btn"],[class*="delete-btn"],[class*="add-btn"]'
      .split(',').forEach(function(s) { try { el.querySelectorAll(s).forEach(function(x) { x.remove(); }); } catch(_) {} });
  }

  // 必须在克隆体插入文档后调用: 不在文档中的元素 getComputedStyle 拿不到真实背景图
  function nukeAfterInsert(cover) {
    cover.querySelectorAll('*').forEach(function(x) {
      try {
        var cbg = window.getComputedStyle(x).backgroundImage || '';
        if (cbg && cbg !== 'none' && /watermark/i.test(cbg)) {
          x.style.setProperty('background-image', 'none', 'important');
        }
      } catch(_) {}
    });
    // 双保险: 凡内联 style 带 scale( 的元素, 打印时一并还原 (兼容类名变更)
    cover.querySelectorAll('[style*="scale("]').forEach(function(x) { x.classList.add('wcv-unscale'); });
    // 解除按缩放视觉高度内联写入的 calc() 占位高度 (CSS 规则的双保险)
    cover.querySelectorAll('[style*="calc("]').forEach(function(x) {
      if (x.style.height) x.style.removeProperty('height');
    });
  }

  // ═══ 主导出 ═══
  var exportCount = 0;
  function doExport() {
    exportCount++;
    console.log('[SuperCV] doExport #' + exportCount + ' triggered');

    var cv = findCV();
    if (!cv) { console.warn('[SuperCV] CV container not found'); return; }

    // 不再锁死屏幕像素宽度: 简历内容本身按 A4 满宽排版, 锁宽+保留 scale 变换会导致打印左右留白
    var clone = cv.cloneNode(true);
    var pageCount = markPages(clone);
    console.log('[SuperCV] pages detected:', pageCount);

    nukeWatermark(clone);

    var cover = document.getElementById('wcv-cover'); if (cover) cover.remove();
    cover = document.createElement('div'); cover.id = 'wcv-cover';
    var closeBtn = document.createElement('div'); closeBtn.className = 'wcv-close'; closeBtn.textContent = '✕';
    closeBtn.onclick = function() { cover.classList.remove('on'); };
    cover.appendChild(closeBtn);
    // 打印设置提示(仅屏幕显示, 打印自动隐藏): Chrome 未勾选"背景图形"会覆盖 CSS 强制不打印背景
    var tip = document.createElement('div'); tip.className = 'wcv-tip';
    tip.innerHTML = '打印设置: 边距 <b>无</b> · 纸张 <b>A4</b> · ☑ 勾选 <b>背景图形</b> (否则背景色/渐变不打印)';
    cover.appendChild(tip);
    cover.appendChild(clone);
    document.body.appendChild(cover);
    cover.classList.add('on');

    nukeAfterInsert(cover);

    // 打印
    console.log('[SuperCV] calling window.print()...');
    try {
      // 等克隆体布局稳定 (transform 还原/高度解除需一次回流)
      setTimeout(function() { window.print(); }, 300);
    } catch(e) {
      console.error('[SuperCV] print failed:', e);
      alert('打印失败, 请尝试按 Ctrl+Shift+P 手动打印');
    }

    var done = function() {
      cover.classList.remove('on');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(function() { cover.classList.remove('on'); }, 120000);
  }

  // ═══ 导出入口 (仅插件按钮触发, 不再注册快捷键: Win/Mac 快捷键差异大, 统一走按钮) ═══
  window.__wcvExport = doExport;

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'WCV_EXPORT') doExport();
  });
})();
