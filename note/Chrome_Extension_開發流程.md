# Chrome 擴充套件重新開發流程

## 第一階段：初始設置與基礎架構

1. **創建專案目錄結構**：
   ```
   /chrome_extension
     /public            # 靜態資源和最終編譯的文件
     /src               # 源代碼
     /scripts           # 腳本工具和自定義功能
     package.json       # 依賴和腳本
   ```

2. **編寫 `manifest.json`**：
   - 設置基本信息（name、version、description）
   - 添加必要的權限 (`activeTab`, `scripting`, `tabs`, `storage`)
   - 配置 host permissions (`*://*.jambolive.tv/*`)
   - 設置 popup 頁面和圖標
   - 添加 background script 配置
   - 配置 content scripts

3. **配置構建環境**（可選）：
   - 如果使用 Vite 或 Webpack，設置配置文件
   - 設置開發和生產環境的構建腳本

## 第二階段：核心組件開發

1. **開發 `popup.html` 和 `popup.js`**：
   - 創建簡單的 UI 界面，包含懶加載開關
   - 實現與 background 的通信
   - 添加狀態讀取和保存功能

2. **開發 `background.js`**：
   - 實現 `LazyLoadController` 類
   - 設置消息監聽器
   - 實現標籤頁管理邏輯
   - 添加狀態管理功能

3. **開發 `content.js`**：
   - 實現 `LazyLoader` 類
   - 添加滾動監聽和懶加載觸發邏輯
   - 實現與 background 的通信

## 第三階段：功能整合與測試

1. **整合各組件**：
   - 確保 popup、background 和 content 之間的通信正常
   - 測試狀態管理和持久化

2. **調試與優化**：
   - 使用 Chrome 開發者工具進行調試
   - 檢查控制台錯誤和警告
   - 優化性能和資源使用

3. **測試擴充套件**：
   - 在 Chrome 瀏覽器中加載擴充套件
   - 訪問目標網站進行功能測試
   - 修復發現的問題

## 代碼實現順序和提示

### 1. 首先編寫 `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Chat Extension",
  "version": "1.0",
  "description": "在网页右下角显示按钮，点击弹出聊天窗口",
  "permissions": ["activeTab", "scripting", "tabs", "storage"],
  "host_permissions": ["*://*.jambolive.tv/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.jambolive.tv/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["app.js", "app.css", "assets/*"],
      "matches": ["*://*.jambolive.tv/*"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 2. 然後創建 `popup.html` 和 `popup.js`

**popup.html**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 200px;
      padding: 10px;
    }
    .control-item {
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }
    /* 其他 CSS 樣式... */
  </style>
</head>
<body>
  <div class="control-item">
    <label class="switch">
      <input type="checkbox" id="lazyLoadToggle">
      <span class="slider"></span>
    </label>
    <span>启用懒加载触发器</span>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**popup.js**:
```javascript
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("lazyLoadToggle");

  // 從存儲獲取初始狀態
  chrome.storage.local.get("isLazyLoadEnabled", (data) => {
    toggle.checked = !!data.isLazyLoadEnabled;
  });

  // 添加存儲監聽實現實時同步
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.isLazyLoadEnabled) {
      toggle.checked = changes.isLazyLoadEnabled.newValue;
    }
  });

  // 監聽切換事件
  toggle.addEventListener("change", () => {
    chrome.runtime.sendMessage(
      { type: "TOGGLE_LAZY_LOAD", enabled: toggle.checked },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          console.error("懶加載狀態更新失敗", chrome.runtime.lastError);
        } else {
          console.log("懶加載狀態已更新");
        }
      }
    );
  });
});
```

### 3. 接著開發 `background.js`

```javascript
// 全局控制器映射表
const tabControllers = new Map();

// LazyLoad 控制器類
class LazyLoadController {
  constructor(tabId) {
    this.tabId = tabId;
    this.intervalId = null;
    this.scrollTimeouts = new Set();
    this.abortController = new AbortController();

    this.injectScript();
  }

  injectScript() {
    console.log(`注入标签页 ${this.tabId}`);

    chrome.scripting.executeScript(
      {
        target: { tabId: this.tabId },
        files: ["content.js"],
      },
      () => {
        chrome.tabs.sendMessage(this.tabId, {
          type: "INIT_LAZY_LOAD",
          config: {
            interval: 3000,
            stepCount: 10,
            debug: true,
          },
        });
      }
    );
  }

  destroy() {
    clearInterval(this.intervalId);
    this.scrollTimeouts.forEach(clearTimeout);
    this.abortController.abort();
    chrome.tabs.sendMessage(this.tabId, {
      type: "STOP_LAZY_LOAD",
    });
  }
}

// 狀態管理
const stateManager = {
  async getEnabledState() {
    return new Promise((resolve) => {
      chrome.storage.local.get("isLazyLoadEnabled", (data) => {
        resolve(data.isLazyLoadEnabled || false);
      });
    });
  },

  async setEnabledState(enabled) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ isLazyLoadEnabled: enabled }, () => {
        resolve();
      });
    });
  },
};

// 消息監聽器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 處理切換邏輯
  const handleToggle = async (tabId) => {
    await stateManager.setEnabledState(message.enabled);

    if (message.enabled) {
      if (!tabControllers.has(tabId)) {
        const controller = new LazyLoadController(tabId);
        tabControllers.set(tabId, controller);
      }
    } else {
      tabControllers.get(tabId)?.destroy();
      tabControllers.delete(tabId);
    }

    sendResponse({ success: true });
  };

  // 根據消息類型處理
  switch (message.type) {
    case "GET_LAZY_LOAD_STATUS":
      stateManager.getEnabledState().then((enabled) => {
        sendResponse({ enabled });
      });
      return true;

    case "TOGGLE_LAZY_LOAD":
      if (sender.tab) {
        handleToggle(sender.tab.id);
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) handleToggle(tabs[0].id);
        });
      }
      return true;
  }
});

// 標籤頁更新監聽器
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /jambolive\.tv/.test(tab.url)) {
    const isEnabled = await stateManager.getEnabledState();
    if (isEnabled && !tabControllers.has(tabId)) {
      const controller = new LazyLoadController(tabId);
      tabControllers.set(tabId, controller);
    }

    // 注入 React 應用
    injectReactApp(tabId);
  }
});

// 注入 React 應用函數
function injectReactApp(tabId) {
  // React 注入邏輯...
}
```

### 4. 最後開發 `content.js`

```javascript
if (!window.__LAZYLOAD_INSTALLED__) {
  window.__LAZYLOAD_INSTALLED__ = true;

  if (!window.LazyLoader) {
    class LazyLoader {
      constructor(config) {
        this.config = config;
        this.state = {
          active: false,
          scrollTimeouts: new Set(),
          abortController: null,
          intervalId: null,
        };
        this.handleScrollBound = this.handleUserScroll.bind(this);
        this.setupEventListeners();
      }

      setupEventListeners() {
        this.state.abortController = new AbortController();
        const abortSignal = this.state.abortController.signal;

        window.addEventListener("scroll", this.handleScrollBound, {
          passive: true,
          signal: abortSignal,
        });

        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === "STOP_LAZY_LOAD") {
            this.stop();
          }
        });
      }

      start() {
        // 啟動邏輯...
      }

      stop() {
        // 停止邏輯...
      }

      triggerLazyLoad() {
        // 懶加載觸發邏輯...
      }

      handleUserScroll() {
        // 處理滾動邏輯...
      }
    }

    window.LazyLoader = LazyLoader;
  }

  // 清理舊實例
  if (window.lazyLoader) {
    window.lazyLoader.stop();
    delete window.lazyLoader;
  }

  // 設置消息監聽器
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "INIT_LAZY_LOAD") {
      if (window.lazyLoader) {
        window.lazyLoader.stop();
        delete window.lazyLoader;
      }

      if (message.config?.interval && message.config?.stepCount) {
        window.lazyLoader = new window.LazyLoader(message.config);
        window.lazyLoader.start();
      } else {
        console.error("Invalid config received:", message);
      }
    }
  });
}
```

## 開發建議

1. **使用模塊化開發**：
   - 將功能拆分為獨立的模塊，便於維護和測試

2. **添加詳細日誌**：
   - 在關鍵位置添加 `console.log`，輔助調試

3. **分階段測試**：
   - 完成一個組件後就進行測試，確保基礎功能正常

4. **使用 Chrome 擴充套件開發工具**：
   - 利用 Chrome 的擴充套件管理頁面 (`chrome://extensions/`) 進行開發調試
   - 啟用 "開發人員模式" 以便快速重新加載擴充套件

5. **考慮瀏覽器兼容性**：
   - Chrome 擴充套件 API 可能會隨版本變化，確保使用的 API 與目標瀏覽器兼容

通過遵循這個開發流程，您應該能夠順暢地重新實現這些功能。如果在過程中遇到任何特定問題，可以參考 Chrome 擴充套件的官方文檔或進一步尋求幫助。
