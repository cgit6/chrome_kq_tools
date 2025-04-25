# Chrome 擴充套件功能概述

## 功能概述

這個 Chrome 擴充套件主要提供以下功能：

1. **懶加載觸發器**：自動觸發網頁上的懶加載功能，幫助加載圖片和其他資源，特別是針對 `jambolive.tv` 網站。
2. **用戶界面控制**：透過 popup 視窗提供一個簡單的開關，讓用戶可以啟用或禁用懶加載功能。
3. **React 注入**：將 React 應用注入到目標網頁中，提供更複雜的用戶界面和功能。

## 運作機制和工作流程

### 1. 狀態管理

- 使用 `chrome.storage.local` 存儲懶加載功能的開啟/關閉狀態。
- 在 `background.js` 中使用 `tabControllers` 映射表來管理每個標籤頁的懶加載控制器實例。

### 2. 使用者互動流程

1. **初始化**：
   - 當用戶打開擴充套件的 popup 視窗時，系統會從 `chrome.storage.local` 讀取懶加載功能的狀態。
   - 狀態會自動更新到 popup 界面上的切換開關。

2. **用戶操作**：
   - 用戶點擊開關，觸發 `change` 事件。
   - 事件處理函數發送 `TOGGLE_LAZY_LOAD` 消息到 background 腳本。

3. **背景處理**：
   - `background.js` 接收消息，更新存儲的狀態。
   - 如果啟用懶加載，創建 `LazyLoadController` 實例並保存到 `tabControllers` 映射表中。
   - 如果禁用懶加載，調用控制器的 `destroy` 方法並從映射表中刪除。

### 3. 頁面載入流程

1. **標籤頁更新檢測**：
   - 監聽 `chrome.tabs.onUpdated` 事件，檢測當標籤頁完成載入時。
   - 如果載入的是 `jambolive.tv` 網站，且懶加載功能已啟用，創建懶加載控制器。

2. **注入腳本**：
   - `LazyLoadController` 的 `injectScript` 方法將 `content.js` 注入到目標頁面。
   - 注入完成後發送 `INIT_LAZY_LOAD` 消息，傳遞配置參數。

3. **內容腳本初始化**：
   - `content.js` 接收初始化消息，創建 `LazyLoader` 實例。
   - 開始監聽滾動事件並設置定時器，定期觸發懶加載。

4. **懶加載觸發**：
   - `triggerLazyLoad` 方法：
     1. 模擬滾動事件
     2. 更新 `lazyLoadInstance`（如果存在）
     3. 派發自定義事件
     4. 執行實際滾動（如果配置允許且用戶當前沒有滾動）

### 4. 組件間通信流程

1. **Popup → Background**：
   - 使用 `chrome.runtime.sendMessage` 發送消息。
   - 主要消息類型：`GET_LAZY_LOAD_STATUS` 和 `TOGGLE_LAZY_LOAD`。

2. **Background → Content**：
   - 使用 `chrome.tabs.sendMessage` 發送消息到特定標籤頁。
   - 主要消息類型：`INIT_LAZY_LOAD` 和 `STOP_LAZY_LOAD`。

3. **狀態同步**：
   - 使用 `chrome.storage.onChanged` 監聽存儲變化，實時更新 UI。

## 使用的技術

1. **Chrome Extension API**：
   - `chrome.runtime`：管理擴充套件生命週期和組件間通信。
   - `chrome.tabs`：控制瀏覽器標籤頁。
   - `chrome.storage`：存儲和管理數據。
   - `chrome.scripting`：在目標頁面中注入腳本和CSS。

2. **JavaScript 類與面向對象編程**：
   - 使用 `LazyLoadController` 和 `LazyLoader` 類來封裝功能。
   - 採用 constructor-method 模式來組織代碼。

3. **事件驅動模式**：
   - 使用事件監聽器（如 `DOMContentLoaded`、`scroll`）來觸發相應的操作。
   - 使用消息傳遞（message passing）實現組件間的通信。

4. **異步編程**：
   - 使用 `Promise` 和回調函數處理異步操作。
   - 使用 `setTimeout` 和 `setInterval` 控制時間相關的操作。

5. **DOM 操作**：
   - 創建和操作 DOM 元素。
   - 派發自定義事件。

6. **React**：
   - 使用 React 構建複雜的 UI 組件，並注入到目標頁面中。

7. **CSS**：
   - 使用現代 CSS 技術（如 flexbox、transition）創建 UI 元素。

## 總結

這個擴充套件利用 Chrome Extension API 實現了一個懶加載功能，專為 `jambolive.tv` 網站設計。它通過注入腳本和 React 應用增強網站功能，並提供簡單的用戶界面讓用戶控制懶加載功能的開啟和關閉。整個系統採用事件驅動和消息傳遞機制，實現了不同組件之間的協調和通信。

---

現在在實際的測試當中，我打開"启用懒加载触发器" 後重新整理，這個功能就不會被執行了，要先關閉再打開才會執行，這是為什麼，以及怎麼修正他

### 問題原因
檢查了您的代碼，這個問題主要是由於 tabControllers 映射表未能在頁面刷新時正確管理導致的。當您開啟開關然後重新整理頁面時，系統會檢測到 isEnabled 為 true，但在檢測 tabControllers.has(tabId) 時可能出現了錯誤判斷。
具體來說，頁面刷新時應該重新創建控制器，而不僅僅是檢查它是否存在。

修改 background.js 中的 onUpdated 監聽器，確保在頁面加載完成時總是重新創建控制器

### 進一步優化
1.添加頁面卸載監聽器：當頁面卸載時清理控制器
2.改進 LazyLoadController 的 injectScript 方法：確保在注入腳本後確認操作成功
3.在 content.js 中回應初始化消息：

這些修改應該能解決您的問題，確保在頁面重新整理後懶加載功能仍能正常執行。核心改變是每次頁面加載完成時，無論 tabControllers 中是否已有控制器，都先清理再重新創建，確保控制器是最新的且與當前頁面匹配的。


### 上傳資料比對

功能描述:
資料會開始進行比對，然後如果有這筆資料就對那個表格的 check box 進行打勾，然後再主畫面的資料清單旁邊顯示圖樣，最後才顯示整個比對的結果清單(如果最後的結果清單顯示出來那右下角的小視窗就要關閉) 

### 獲取輸出的檔案
比對完了之後彈出視窗點選確定，點擊