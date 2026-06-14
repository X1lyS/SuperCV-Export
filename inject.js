/**
 * Content script - 按需注入
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

  function remove() {
    var cover = document.getElementById('wcv-cover'); if (cover) cover.remove();
    var styles = document.querySelectorAll('[id^="wcv-core-css"]');
    styles.forEach(function(el) { el.remove(); });
    injected = false;
  }

  chrome.storage.local.get(['enabled'], function(r) {
    if (r.enabled === true) inject();
  });

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'enable')  { inject(); sendResponse({ ok: true }); }
    if (msg.action === 'disable') { remove(); sendResponse({ ok: true }); }
    if (msg.action === 'export') {
      inject();
      setTimeout(function() { window.postMessage({ type: 'WCV_EXPORT' }, '*'); }, 300);
      sendResponse({ ok: true });
    }
  });
})();
