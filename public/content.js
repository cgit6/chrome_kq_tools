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

      triggerLazyLoad() {
        // ... 實作你的 lazy load 行為 ...
        console.log("Lazy load triggered");
      }

      handleUserScroll() {
        // ... 實作你的滾動行為 ...
        console.log("User scrolled");
      }
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
