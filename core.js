/**
 * SuperCV Export - core
 */
(function() {
  'use strict';
  window.__wcvCoreVersion = '1.4.0';
  console.log('%c[SuperCV] core v1.4.0 loaded', 'color:#dc2127;font-weight:bold');
  var trace = window.__wcvTrace || { events: [] };
  trace.coreVersion = window.__wcvCoreVersion;
  trace.events = trace.events || [];
  function logTrace(event, data) {
    var item = { time: new Date().toISOString(), event: event, data: data || null };
    trace.events.push(item);
    if (trace.events.length > 100) trace.events.shift();
    try { console.log('[SuperCV][trace] ' + event, data || ''); } catch(_) {}
  }
  window.__wcvTrace = trace;
  window.__wcvTraceDump = function() { return trace; };
  logTrace('core-loaded', { version: trace.coreVersion });
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
      '#wcv-cover [class*="resume-main"],#wcv-cover [class*="resume-preview-wrapper"],#wcv-cover [class*="resume-preview-container"],#wcv-cover [class~="scale"]{height:auto!important;min-height:0!important;overflow:visible!important}' +
      '#wcv-cover .wcv-print-root{display:block!important;width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important}' +
      '#wcv-cover .wcv-print-page{display:block!important;position:relative!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;margin:0!important;padding:0!important;overflow:visible!important;break-inside:avoid!important;page-break-inside:avoid!important;break-after:auto!important;page-break-after:auto!important;transform:none!important}' +
      '#wcv-cover .wcv-print-page:not(:first-child){break-before:page!important;page-break-before:always!important}' +
      '#wcv-cover,#wcv-cover *{transition:none!important;animation:none!important}' +
      /* 每个页节点都来自编辑器的分页结果。用“页前分页”避免页节点自身溢出后，
         再叠加 page-break-after:always 产生额外空白页；最后一页不需要特殊规则。 */
      '#wcv-cover [data-wcv-page]{display:block!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;margin:0!important;box-shadow:none!important;overflow:visible!important;break-inside:avoid!important;page-break-inside:avoid!important;break-after:auto!important;page-break-after:auto!important}' +
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

  function getPageNodes(root) {
    if (!root || root.nodeType !== 1) return [];
    var pages = [];
    if (root.matches && root.matches(PAGE_SELECTOR)) pages.push(root);
    return pages.concat([].slice.call(root.querySelectorAll(PAGE_SELECTOR)));
  }

  function isVisiblePage(el) {
    if (!el || !el.getClientRects || !el.getClientRects().length) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function markPages(root) {
    if (!root || root.nodeType !== 1) return 0;
    var pages = getPageNodes(root);
    pages.forEach(function(el) {
      el.removeAttribute('data-wcv-first-page');
      el.removeAttribute('data-wcv-last-page');
      el.setAttribute('data-wcv-page', '1');
    });
    if (pages.length) {
      pages[0].setAttribute('data-wcv-first-page', '1');
      pages[pages.length - 1].setAttribute('data-wcv-last-page', '1');
    }
    logTrace('pages-marked', {
      rootClass: String(root.className || ''),
      pageCount: pages.length,
      pageClasses: pages.map(function(el) { return String(el.className || ''); })
    });
    return pages.length;
  }

  function findCV(silent) {
    var best = null, bestScore = -1;
    var allPages = getPageNodes(document.documentElement);
    var visiblePages = getPageNodes(document.documentElement).filter(isVisiblePage);
    var candidates = [];
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cls = (el.className || '').toString();
      var score = -1;
      var pageCount = allPages.filter(function(page) {
        return page === el || el.contains(page);
      }).length;
      var hasVisiblePage = visiblePages.some(function(page) {
        return page === el || el.contains(page);
      });
      if (!hasVisiblePage) continue;
      if (cls.indexOf('resume-main') >= 0) score = 4000;
      else if (cls.indexOf('resume-preview-wrapper') >= 0) score = 3000;
      else if (cls.indexOf('cvs-component') >= 0) score = 2000;
      else if (el.id === 'cvsEditorDom') score = 1000;
      if (score < 0) continue;

      // 必须优先选包含全部分页节点的容器，避免只克隆当前预览页。
      score += pageCount * 10000;
      if (allPages.length && pageCount === allPages.length) score += 500000;
      if (el.clientHeight) score += Math.min(el.clientHeight, 9999);
      candidates.push({
        tag: el.tagName,
        id: el.id,
        className: cls,
        pageCount: pageCount,
        clientHeight: el.clientHeight,
        score: score
      });

      if (score > bestScore) { bestScore = score; best = el; }
    }
    if (!silent) {
      logTrace('find-cv', {
        allPageCount: allPages.length,
        visiblePageCount: visiblePages.length,
        selected: best ? {
          tag: best.tagName,
          id: best.id,
          className: String(best.className || ''),
          pageCount: countPages(best),
          clientHeight: best.clientHeight
        } : null,
        candidates: candidates
      });
    }
    return best;
  }

  // ═══ 去水印 ═══
  // 实测: 水印 = 简历页元素的 background-image (editer-preview-watermark.png 平铺),
  // 另有 class 水印层兜底; 模板图标/装饰大量使用 img/svg/伪元素/背景图, 一律保留
  function nukeWatermark(el) {
    // 注: cv-pattern 是模板花纹装饰(banners/* 纹理图), 不可删; .el-tag 可能是简历技能标签, 不可删
    var removed = 0;
    '[class*="watermark"],[class*="water-mark"],[class*="mark-layer"],.el-loading-mask,.el-message,.el-notification,.el-popover,.el-tooltip,.el-dropdown-menu,.el-popper,.el-dialog__wrapper,.el-drawer__wrapper,.el-overlay,.el-badge__content,.drag-handle,.change-action,.module-actions,.section-actions,.module-toolbar,.scanner-mask,.high-light-error,.error-tip,.match-tips,.resume-error-hint,.skeleton-wrapper,.more-mask,.guide-tip,.onboarding-tip,[class*="edit-btn"],[class*="delete-btn"],[class*="add-btn"]'
      .split(',').forEach(function(s) {
        try {
          el.querySelectorAll(s).forEach(function(x) { removed++; x.remove(); });
        } catch(_) {}
      });
    logTrace('clone-cleaned', { removed: removed });
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
    // 只解除布局容器的缩放和占位高度。简历内容中的 transform/calc() 可能是
    // 模板定位数据，全部删除会改变第二页的内容布局并制造新的分页溢出。
    var layoutSelector = '[class*="resume-main"],[class*="resume-preview-wrapper"],[class*="resume-preview-container"],[class~="scale"]';
    cover.querySelectorAll('[style*="scale("]').forEach(function(x) {
      if (x.matches(layoutSelector)) x.classList.add('wcv-unscale');
    });
    cover.querySelectorAll(layoutSelector).forEach(function(x) {
      if (x.style.height && /calc\(/i.test(x.style.height)) x.style.removeProperty('height');
    });
    logTrace('clone-laid-out', {
      pageCount: cover.querySelectorAll('[data-wcv-page]').length,
      controlCount: cover.querySelectorAll('.change-action').length,
      rootHeight: cover.getBoundingClientRect().height,
      pages: [].slice.call(cover.querySelectorAll('[data-wcv-page]')).map(function(el) {
        var r = el.getBoundingClientRect();
        return {
          className: String(el.className || ''),
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          margin: window.getComputedStyle(el).margin
        };
      })
    });
  }

  // ═══ 主导出 ═══
  var exportCount = 0;
  var exportToken = 0;
  var pendingPrintTimer = 0;
  var pendingCleanupTimer = 0;
  var activeAfterPrint = null;

  function cancelPendingExport() {
    exportToken++;
    if (pendingPrintTimer) {
      clearTimeout(pendingPrintTimer);
      pendingPrintTimer = 0;
    }
    if (pendingCleanupTimer) {
      clearTimeout(pendingCleanupTimer);
      pendingCleanupTimer = 0;
    }
    if (activeAfterPrint) {
      window.removeEventListener('afterprint', activeAfterPrint);
      activeAfterPrint = null;
    }
    var oldCover = document.getElementById('wcv-cover');
    if (oldCover) oldCover.remove();
  }

  // 编辑器可能先渲染第一页，随后才把分页结果补齐。连续观察到稳定的
  // 页面数量和容器高度后再克隆，避免点击时把半成品当成完整简历。
  function waitForStableCV(token, done) {
    var lastSignature = '';
    var stableSamples = 0;
    var attempts = 0;

    function poll() {
      if (token !== exportToken) return;

      var cv = findCV(true);
      var pages = getPageNodes(cv);
      var rootHeight = cv ? Math.round(cv.getBoundingClientRect().height) : 0;
      var signature = cv
        ? String(cv.className || '') + '|' + pages.length + '|' + rootHeight + '|' +
          pages.map(function(el) { return el.getAttribute('data-resume-page') || ''; }).join(',')
        : '';

      if (cv && pages.length && signature === lastSignature) {
        stableSamples++;
      } else {
        lastSignature = signature;
        stableSamples = cv && pages.length ? 1 : 0;
      }

      if (stableSamples >= 3 || attempts >= 40) {
        if (cv) findCV(false);
        logTrace('pages-stable', {
          pageCount: pages.length,
          rootHeight: rootHeight,
          samples: stableSamples,
          attempts: attempts
        });
        done(cv);
        return;
      }

      attempts++;
      setTimeout(poll, 50);
    }

    poll();
  }

  function doExport() {
    exportCount++;
    trace.exportCount = exportCount;
    logTrace('export-start', { count: exportCount });

    cancelPendingExport();
    var token = exportToken;

    waitForStableCV(token, function(cv) {
      if (token !== exportToken) return;
      if (!cv) {
        console.warn('[SuperCV] CV container not found');
        logTrace('export-aborted', { reason: 'cv-not-found' });
        return;
      }

      // 将每一页放进独立的 A4 打印框。保留 resume-main/a4 类, 让模板的
      // 页面样式继续生效, 同时避免编辑器的 scale/cv-container 参与分页。
      var sourcePages = getPageNodes(cv);
      var printRoot = document.createElement('div');
      printRoot.className = 'wcv-print-root';
      sourcePages.forEach(function(sourcePage) {
        var pageFrame = document.createElement('div');
        pageFrame.className = String(cv.className || '') + ' wcv-print-page';
        [].slice.call(cv.attributes || []).forEach(function(attr) {
          if (attr.name !== 'class' && attr.name !== 'style' && attr.name !== 'id') {
            pageFrame.setAttribute(attr.name, attr.value);
          }
        });
        pageFrame.appendChild(sourcePage.cloneNode(true));
        printRoot.appendChild(pageFrame);
      });
      var pageCount = markPages(printRoot);
      var clone = printRoot;
      console.log('[SuperCV] pages detected:', pageCount);
      logTrace('clone-created', {
        pageCount: pageCount,
        controlCount: clone.querySelectorAll('.change-action').length,
        className: String(cv.className || ''),
        frameCount: clone.querySelectorAll('.wcv-print-page').length
      });

      nukeWatermark(clone);

      var cover = document.createElement('div'); cover.id = 'wcv-cover';
      var closeBtn = document.createElement('div'); closeBtn.className = 'wcv-close'; closeBtn.textContent = '✕';
      closeBtn.onclick = function() {
        if (token === exportToken) cancelPendingExport();
        else cover.remove();
      };
      cover.appendChild(closeBtn);
      // 打印设置提示(仅屏幕显示, 打印自动隐藏): Chrome 未勾选"背景图形"会覆盖 CSS 强制不打印背景
      var tip = document.createElement('div'); tip.className = 'wcv-tip';
      tip.innerHTML = '打印设置: 边距 <b>无</b> · 纸张 <b>A4</b> · ☑ 勾选 <b>背景图形</b> (否则背景色/渐变不打印)';
      cover.appendChild(tip);
      cover.appendChild(clone);
      document.body.appendChild(cover);
      cover.classList.add('on');

      nukeAfterInsert(cover);

      var done = function() {
        if (token !== exportToken) return;
        logTrace('afterprint', { coverExists: !!cover.parentNode });
        if (cover.parentNode) cover.remove();
        if (pendingCleanupTimer) {
          clearTimeout(pendingCleanupTimer);
          pendingCleanupTimer = 0;
        }
        window.removeEventListener('afterprint', done);
        activeAfterPrint = null;
      };
      activeAfterPrint = done;
      window.addEventListener('afterprint', done);

      // 打印
      console.log('[SuperCV] calling window.print()...');
      try {
        // 等克隆体布局稳定 (transform 还原/高度解除需一次回流)
        pendingPrintTimer = setTimeout(function() {
          pendingPrintTimer = 0;
          if (token !== exportToken || !cover.parentNode) {
            logTrace('print-skipped', {
              token: token,
              currentToken: exportToken,
              coverExists: !!cover.parentNode
            });
            return;
          }
          trace.printCount = (trace.printCount || 0) + 1;
          var cloneRect = clone.getBoundingClientRect();
          logTrace('print-call', {
            count: trace.printCount,
            pageCount: cover.querySelectorAll('[data-wcv-page]').length,
            coverExists: true,
            coverHeight: cover.getBoundingClientRect().height,
            cloneHeight: cloneRect.height
          });
          window.print();
        }, 300);
      } catch(e) {
        console.error('[SuperCV] print failed:', e);
        logTrace('print-error', { message: String(e && e.message || e) });
        alert('打印失败, 请尝试按 Ctrl+Shift+P 手动打印');
      }

      pendingCleanupTimer = setTimeout(function() {
        pendingCleanupTimer = 0;
        if (token !== exportToken) return;
        logTrace('export-timeout-cleanup', { coverExists: !!cover.parentNode });
        if (cover.parentNode) cover.remove();
        window.removeEventListener('afterprint', done);
        if (activeAfterPrint === done) activeAfterPrint = null;
      }, 120000);
    });
  }

  // ═══ 导出入口 (仅插件按钮触发, 不再注册快捷键: Win/Mac 快捷键差异大, 统一走按钮) ═══
  window.__wcvExport = doExport;

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'WCV_EXPORT') doExport();
  });
})();
