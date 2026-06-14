/**
 * Content script - 注入核心 + 直接触发导出
 */
(function() {
  'use strict';
  var loaded = false;

  function injectAndWait(cb, retries) {
    retries = retries || 0;

    // 如果 core.js 还没注入, 先注入
    var existing = document.querySelector('script[src*="core.js"]');
    if (!existing) {
      var s = document.createElement('script');
      s.src = chrome.runtime.getURL('core.js');
      (document.head || document.documentElement).appendChild(s);
    }

    // 等待 __wcvExport 就绪
    var maxRetries = 15;
    function check() {
      if (window.__wcvExport || document.querySelector('script[src*="core.js"]')) {
        // 注入执行脚本
        var exec = document.createElement('script');
        exec.textContent = 'try{window.__wcvExport();}catch(e){console.error("[SuperCV]",e);}';
        (document.head || document.documentElement).appendChild(exec);
        exec.remove();
        if (cb) cb(true);
        return;
      }
      retries++;
      if (retries < maxRetries) {
        setTimeout(check, 200);
      } else {
        console.error('[SuperCV] core.js 注入超时');
        if (cb) cb(false);
      }
    }
    check();
  }

  // 页面加载即注入核心脚本
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL('core.js');
  (document.head || document.documentElement).appendChild(s);

  s.onload = function() { loaded = true; };
  s.onerror = function() { console.error('[SuperCV] core.js 加载失败'); };

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'export') {
      injectAndWait(function(ok) {
        sendResponse({ ok: ok });
      });
      return true; // 保持消息通道 open
    }
  });
})();
