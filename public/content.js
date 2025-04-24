// public/content.js
// 這個檔案是撰寫注入到目標頁面中的腳本

if (!window.__LAZYLOAD_INSTALLED__) {
  window.__LAZYLOAD_INSTALLED__ = true;

  // 防止 LazyLoader 重複定義
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
        this.handleScrollBound = this.handleUserScroll.bind(this); // 我記得在這邊用 bind 是一個技巧
        this.setupEventListeners();
      }

      // =============== 工具 ===============

      // 相關方法

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
        this.intervalCheck = setInterval(() => {
          if (this.state.active) return;

          this.state.active = true;
          let counter = 0;

          const intervalId = setInterval(() => {
            if (++counter > this.config.stepCount) {
              this.stop();
              return;
            }
            this.triggerLazyLoad();
          }, this.config.interval);

          this.state.intervalId = intervalId;
        }, 1000);
      }

      stop() {
        if (!this.state.active) return;

        window.removeEventListener("scroll", this.handleScrollBound);
        clearInterval(this.state.intervalId);
        clearInterval(this.intervalCheck);
        this.state.scrollTimeouts.forEach(clearTimeout);

        if (this.state.abortController) {
          this.state.abortController.abort();
        }

        this.state = {
          active: false,
          scrollTimeouts: new Set(),
          abortController: null,
          intervalId: null,
        };
      }

      // ❗ 要改
      triggerLazyLoad() {
        console.log("🔁 觸發懶加載...");

        const originalPosition =
          window.pageYOffset || document.documentElement.scrollTop;

        // 1. 觸發 scroll 事件
        window.dispatchEvent(new Event("scroll"));

        // 2. 嘗試更新 lazyLoadInstance（如有）
        if (window.lazyLoadInstance) {
          try {
            window.lazyLoadInstance.update();
            console.log("✅ LazyLoad 實例已更新");
          } catch (e) {
            console.log("❌ LazyLoad 更新失敗: " + e.message);
          }
        }

        // 3. 觸發頁面上的特定事件
        if (document.getElementById("main")) {
          try {
            const events = [
              "bills-loaded",
              "bills-list-loaded",
              "before-scrolling-to-page-bottom",
            ];
            events.forEach((event) => {
              document.getElementById("main").dispatchEvent(new Event(event));
              console.log(`📣 已觸發事件: ${event}`);
            });
          } catch (e) {
            console.log("❌ 觸發自定義事件失敗: " + e.message);
          }
        }

        // 4. 判斷是否應該執行實際滾動
        if (this.config.useActualScroll && this.canPerformScroll()) {
          this.performScroll(originalPosition);
        } else if (this.config.useActualScroll) {
          console.log("⏩ 偵測到使用者正在操作，跳過實際滾動");
        }
      }

      // ❗ 要改
      handleUserScroll() {
        console.log("🔁 使用者正在滾動...");

        if (!this.state.active || this.state.isScriptScrolling) return;

        this.state.isUserScrolling = true;
        this.state.lastUserScrollTime = Date.now(); // 當前時間

        console.log("🖱️ 使用者正在滾動中...");

        clearTimeout(this.state.scrollTimer);
        this.state.scrollTimer = setTimeout(() => {
          this.state.isUserScrolling = false;
          console.log("✅ 使用者已停止滾動");
        }, 150);
      }

      // 添加其他功能...
    }

    window.LazyLoader = LazyLoader;
  }

  // 清理旧实例
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
