import React from "react";
import ExcelUploader from "../ExcelUploader/ExcelUploader";
import "./ChatWindow.css"; // 如果需要樣式，可以創建這個文件

const ChatWindow = ({ onClose }) => {
  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>視窗口</h3>
        <button className="close-button" onClick={onClose} title="关闭窗口">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="chat-content">
        <ExcelUploader />
      </div>
    </div>
  );
};

export default ChatWindow;
