// React组件注入器 - 不使用ES模块语法
console.log('React组件注入器已加载');

// 创建挂载点
function createMountPoint() {
  const mountElement = document.createElement('div');
  mountElement.id = 'chat-extension-root';
  document.body.appendChild(mountElement);
  return mountElement;
}

// 加载React应用
function loadReactApp() {
  // 加载CSS文件
  const cssFiles = ['app.css']; // 使用app.css
  cssFiles.forEach(file => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('assets/' + file);
    link.onload = function() {
      console.log('CSS文件已加载:', file);
    };
    link.onerror = function(error) {
      console.error('加载CSS文件失败:', file, error);
    };
    document.head.appendChild(link);
  });

  // 创建script标签加载React应用
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('app.js'); // 使用app.js 
  script.type = 'module'; // 设置为模块类型
  script.onload = function() {
    console.log('React应用已加载');
  };
  script.onerror = function(error) {
    console.error('加载React应用失败:', error);
  };
  document.body.appendChild(script);
  
  // 监听来自popup的消息
  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('收到来自popup的消息:', message);
      if (message.action === "toggleChat") {
        // 通过事件将消息传递给React应用
        document.dispatchEvent(new CustomEvent('toggle-chat'));
        sendResponse({success: true});
      }
      return true;
    });
  }
}

// 等待DOM完全加载后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    createMountPoint();
    loadReactApp();
  });
} else {
  createMountPoint();
  loadReactApp();
} 