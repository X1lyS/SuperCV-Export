(function() {
  'use strict';
  var btn = document.getElementById('btnExport');
  var toggle = document.getElementById('toggle');
  var dot = document.getElementById('statusDot');
  var text = document.getElementById('statusText');

  function getState(cb) { chrome.storage.local.get(['enabled'], function(r) { cb(!!r.enabled); }); }
  function setState(v) { chrome.storage.local.set({ enabled: v }); }

  function setUI(on, msg) {
    toggle.checked = on;
    btn.disabled = false;
    dot.className = 'status-dot ' + (on ? 'on' : 'off');
    text.textContent = msg || (on ? '已启用 · 可导出或 Ctrl+Shift+P' : '未启用 · 点击下方按钮导出');
    btn.textContent = on ? '无水印导出 PDF' : '一键注入并导出';
  }

  // ── 初始化 ──
  getState(function(on) { setUI(on); });

  // ── 检查是否在编辑器页面 ──
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var t = tabs[0];
    if (!t || !t.url || t.url.indexOf('wondercv.com/cvs/') < 0 || t.url.indexOf('/editor') < 0) {
      setUI(false, '请在简历编辑页使用');
      toggle.disabled = true;
      btn.disabled = true;
    }
  });

  // ── 开关 ──
  toggle.addEventListener('change', function() {
    var v = toggle.checked;
    setState(v);
    setUI(v);
    notifyTabs(v ? 'enable' : 'disable');
  });

  function notifyTabs(action) {
    chrome.tabs.query({ url: 'https://www.wondercv.com/cvs/*/editor*' }, function(tabs) {
      tabs.forEach(function(t) {
        chrome.tabs.sendMessage(t.id, { action: action }).catch(function(){});
      });
    });
  }

  // ── 导出按钮 ──
  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = '导出中...';
    getState(function(on) {
      if (!on) {
        // 未启用: 先启用再导出
        setState(true);
        setUI(true);
        notifyTabs('enable');
        setTimeout(function() {
          triggerExport();
        }, 500);
      } else {
        triggerExport();
      }
    });
  });

  function triggerExport() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) { btn.disabled = false; btn.textContent = '无水印导出 PDF'; return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'export' }, function() {
        if (chrome.runtime.lastError) {
          btn.disabled = false;
          btn.textContent = '无水印导出 PDF';
          text.textContent = '请刷新页面后重试';
          dot.className = 'status-dot err';
        }
        setTimeout(function() { window.close(); }, 400);
      });
    });
  }
})();
