// public/content.js
// 這個檔案是撰寫注入到目標頁面中的腳本
// 這個檔案的任務是：
// 1. 定義 LazyLoader 類別
// 2. 在 window 上設置 LazyLoader 類別
// 3. 清理舊的 LazyLoader 實例
// 4. 設置消息監聽器

if (!window.__LAZYLOAD_INSTALLED__) {
  window.__LAZYLOAD_INSTALLED__ = true;

  // 防止 LazyLoader 重複定義
  if (!window.LazyLoader) {
    class LazyLoader {
      constructor(config) {
        // 配置項
        this.config = {
          interval: config.interval || 3000,
          stepCount: config.stepCount || 10,
          debug: config.debug || true,
          useActualScroll: true,
          scrollAmount: 100,
          restoreDelay: 10,
          detectUserScrolling: true,
          userScrollPauseTime: 1500,
        };

        // 狀態管理
        this.state = {
          isUserScrolling: false,
          lastUserScrollTime: 0,
          scrollTimer: null,
          isScriptScrolling: false,
          triggerInterval: null,
          active: false,
        };

        this.handleScrollBound = this.handleUserScroll.bind(this);
        this.setupEventListeners();
      }

      // 日誌輸出
      log(message) {
        if (this.config.debug) console.log("[懶加載觸發器] " + message);
      }

      // 搜尋懶加載元素
      getLazyElements() {
        return document.querySelectorAll(
          'img[data-src], img.lazy, img[loading="lazy"]'
        );
      }

      // 設置事件監聽器
      setupEventListeners() {
        if (!this.config.detectUserScrolling) return;

        this.log("啟用使用者滾動偵測");

        // 設置中止控制器
        this.state.abortController = new AbortController();
        const abortSignal = this.state.abortController.signal;

        // 監聽滾動事件
        window.addEventListener(
          "scroll",
          (event) => {
            if (!this.state.isScriptScrolling) {
              this.state.isUserScrolling = true;
              this.state.lastUserScrollTime = Date.now();

              clearTimeout(this.state.scrollTimer);
              this.state.scrollTimer = setTimeout(() => {
                this.state.isUserScrolling = false;
                this.log("使用者已停止滾動");
              }, 150);
            }
          },
          {
            passive: true,
            signal: abortSignal,
          }
        );

        // 監聽手機觸控滾動
        window.addEventListener(
          "touchmove",
          () => {
            if (!this.state.isScriptScrolling) {
              this.state.isUserScrolling = true;
              this.state.lastUserScrollTime = Date.now();
            }
          },
          {
            passive: true,
            signal: abortSignal,
          }
        );

        // 監聽擴充套件訊息
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === "STOP_LAZY_LOAD") {
            this.stop();
          }
        });
      }

      // 檢查是否可以執行滾動
      canPerformScroll() {
        if (!this.config.detectUserScrolling) return true;

        if (this.state.isUserScrolling) {
          this.log("使用者正在滾動，跳過實際滾動操作");
          return false;
        }

        const timeSinceLastScroll = Date.now() - this.state.lastUserScrollTime;
        if (timeSinceLastScroll < this.config.userScrollPauseTime) {
          this.log(
            "使用者剛剛滾動過，還需等待 " +
              (this.config.userScrollPauseTime - timeSinceLastScroll) +
              "ms"
          );
          return false;
        }

        return true;
      }

      // 觸發懶加載
      triggerLazyLoad() {
        this.log("觸發懶加載");

        const originalPosition =
          window.pageYOffset || document.documentElement.scrollTop;

        // 1. 模擬滾動事件
        window.dispatchEvent(new Event("scroll"));

        // 2. 更新LazyLoad實例
        if (window.lazyLoadInstance) {
          try {
            window.lazyLoadInstance.update();
            this.log("LazyLoad 實例已更新");
          } catch (e) {
            this.log("LazyLoad 更新失敗: " + e.message);
          }
        }

        // 3. 派發自定義事件
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
            this.log("觸發自定義事件失敗: " + e.message);
          }
        }

        // 4. 執行實際滾動
        if (this.config.useActualScroll && this.canPerformScroll()) {
          this.performScroll(originalPosition);
        } else if (this.config.useActualScroll) {
          this.log("跳過實際滾動，僅使用事件觸發");
        }
      }

      // 執行滾動操作
      performScroll(originalPosition) {
        try {
          this.state.isScriptScrolling = true;

          // 滾動一定距離
          window.scrollBy({
            top: this.config.scrollAmount,
            behavior: "auto",
          });

          // 延遲後滾回原位
          setTimeout(() => {
            window.scrollTo({
              top: originalPosition,
              behavior: "auto",
            });

            // 滾回後設定狀態
            setTimeout(() => {
              this.state.isScriptScrolling = false;
            }, 50);
          }, this.config.restoreDelay);
        } catch (e) {
          this.state.isScriptScrolling = false;
          this.log("滾動操作失敗: " + e.message);
        }
      }

      // 啟動懶加載
      start() {
        this.log(
          "開始執行懶加載觸發 (每" + this.config.interval + "毫秒觸發一次)"
        );

        const initialElements = this.getLazyElements();
        this.log("發現 " + initialElements.length + " 個可能的懶加載元素");

        this.state.active = true;
        let counter = 0;

        // 設置觸發定時器
        this.state.triggerInterval = setInterval(() => {
          counter++;
          this.log(
            "執行第 " + counter + "/" + this.config.stepCount + " 次觸發"
          );

          this.triggerLazyLoad();

          // 若達到上限次數則停止
          if (counter >= this.config.stepCount) {
            this.stop();
            const finalElements = this.getLazyElements();
            this.log(
              "最終還有 " + finalElements.length + " 個未加載的懶加載元素"
            );
          }
        }, this.config.interval);
      }

      // 停止懶加載
      stop() {
        if (!this.state.active) return;

        if (this.state.triggerInterval) {
          clearInterval(this.state.triggerInterval);
          this.state.triggerInterval = null;
        }

        if (this.state.abortController) {
          this.state.abortController.abort();
        }

        // 清理所有計時器
        if (this.state.scrollTimer) {
          clearTimeout(this.state.scrollTimer);
        }

        this.state.active = false;
        this.log("懶加載觸發已停止");
      }

      // 用戶滾動處理（保留因為現有代碼中使用了這個方法）
      handleUserScroll() {
        if (!this.state.active || this.state.isScriptScrolling) return;

        this.state.isUserScrolling = true;
        this.state.lastUserScrollTime = Date.now();

        clearTimeout(this.state.scrollTimer);
        this.state.scrollTimer = setTimeout(() => {
          this.state.isUserScrolling = false;
          this.log("使用者已停止滾動");
        }, 150);
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "INIT_LAZY_LOAD") {
      if (window.lazyLoader) {
        window.lazyLoader.stop();
        delete window.lazyLoader;
      }

      if (message.config?.interval && message.config?.stepCount) {
        window.lazyLoader = new window.LazyLoader(message.config);
        window.lazyLoader.start();
        sendResponse({ success: true }); // 添加這行來回應
      } else {
        console.error("Invalid config received:", message);
        sendResponse({ success: false }); // 添加這行來回應錯誤
      }
      return true; // 表示會非同步回應
    }
  });
}
