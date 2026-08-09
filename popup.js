(function() {
  'use strict';
  var btn = document.getElementById('btnExport');
  var statusTip = document.getElementById('statusTip');
  var statusText = document.getElementById('statusText');

  // ── 就绪状态: 只有当前页是简历编辑页且 core 已加载, 按钮才可点击 ──
  function setState(ready) {
    btn.disabled = !ready;
    statusTip.classList.toggle('ok', ready);
    statusText.textContent = ready ? '已就绪，可以导出' : '请进入简历编辑页后使用';
  }

  function queryReady(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) { cb(false); return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'wcv-query' }, function(resp) {
        if (chrome.runtime.lastError || !resp) { cb(false); return; }
        cb(!!resp.ready);
      });
    });
  }

  queryReady(setState);

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
