(function() {
  'use strict';
  var btn = document.getElementById('btnExport');

  function triggerExport() {
    btn.disabled = true;
    btn.textContent = '导出中...';

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        resetBtn();
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'export' }, function(resp) {
        if (chrome.runtime.lastError || !resp || !resp.ok) {
          resetBtn();
          return;
        }
        // 等足够时间让页面处理导出, 再关闭 popup
        setTimeout(function() { window.close(); }, 800);
      });
    });
  }

  function resetBtn() {
    btn.disabled = false;
    btn.textContent = '无水印导出 PDF';
  }

  btn.addEventListener('click', triggerExport);
})();
