// public/background.js
// 全局控制器映射表
const tabControllers = new Map();

// lazyload 相關的東西，每當有訊息(TOGGLE_LAZY_LOAD) 傳到 background.js 就會觸發產生這個物件
class LazyLoadController {
  constructor(tabId) {
    this.tabId = tabId;
    this.intervalId = null;
    this.scrollTimeouts = new Set();
    this.abortController = new AbortController();

    this.injectScript();
  }

  injectScript() {
    console.log(`注入标签页 ${this.tabId}`, tabControllers.has(this.tabId)); // ✅ 使用this.tabId

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

// 状态管理中间件
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

// 接收其他元件傳遞過來的訊息
// chrome.runtime.onMessage.addListener => 監聽從其他地方（如 popup.js 或 content.js）傳來的訊息
// message(收到的訊息內容，是個物件)、sender(誰傳來這個訊息，裡面包含 tab.id)、sendResponse(可以用來回傳資料給發訊人)
// 在過程中添加判斷訊息的來源，判斷是從 popup 或是 content 送來的，因為 popup 沒有 tab id 所以會出現錯誤
//
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

// 注入 React 组件的函数
function injectReactApp(tabId) {
  console.log("开始注入 React 应用");

  // 1. 创建挂载点
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      func: () => {
        console.log("创建挂载点");
        if (!document.getElementById("chat-extension-root")) {
          const mountPoint = document.createElement("div");
          mountPoint.id = "chat-extension-root";
          document.body.appendChild(mountPoint);
          console.log("挂载点创建成功");
        } else {
          console.log("挂载点已存在");
        }
      },
    })
    .then(() => {
      console.log("挂载点创建完成，开始注入 React");

      // 2. 注入 CSS
      chrome.scripting
        .insertCSS({
          target: { tabId: tabId },
          files: ["app.css"],
        })
        .then(() => {
          console.log("CSS 注入完成");
        });

      // 3. 注入 React 应用
      chrome.scripting
        .executeScript({
          target: { tabId: tabId },
          files: ["app.js"],
        })
        .then(() => {
          console.log("React 应用注入完成");
        });
    });
}

// 在技術上這段是監聽標籤頁更新，當任何一個 tab 有變化就會被觸發，如果這個有變化的tab 載入完成而且這個 tab 網址是 jambolive.tv，並且懶加載的開關有打開，則執行 injectLazyLoadScript
// chrome.tabs.onUpdated.addListener 當「任何一個 tab 有變化」時就會被觸發。
// tabId 是變動的 tab 的 ID。changeInfo，包含變動的內容，例如載入狀態（status）、頁面是否完成載入。tab：變動的 tab 的完整資訊（如網址、標題等）。
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // changeInfo.status === "complete" => 檢查頁面是否加載完成
  // tab.url?.includes("jambolive.tv") => 是否包含 "jambolive.tv"
  if (changeInfo.status === "complete" && /jambolive\.tv/.test(tab.url)) {
    const isEnabled = await stateManager.getEnabledState(); // 獲取當前頁面的狀態
    // 檢查開關狀態
    if (isEnabled) {
      // 如果當前isEnabled 狀態是 true 但是 tabControllers 中沒有(tabId) key 就創建一個
      if (!tabControllers.has(tabId)) {
        const controller = new LazyLoadController(tabId); // 創建物件
        tabControllers.set(tabId, controller); // 添加一筆資料
      }
    }

    // 其他的組件
    injectReactApp(tabId); // 載入 React
  }
});
