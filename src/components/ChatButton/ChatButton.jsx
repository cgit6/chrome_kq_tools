// src/components/ChatButton/ChatButton.jsx
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import ExcelUploader from '../ExcelUploader/ExcelUploader';
import './ChatButton.css';

const ChatButton = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false); // 控制聊天窗口的打開和關閉

  // 定义 toggleChat 函数
  const toggleChat = () => {
    setIsOpen(!isOpen);
    console.log('聊天窗口状态切换:', !isOpen ? '打开' : '关闭');
  };

  // 将 toggleChat 方法暴露给父组件
  useImperativeHandle(ref, () => ({
    toggleChat
  }));

  return (
    <div className="chat-container">
      <button 
        className="chat-button"
        onClick={toggleChat}
        title="打开聊天窗口"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>聊天窗口</h3>
            <button className="close-button" onClick={toggleChat} title="关闭窗口">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="chat-content">
            <ExcelUploader />
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatButton;