/**
 * Content script - 页面加载即注入核心脚本
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

  // 页面加载即注入
  inject();

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'export') {
      inject();
      setTimeout(function() { window.postMessage({ type: 'WCV_EXPORT' }, '*'); }, 300);
      sendResponse({ ok: true });
    }
  });
})();
