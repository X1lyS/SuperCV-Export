/**
 * Content script - 注入核心 + 直接触发导出
 */
(function() {
  'use strict';
  var injected = false;

  function inject() {
    if (injected) return;
    var s = document.createElement('script');
    s.src = chrome.runtime.getURL('core.js');
    (document.head || document.documentElement).appendChild(s);
    injected = true;
  }

  // 页面加载即注入核心脚本
  inject();

  // 导出: 直接注入执行脚本(保持用户手势链路)
  function triggerExport() {
    inject();
    // 直接注入执行脚本, 不经过 postMessage/setTimeout
    var s = document.createElement('script');
    s.textContent = 'if(window.__wcvExport)window.__wcvExport();';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  }

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'export') {
      triggerExport();
      sendResponse({ ok: true });
    }
  });
})();
