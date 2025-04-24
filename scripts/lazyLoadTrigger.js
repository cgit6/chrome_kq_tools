export function lazyLoadTrigger() {
  // ===== 配置项 =====
  const config = {
    interval: 3000, // 触发间隔（毫秒）
    stepCount: 10, // 触发总次数
    debug: true, // 是否打印日志
    useActualScroll: true, // 是否使用实际滚动
    scrollAmount: 100, // 滚动距离
    restoreDelay: 10, // 恢复位置延迟
    detectUserScrolling: true, // 是否检测用户滚动
    userScrollPauseTime: 1500, // 用户滚动后暂停时间
  };

  // ===== 状态管理 =====
  const state = {
    isUserScrolling: false,
    lastUserScrollTime: 0,
    scrollTimer: null,
    isScriptScrolling: false,
    triggerInterval: null,
  };

  // ===== 工具函数 =====
  const utils = {
    log(message) {
      if (config.debug) console.log("[懒加载触发器] " + message);
    },

    getLazyElements() {
      return document.querySelectorAll(
        'img[data-src], img.lazy, img[loading="lazy"]'
      );
    },
  };

  // ===== 滚动检测 =====
  const scrollDetection = {
    setup() {
      if (!config.detectUserScrolling) return;

      utils.log("启用用户滚动检测");

      window.addEventListener(
        "scroll",
        () => {
          if (!state.isScriptScrolling) {
            state.isUserScrolling = true;
            state.lastUserScrollTime = Date.now();

            clearTimeout(state.scrollTimer);
            state.scrollTimer = setTimeout(() => {
              state.isUserScrolling = false;
              utils.log("用户已停止滚动");
            }, 150);
          }
        },
        { passive: true }
      );

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

    canPerformScroll() {
      if (!config.detectUserScrolling) return true;

      if (state.isUserScrolling) {
        utils.log("用户正在滚动，跳过实际滚动操作");
        return false;
      }

      const timeSinceLastScroll = Date.now() - state.lastUserScrollTime;
      if (timeSinceLastScroll < config.userScrollPauseTime) {
        utils.log(
          "用户刚刚滚动过，还需等待" +
            (config.userScrollPauseTime - timeSinceLastScroll) +
            "ms"
        );
        return false;
      }

      return true;
    },
  };

  // ===== 懒加载触发器 =====
  const lazyLoader = {
    triggerLazyLoad() {
      utils.log("触发懒加载");

      const originalPosition =
        window.pageYOffset || document.documentElement.scrollTop;

      // 1. 触发scroll事件
      window.dispatchEvent(new Event("scroll"));

      // 2. 更新LazyLoad实例
      if (window.lazyLoadInstance) {
        try {
          window.lazyLoadInstance.update();
          utils.log("LazyLoad实例已更新");
        } catch (e) {
          utils.log("LazyLoad更新失败: " + e.message);
        }
      }

      // 3. 触发特定事件
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
          utils.log("触发特定事件失败: " + e.message);
        }
      }

      // 4. 执行实际滚动
      if (config.useActualScroll && scrollDetection.canPerformScroll()) {
        this.performScroll(originalPosition);
      } else if (config.useActualScroll) {
        utils.log("跳过实际滚动，仅使用事件触发");
      }
    },

    performScroll(originalPosition) {
      try {
        state.isScriptScrolling = true;

        window.scrollBy({
          top: config.scrollAmount,
          behavior: "auto",
        });

        setTimeout(() => {
          window.scrollTo({
            top: originalPosition,
            behavior: "auto",
          });

          setTimeout(() => {
            state.isScriptScrolling = false;
          }, 50);
        }, config.restoreDelay);
      } catch (e) {
        state.isScriptScrolling = false;
        utils.log("滚动操作失败: " + e.message);
      }
    },
  };

  // ===== 主控制器 =====
  const controller = {
    start() {
      utils.log("开始执行懒加载触发 (每3秒触发一次)");

      const initialElements = utils.getLazyElements();
      utils.log("发现" + initialElements.length + "个可能的懒加载元素");

      scrollDetection.setup();

      let counter = 0;
      state.triggerInterval = setInterval(() => {
        counter++;
        utils.log("执行第 " + counter + "/" + config.stepCount + " 次触发");

        lazyLoader.triggerLazyLoad();

        if (counter >= config.stepCount) {
          this.stop();
          const finalElements = utils.getLazyElements();
          utils.log("最终还有" + finalElements.length + "个未加载的懒加载元素");
        }
      }, config.interval);
    },

    stop() {
      if (state.triggerInterval) {
        clearInterval(state.triggerInterval);
        state.triggerInterval = null;
        utils.log("懒加载触发已停止");
      }
    },
  };

  // ===== 初始化 =====
  utils.log("懒加载触发脚本已加载");

  if (document.readyState === "complete") {
    utils.log("页面已加载完成，立即开始");
    setTimeout(() => controller.start(), 500);
  } else {
    utils.log("等待页面加载完成...");
    window.addEventListener("load", () => {
      utils.log("页面加载完成，开始执行");
      setTimeout(() => controller.start(), 500);
    });
  }

  // ===== 导出控制接口 =====
  window.lazyLoadControl = {
    start: () => controller.start(),
    stop: () => controller.stop(),
  };
}
