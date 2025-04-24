// 匯出懶加載觸發器函數
export function lazyLoadTrigger() {
  // ===== 配置項 =====
  const config = {
    interval: 3000, // 每次觸發間隔（毫秒）
    stepCount: 10, // 最多觸發幾次
    debug: true, // 是否輸出除錯訊息(影響到 utils 工具)
    useActualScroll: true, // 是否進行實際的滾動操作
    scrollAmount: 100, // 滾動的距離（像素）
    restoreDelay: 10, // 滾動後多久復原原來的位置（毫秒）
    detectUserScrolling: true, // 是否偵測使用者是否手動滾動
    userScrollPauseTime: 1500, // 使用者滾動後需等待的冷卻時間（毫秒）
  };

  // ===== 狀態管理 =====
  const state = {
    isUserScrolling: false, // 是否偵測到使用者在滾動中
    lastUserScrollTime: 0, // 最近一次使用者滾動的時間戳
    scrollTimer: null, // 偵測使用者停止滾動的 timer
    isScriptScrolling: false, // 是否目前是腳本觸發的滾動
    triggerInterval: null, // 主要的觸發 setInterval 控制器
  };

  // ===== 工具函數區塊 =====
  const utils = {
    // 日誌輸出（僅在 debug 模式下）
    log(message) {
      if (config.debug) console.log("[懶加載觸發器] " + message);
    },

    // 搜尋頁面上所有懶加載相關的圖片元素
    getLazyElements() {
      return document.querySelectorAll(
        'img[data-src], img.lazy, img[loading="lazy"]'
      );
    },
  };

  // ===== 使用者滾動偵測功能區塊 =====
  const scrollDetection = {
    // 初始化事件監聽器來偵測使用者手動滾動
    setup() {
      if (!config.detectUserScrolling) return; // 如果不需要偵測使用者滾動，則直接返回

      utils.log("啟用使用者滾動偵測");

      // 監聽 scroll 事件
      window.addEventListener(
        "scroll",
        () => {
          // 如果目前不是腳本觸發的滾動
          if (!state.isScriptScrolling) {
            // 使用者觸發的滾動才紀錄
            state.isUserScrolling = true;
            state.lastUserScrollTime = Date.now();

            // 重置偵測 timer
            clearTimeout(state.scrollTimer);
            state.scrollTimer = setTimeout(() => {
              state.isUserScrolling = false;
              utils.log("使用者已停止滾動");
            }, 150); // 若 150ms 內無滾動事件視為停止
          }
        },
        { passive: true }
      );

      // 手機觸控滾動
      window.addEventListener(
        "touchmove",
        () => {
          if (!state.isScriptScrolling) {
            state.isUserScrolling = true;
            state.lastUserScrollTime = Date.now();
          }
        },
        { passive: true }
      );
    },

    // 檢查是否可以由腳本進行滾動
    canPerformScroll() {
      if (!config.detectUserScrolling) return true;

      // 若使用者正在滾動，禁止腳本滾動
      if (state.isUserScrolling) {
        utils.log("使用者正在滾動，跳過實際滾動操作");
        return false;
      }

      // 若使用者剛剛滾動過，則等待一段冷卻時間
      const timeSinceLastScroll = Date.now() - state.lastUserScrollTime;
      if (timeSinceLastScroll < config.userScrollPauseTime) {
        utils.log(
          "使用者剛剛滾動過，還需等待 " +
            (config.userScrollPauseTime - timeSinceLastScroll) +
            "ms"
        );
        return false;
      }

      return true;
    },
  };

  // ===== 懶加載觸發邏輯 =====
  const lazyLoader = {
    // 主觸發方法
    triggerLazyLoad() {
      utils.log("觸發懶加載");

      // 記錄當前滾動位置以便還原
      const originalPosition =
        window.pageYOffset || document.documentElement.scrollTop;

      // 1. 模擬 scroll 事件（部分框架依賴此事件加載圖片）
      window.dispatchEvent(new Event("scroll"));

      // 2. 若有 LazyLoad 實例則調用其更新方法
      if (window.lazyLoadInstance) {
        try {
          window.lazyLoadInstance.update();
          utils.log("LazyLoad 實例已更新");
        } catch (e) {
          utils.log("LazyLoad 更新失敗: " + e.message);
        }
      }

      // 3. 手動派發自定義事件（部分頁面依賴）
      if (document.getElementById("main")) {
        try {
          const events = [
            "bills-loaded",
            "bills-list-loaded",
            "before-scrolling-to-page-bottom",
          ];
          events.forEach((event) => {
            document.getElementById("main").dispatchEvent(new Event(event));
          });
        } catch (e) {
          utils.log("觸發自定義事件失敗: " + e.message);
        }
      }

      // 4. 執行實際滾動操作（模擬用戶操作）
      if (config.useActualScroll && scrollDetection.canPerformScroll()) {
        this.performScroll(originalPosition);
      } else if (config.useActualScroll) {
        utils.log("跳過實際滾動，僅使用事件觸發");
      }
    },

    // 執行模擬滾動並還原原本位置
    performScroll(originalPosition) {
      try {
        state.isScriptScrolling = true; // 設置為腳本滾動狀態

        // 滾動一定距離
        window.scrollBy({
          top: config.scrollAmount, // 滾動的距離
          behavior: "auto", // 滾動行為
        });

        // 延遲後滾回原位
        setTimeout(() => {
          window.scrollTo({
            top: originalPosition, // 滾回原來的位置
            behavior: "auto", // 滾動行為
          });

          // 滾回後設定為非腳本滾動狀態
          setTimeout(() => {
            state.isScriptScrolling = false; // 設置為非腳本滾動狀態
          }, 50);
        }, config.restoreDelay);
      } catch (e) {
        state.isScriptScrolling = false;
        utils.log("滾動操作失敗: " + e.message);
      }
    },
  };

  // ===== 控制器（start/stop） =====
  const controller = {
    // 啟動主流程
    start() {
      utils.log("開始執行懶加載觸發 (每3秒觸發一次)");

      const initialElements = utils.getLazyElements(); // 獲取所有可能的懶加載元素
      utils.log("發現 " + initialElements.length + " 個可能的懶加載元素");

      scrollDetection.setup(); // 設置滾動偵測

      let counter = 0; // 計數器
      state.triggerInterval = setInterval(() => {
        counter++;
        utils.log("執行第 " + counter + "/" + config.stepCount + " 次觸發");

        lazyLoader.triggerLazyLoad();

        // 若次數達到上限，則停止觸發
        if (counter >= config.stepCount) {
          this.stop();
          const finalElements = utils.getLazyElements();
          utils.log(
            "最終還有 " + finalElements.length + " 個未加載的懶加載元素"
          );
        }
      }, config.interval);
    },

    // 停止主流程
    stop() {
      if (state.triggerInterval) {
        clearInterval(state.triggerInterval);
        state.triggerInterval = null;
        utils.log("懶加載觸發已停止");
      }
    },
  };

  // ===== 初始化流程 =====
  utils.log("懶加載觸發腳本已加載");

  if (document.readyState === "complete") {
    utils.log("頁面已加載完成，立即開始");
    setTimeout(() => controller.start(), 500); // 延遲 0.5 秒開始
  } else {
    utils.log("等待頁面加載完成...");
    window.addEventListener("load", () => {
      utils.log("頁面加載完成，開始執行");
      setTimeout(() => controller.start(), 500); // 延遲 0.5 秒開始
    });
  }

  // ===== 提供全域控制介面 =====
  window.lazyLoadControl = {
    start: () => controller.start(),
    stop: () => controller.stop(),
  };
}
