// public/popup.js

// DOMContentLoaded 事件是在 DOM 結構被完整的讀取跟解析後就會被觸發

// 确保 popup 的 DOM 完全加载后再执行操作
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("lazyLoadToggle"); // 切換按鈕的元素標籤

  // // chrome.runtime.sendMessage 是跨组件通信的核心 API
  // // 向 background 傳送 GET_LAZY_LOAD_STATUS 訊息
  // chrome.runtime.sendMessage({ type: "GET_LAZY_LOAD_STATUS" }, (response) => {
  //   toggle.checked = response.enabled; // 更新狀態
  // });

  // 添加存储监听实现实时同步
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.isLazyLoadEnabled) {
      toggle.checked = changes.isLazyLoadEnabled.newValue;
    }
  });

  // 換成从存储获取初始状态
  chrome.storage.local.get("isLazyLoadEnabled", (data) => {
    toggle.checked = !!data.isLazyLoadEnabled;
  });

  // 監聽切換事件，如果 toggle 狀態改變，傳遞訊息 => 更新狀態
  toggle.addEventListener("change", () => {
    // chrome.runtime => 擴充套件本身的事件或訊息，現在這個傳遞訊息
    chrome.runtime.sendMessage(
      { type: "TOGGLE_LAZY_LOAD", enabled: toggle.checked },
      // (response) => {
      //   if (response.success) {
      //     console.log("懶加載狀態已更新");
      //   }
      // }

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
