/**
 * Content script - 注入核心 + 触发导出
 *
 * 架构说明:
 *   Content script (隔离世界) ←→ Page (主世界)
 *   inject.js 运行在隔离世界, 通过 <script src> 把 core.js 注入主世界
 *   触发导出也通过 <script src=trigger.js> 注入主世界执行
 *   两者之间的协调只能通过 DOM 或 chrome.runtime messaging
 */
(function() {
  'use strict';
  var coreReady = false;

  // ── 注入 core.js (仅一次) ──
  function injectCore() {
    if (document.getElementById('wcv-core-script')) return;
    var s = document.createElement('script');
    s.id = 'wcv-core-script';
    s.src = chrome.runtime.getURL('core.js');
    s.onload = function() { coreReady = true; };
    s.onerror = function() { console.error('[SuperCV] core.js 加载失败'); };
    (document.head || document.documentElement).appendChild(s);
  }

  // ── 等待 core.js 就绪后触发导出 ──
  function triggerExport(cb, retries) {
    retries = retries || 0;

    if (coreReady) {
      // core.js 已加载, 直接触发
      fireTrigger(cb);
      return;
    }

    // core.js 还没加载完, 重试
    if (retries >= 20) {
      console.error('[SuperCV] core.js 加载超时');
      if (cb) cb(false);
      return;
    }

    setTimeout(function() {
      triggerExport(cb, retries + 1);
    }, 200);
  }

  function fireTrigger(cb) {
    // 通过 script src 加载 trigger.js 到主世界 (避免 CSP inline 拦截)
    var exec = document.createElement('script');
    exec.src = chrome.runtime.getURL('trigger.js');
    exec.onload = function() {
      // trigger.js 执行完毕
      if (cb) cb(true);
    };
    exec.onerror = function() {
      console.error('[SuperCV] trigger.js 加载失败');
      if (cb) cb(false);
    };
    (document.head || document.documentElement).appendChild(exec);
  }

  // ── 页面加载即注入核心 ──
  injectCore();

  // ── 消息监听 ──
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'export') {
      triggerExport(function(ok) {
        sendResponse({ ok: ok });
      });
      return true; // 保持消息通道
    }
  });
})();
