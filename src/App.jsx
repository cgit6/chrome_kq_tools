import React from "react";
import { createRoot } from "react-dom/client";
import ChatButton from "./components/ChatButton/ChatButton";
import { DataProvider } from "./context/DataContext"; // 全局的狀態管理
import "./App.css";

// 控制台信息
console.log("React应用已加载");

// 全局变量用于存储组件引用
let chatButtonRef = null;

// 主应用组件
const App = () => {
  const buttonRef = React.useRef(null);

  // 将引用存储到全局变量
  React.useEffect(() => {
    chatButtonRef = buttonRef;
    console.log("聊天按钮组件已挂载");

    // 监听来自注入器的消息
    const handleToggleEvent = () => {
      if (buttonRef.current) {
        buttonRef.current.toggleChat();
      }
    };

    document.addEventListener("toggle-chat", handleToggleEvent);

    return () => {
      document.removeEventListener("toggle-chat", handleToggleEvent);
    };
  }, []);

  return (
    <DataProvider>
      <ChatButton ref={buttonRef} />
    </DataProvider>
  );
};

// 初始化React应用
const init = () => {
  const mountElement = document.getElementById("chat-extension-root");
  if (mountElement) {
    try {
      const root = createRoot(mountElement);
      root.render(<App />);
      console.log("React应用已渲染到挂载点");
    } catch (error) {
      console.error("渲染React应用时出错:", error);
    }
  } else {
    console.error("找不到挂载点: #chat-extension-root");
  }
};

// 延迟执行初始化，确保DOM完全加载
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // 给予一点延迟，确保挂载点已创建
  setTimeout(init, 100);
}
