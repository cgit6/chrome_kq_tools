// public/background.js
// 全局控制器映射表
const tabControllers = new Map(); // 用來儲存 LazyLoadController 實例

// lazyload 相關的東西，每當有訊息(TOGGLE_LAZY_LOAD) 傳到 background.js 就會觸發產生這個物件
// 這個物件是用來處理
class LazyLoadController {
  constructor(tabId) {
    this.tabId = tabId; // 標籤頁的 ID
    this.intervalId = null; // 定時器 ID
    this.scrollTimeouts = new Set(); // 滾動定時器集合
    this.abortController = new AbortController(); // 中斷控制器

    this.injectScript(); // 注入 script
  }

  injectScript() {
    // console.log(`注入标签页 ${this.tabId}`, tabControllers.has(this.tabId)); // ✅ 使用this.tabId

    // 注入 script
    chrome.scripting.executeScript(
      {
        target: { tabId: this.tabId }, // 注入的目標分頁
        files: ["content.js"], // 注入的腳本
      },
      (results) => {
        // 檢查腳本是否成功注入(如果有錯誤)
        if (chrome.runtime.lastError) {
          console.error(`腳本注入失敗: ${chrome.runtime.lastError.message}`);
          return; // 如果注入失敗，則不進行下一步
        }
        // 傳送訊息給目標(tabId)
        chrome.tabs.sendMessage(
          this.tabId,
          {
            type: "INIT_LAZY_LOAD",
            config: {
              interval: 3000, // 每3秒觸發一次
              stepCount: 10, // 最多觸發10次
              debug: false, // 是否開啟 debug 模式
              useActualScroll: true, // 是否進行實際滾動
              scrollAmount: 100, // 滾動距離
              restoreDelay: 10, // 恢復延遲
              detectUserScrolling: true, // 是否檢測用戶滾動
              userScrollPauseTime: 1500, // 用戶滾動後暫停時間
            },
          },
          (response) => {
            if (response && response.success) {
              console.log("懶加載初始化成功");
            } else if (chrome.runtime.lastError) {
              console.error(
                `懶加載初始化失敗: ${chrome.runtime.lastError.message}`
              );
            }
          }
        );
      }
    );
  }

  // 清理
  destroy() {
    clearInterval(this.intervalId); // 清除定時器
    this.scrollTimeouts.forEach(clearTimeout); // 清除滾動定時器
    this.abortController.abort(); // 中斷控制器
    chrome.tabs.sendMessage(this.tabId, {
      type: "STOP_LAZY_LOAD",
    });
  }
}

// 状态管理中间件
const stateManager = {
  // 獲取啟用狀態
  async getEnabledState() {
    //
    return new Promise((resolve) => {
      chrome.storage.local.get("isLazyLoadEnabled", (data) => {
        resolve(data.isLazyLoadEnabled || false);
      });
    });
  },

  // 設置啟用狀態
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 處理切換 lazyload 開關
  const handleToggle = async (tabId) => {
    await stateManager.setEnabledState(message.enabled); // 設置啟用狀態

    // 如果啟用狀態是 true 就創建 LazyLoadController 實例
    if (message.enabled) {
      // 如果 LazyLoadController 實例不存在，就創建一個
      if (!tabControllers.has(tabId)) {
        const controller = new LazyLoadController(tabId); // 創建 LazyLoadController 實例
        tabControllers.set(tabId, controller); // 設置 LazyLoadController 實例
      }
    } else {
      tabControllers.get(tabId)?.destroy(); // 清理 LazyLoadController 實例
      tabControllers.delete(tabId); // 刪除 LazyLoadController 實例
    }

    sendResponse({ success: true }); // 回傳成功，回傳給 popup.js
  };

  // 接收其他元件傳遞過來的訊息
  switch (message.type) {
    case "GET_LAZY_LOAD_STATUS":
      stateManager.getEnabledState().then((enabled) => {
        sendResponse({ enabled });
      });
      return true;

    // 切換 lazyload 開關
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
  console.log("开始注入。React 应用");

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
  if (
    changeInfo.status === "complete" &&
    /jambolive\.tv/.test(tab.url) // 檢查是否符合這個格式
  ) {
    const isEnabled = await stateManager.getEnabledState(); // 獲取當前頁面的狀態
    // 檢查開關狀態
    if (isEnabled) {
      // 如果當前 isEnabled 狀態是 true 但是 tabControllers 中沒有(tabId) key 就創建一個
      if (!tabControllers.has(tabId)) {
        const controller = new LazyLoadController(tabId); // 創建物件
        tabControllers.set(tabId, controller); // 添加一筆資料
      }

      // 創建新的控制器
      const controller = new LazyLoadController(tabId); // 創建 LazyLoadController 實例
      tabControllers.set(tabId, controller); // 添加一筆資料
    }

    // 其他的組件
    injectReactApp(tabId); // 載入 React
  }
});

// 添加頁面卸載監聽器：當頁面卸載時清理控制器
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabControllers.has(tabId)) {
    tabControllers.get(tabId).destroy();
    tabControllers.delete(tabId);
    console.log(`頁面關閉，銷毀懶加載控制器: ${tabId}`);
  }
});
