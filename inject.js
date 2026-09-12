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
  var CORE_VERSION = '1.4.0';
  try { console.log('[SuperCV][trace] inject-start', CORE_VERSION); } catch(_) {}
  // 幂等: background 可能对同一页面 executeScript 重复注入
  if (window.__wcvInjected && window.__wcvCoreVersion === CORE_VERSION) return;
  window.__wcvInjected = true;

  var coreReady = false;

  // ── 注入 core.js (仅一次) ──
  function injectCore() {
    var current = document.getElementById('wcv-core-script');
    if (current && current.dataset.wcvVersion === CORE_VERSION) {
      coreReady = true;
      return;
    }
    if (current) current.remove();
    var oldStyle = document.getElementById('wcv-core-css');
    if (oldStyle) oldStyle.remove();

    var s = document.createElement('script');
    s.id = 'wcv-core-script';
    s.dataset.wcvVersion = CORE_VERSION;
    s.src = chrome.runtime.getURL('core.js') + '?v=' + CORE_VERSION;
    s.onload = function() {
      coreReady = true;
      try { console.log('[SuperCV][trace] core-loaded-from-inject', CORE_VERSION); } catch(_) {}
    };
    s.onerror = function() {
      console.error('[SuperCV] core.js 加载失败');
      try { console.error('[SuperCV][trace] core-load-error', CORE_VERSION); } catch(_) {}
    };
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

  // ── 就绪状态检测: 简历 DOM 容器已渲染 + core.js 已加载 = 可导出 ──
  function cvReady() {
    if (!coreReady) return false;
    return !!document.querySelector('[class*="resume-preview-wrapper"], [class*="cvs-component"], #cvsEditorDom');
  }

  // 状态变化时主动上报 background (绿点指示)
  var lastReady = null;
  function reportStatus() {
    var ready = cvReady();
    if (ready !== lastReady) {
      lastReady = ready;
      try { chrome.runtime.sendMessage({ type: 'wcv-status', ready: ready }); } catch(_) {}
    }
  }
  // MutationObserver 实时检测 DOM (简历容器一出现即上报), 轮询作兜底
  new MutationObserver(function() { reportStatus(); })
    .observe(document.documentElement, { childList: true, subtree: true });
  setInterval(reportStatus, 1500);

  // ── 页面加载即注入核心 ──
  injectCore();
  reportStatus();

  // ── 消息监听 ──
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'wcv-query') {
      // background / popup 查询就绪状态
      sendResponse({ ready: cvReady() });
      return true;
    }
    if (msg.action === 'export') {
      triggerExport(function(ok) {
        sendResponse({ ok: ok });
      });
      return true; // 保持消息通道
    }
  });
})();
