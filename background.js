/**
 * Background service worker - 图标绿点状态指示
 *
 * 绿点 = 当前标签页是简历编辑页且已就绪 (简历 DOM 已渲染 + core.js 已加载)
 *
 * 灵敏性设计:
 *   1. 扩展重载/安装后, 已打开的标签页没有 content script
 *      -> 发现 URL 匹配编辑器但查询失败时, scripting.executeScript 主动注入自愈 (无需手动刷新页面)
 *   2. 全事件覆盖: SW 启动/扩展安装/浏览器启动/切标签/URL 变化/窗口聚焦 均触发刷新
 *   3. content script 侧 MutationObserver 实时检测, 状态变化即上报 (见 inject.js)
 */
(function() {
  'use strict';

  // badge 宽度随文本内容: 空格 -> 最小圆角色点 (Chrome 原生矢量渲染, 始终清晰)
  function updateBadge(tabId, ready) {
    chrome.action.setBadgeText({ tabId: tabId, text: ready ? ' ' : '' });
    if (ready) {
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#22c55e' });
    }
  }

  function isEditorUrl(url) {
    return /^https:\/\/www\.wondercv\.com\/cvs\/[^/]+\/editor/.test(url || '');
  }

  // 编辑器页但 content script 缺失 (扩展重载/新装后遗留标签页) -> 主动注入自愈
  function ensureInjected(tabId, done) {
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError || !tab || !isEditorUrl(tab.url)) {
        updateBadge(tabId, false);
        return;
      }
      chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['inject.js'] }, function() {
        if (chrome.runtime.lastError) { updateBadge(tabId, false); return; }
        // inject.js 幂等; 注入后 core.js 就绪由 wcv-status 上报驱动, 这里补一次延时查询兜底
        if (done) setTimeout(done, 800);
      });
    });
  }

  function query(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'wcv-query' }, function(resp) {
      if (chrome.runtime.lastError || !resp) {
        ensureInjected(tabId, function() { query(tabId); });
        return;
      }
      updateBadge(tabId, !!resp.ready);
    });
  }

  function refresh(tabId) { query(tabId); }

  function refreshActive() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) refresh(tabs[0].id);
    });
  }

  // content script 状态变化主动上报
  chrome.runtime.onMessage.addListener(function(msg, sender) {
    if (msg && msg.type === 'wcv-status' && sender.tab) {
      updateBadge(sender.tab.id, !!msg.ready);
    }
  });

  chrome.tabs.onActivated.addListener(function(info) { refresh(info.tabId); });
  chrome.tabs.onUpdated.addListener(function(tabId, change) {
    if (change.status === 'complete' || change.url) refresh(tabId);
  });
  chrome.windows.onFocusChanged.addListener(function(winId) {
    if (winId !== chrome.windows.WINDOW_ID_NONE) refreshActive();
  });
  chrome.runtime.onInstalled.addListener(refreshActive);
  chrome.runtime.onStartup.addListener(refreshActive);

  // service worker 启动(含扩展重载/休眠唤醒)时刷新一次当前标签页
  refreshActive();
})();
