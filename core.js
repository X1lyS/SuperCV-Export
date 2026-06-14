/**
 * SuperCV Export - core
 */
(function() {
  'use strict';
  var $ = function(s) { return document.querySelector(s); };
  var $$ = function(s) { return [].slice.call(document.querySelectorAll(s)); };

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
    '@media print{' +
      '@page{size:A4;margin:0}' +
      'html,body{width:100%!important;margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
      'body>*:not(#wcv-cover){display:none!important}' +
      '#wcv-cover{display:flex!important;justify-content:center!important;position:static!important;width:100%!important;height:auto!important;overflow:visible!important;background:#fff!important;padding:0!important;margin:0!important}' +
      '#wcv-cover>*{margin:0 auto!important;padding:0!important;box-shadow:none!important;overflow:visible!important}' +
      '#wcv-cover [class*="page-index-"]{margin:0 auto!important;padding:0!important;box-shadow:none!important;overflow:visible!important;page-break-after:always}' +
      '#wcv-cover [class*="page-index-"]:last-child{page-break-after:avoid}' +
      'img,svg,canvas{display:none!important}' +
      '*{background-image:none!important}' +
      '*::before,*::after{content:none!important;display:none!important;visibility:hidden!important;background-image:none!important;opacity:0!important}' +
      '[class*="cv-pattern"],[class*="watermark"],[class*="water-mark"],[class*="mark-layer"]{display:none!important;opacity:0!important}' +
      '#wcv-cover .wcv-close{display:none!important}' +
      '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
    '}';
  document.head.appendChild(s);

  // ═══ 查找简历容器 ═══
  function findCV() {
    var best = null, bestScore = -1;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], cls = (el.className || '').toString();
      var score = 0;
      if (cls.indexOf('resume-preview-wrapper') >= 0) score = 100;
      else if (cls.indexOf('cvs-component') >= 0) score = 99;
      else if (el.id === 'cvsEditorDom') score = 98;
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  // ═══ 去水印 ═══
  function nukeWatermark(el) {
    el.querySelectorAll('img').forEach(function(x) {
      var src = (x.src || '').toLowerCase();
      if (src.indexOf('cv_accounts/avatars') >= 0) return;
      if (src.indexOf('prod-file-uploaded') >= 0 && (src.indexOf('photo') >= 0 || src.indexOf('avatar') >= 0)) return;
      x.remove();
    });
    el.querySelectorAll('svg,canvas,video,iframe,embed,object').forEach(function(x) { x.remove(); });
    '.el-loading-mask,.el-message,.el-notification,.el-popover,.el-tooltip,.el-dropdown-menu,.el-popper,.el-dialog__wrapper,.el-drawer__wrapper,.el-overlay,.el-badge__content,.el-tag,.drag-handle,.module-actions,.section-actions,.module-toolbar,.scanner-mask,.high-light-error,.error-tip,.match-tips,.resume-error-hint,.skeleton-wrapper,.more-mask,.guide-tip,.onboarding-tip,[class*="edit-btn"],[class*="delete-btn"],[class*="add-btn"]'
      .split(',').forEach(function(s) { try { el.querySelectorAll(s).forEach(function(x) { x.remove(); }); } catch(_) {} });
  }

  function nukeAfterInsert(cover) {
    cover.querySelectorAll('*').forEach(function(x) {
      var bi = x.style.backgroundImage || '';
      if (bi && bi !== 'none') { x.style.setProperty('background-image', 'none', 'important'); }
      try {
        var cbg = window.getComputedStyle(x).backgroundImage || '';
        if (cbg && cbg !== 'none' && cbg.indexOf('url(') >= 0) {
          x.style.setProperty('background-image', 'none', 'important');
        }
      } catch(_) {}
    });
  }

  // ═══ 主导出 ═══
  function doExport() {
    var cv = findCV();
    if (!cv) return;

    var origW = window.getComputedStyle(cv).width;
    var clone = cv.cloneNode(true);

    clone.style.setProperty('width', origW, 'important');
    clone.style.setProperty('max-width', origW, 'important');
    clone.style.setProperty('margin', '0 auto', 'important');
    clone.style.setProperty('margin-left', 'auto', 'important');
    clone.style.setProperty('margin-right', 'auto', 'important');

    nukeWatermark(clone);

    var cover = document.getElementById('wcv-cover'); if (cover) cover.remove();
    cover = document.createElement('div'); cover.id = 'wcv-cover';
    var closeBtn = document.createElement('div'); closeBtn.className = 'wcv-close'; closeBtn.textContent = '✕';
    closeBtn.onclick = function() { cover.classList.remove('on'); };
    cover.appendChild(closeBtn);
    cover.appendChild(clone);
    document.body.appendChild(cover);
    cover.classList.add('on');

    nukeAfterInsert(cover);

    // 直接调用打印, 不用 RAF 链(避免丢失用户手势上下文)
    setTimeout(function() { window.print(); }, 100);

    var done = function() {
      cover.classList.remove('on');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(function() { cover.classList.remove('on'); }, 120000);
  }

  // ═══ 导出入口 ═══
  window.__wcvExport = doExport;

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault(); e.stopPropagation();
      doExport();
    }
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'WCV_EXPORT') doExport();
  });
})();
