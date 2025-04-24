// 直接注入的内容脚本
console.log('直接注入脚本已加载');

// 创建样式
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .simple-chat-button {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background-color: #4a86e8;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      transition: all 0.3s ease;
    }
    
    .simple-chat-button:hover {
      background-color: #3a76d8;
      transform: scale(1.1);
    }
    
    .simple-chat-window {
      position: fixed;
      bottom: 110px;
      right: 30px;
      width: 320px;
      height: 450px;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      display: none;
      flex-direction: column;
    }
    
    .simple-chat-window.open {
      display: flex;
    }
    
    .simple-chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: #4a86e8;
      color: white;
    }
    
    .simple-chat-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .simple-close-button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
    }
    
    .simple-chat-content {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      background-color: #f8f9fa;
    }
  `;
  document.head.appendChild(style);
}

// 创建聊天按钮和窗口
function createChatElements() {
  // 创建聊天按钮
  const chatButton = document.createElement('button');
  chatButton.className = 'simple-chat-button';
  chatButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(chatButton);
  
  // 创建聊天窗口
  const chatWindow = document.createElement('div');
  chatWindow.className = 'simple-chat-window';
  chatWindow.innerHTML = `
    <div class="simple-chat-header">
      <h3>聊天窗口</h3>
      <button class="simple-close-button">×</button>
    </div>
    <div class="simple-chat-content">
      <p>聊天窗口内容区域</p>
      <p>扩展已成功加载!</p>
    </div>
  `;
  document.body.appendChild(chatWindow);
  
  // 切换聊天窗口显示/隐藏
  chatButton.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    console.log('聊天窗口已切换状态');
  });
  
  // 关闭按钮功能
  const closeButton = chatWindow.querySelector('.simple-close-button');
  closeButton.addEventListener('click', () => {
    chatWindow.classList.remove('open');
    console.log('聊天窗口已关闭');
  });
  
  // 监听来自popup的消息
  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('收到消息:', message);
      if (message.action === "toggleChat") {
        chatWindow.classList.toggle('open');
        sendResponse({success: true});
      }
      return true;
    });
  }
}

// 执行初始化
function initialize() {
  console.log('开始初始化简单聊天按钮');
  try {
    addStyles();
    createChatElements();
    console.log('聊天按钮已成功创建');
  } catch (error) {
    console.error('创建聊天按钮时出错:', error);
  }
}

// 等待DOM完全加载后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 