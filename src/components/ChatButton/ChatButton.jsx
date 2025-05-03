// src/components/ChatButton/ChatButton.jsx
import React, { useState, forwardRef, useImperativeHandle } from "react";
import ChatWindow from "../ChatWindow/ChatWindow"; // 引入新的 ChatWindow 組件
import "./ChatButton.css";

const ChatButton = forwardRef((props, ref) => {
  const imageSrc = chrome.runtime.getURL("helloboy.png"); // 圖片
  const [isOpen, setIsOpen] = useState(false); // 控制聊天窗口的打開和關閉

  // 儲存找到的數據的狀態
  // const [foundData, setFoundData] = useState([]);

  // 定义 toggleChat 函数
  const toggleChat = () => {
    setIsOpen(!isOpen);
    console.log("聊天窗口状态切换:", !isOpen ? "打开" : "关闭");
  };

  // 将 toggleChat 方法暴露给父组件
  useImperativeHandle(ref, () => ({
    toggleChat,
  }));

  return (
    <div className="chat-container">
      {/* 使用圖片作為按鈕 */}
      <button className="chat-button" onClick={toggleChat} title="打开聊天窗口">
        <img
          src={imageSrc} // 圖片的路徑
          alt="聊天按鈕"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </button>

      {/* 使用新的 ChatWindow 組件 */}
      {isOpen && <ChatWindow onClose={toggleChat} />}
    </div>
  );
});

export default ChatButton;
