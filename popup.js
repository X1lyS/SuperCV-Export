(function() {
  'use strict';
  var btn = document.getElementById('btnExport');

  function triggerExport() {
    btn.disabled = true;
    btn.textContent = '导出中...';

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        btn.disabled = false;
        btn.textContent = '无水印导出 PDF';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'export' }, function() {
        if (chrome.runtime.lastError) {
          btn.disabled = false;
          btn.textContent = '无水印导出 PDF';
        }
        setTimeout(function() { window.close(); }, 400);
      });
    });
  }

  btn.addEventListener('click', triggerExport);
})();
