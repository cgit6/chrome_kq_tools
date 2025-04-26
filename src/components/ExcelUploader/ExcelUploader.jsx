import React, { useState, useEffect } from "react";
import "./ExcelUploader.css";
import * as XLSX from "xlsx"; // 需要先安裝: npm install xlsx

const REQUIRED_COLUMNS = {
  fbAccount: ["FB帳號", "fb帳號", "Facebook帳號", "facebook帳號"],
  paymentId: ["付款單號", "付款編號", "支付編號", "付款ID", "支付ID"],
};

const findColumnName = (headers, possibleNames) => {
  return headers.find((header) =>
    possibleNames.some(
      (name) => header.trim().toLowerCase() === name.toLowerCase()
    )
  );
};

// 找到當前頁面清單中的所有付款單號訊息
function findPaymentIdInPage() {
  // 查找含有 data-target="bills-loader.container" 的 tbody
  const tbody = document.querySelector(
    'tbody[data-target="bills-loader.container"]'
  );

  if (!tbody) {
    console.log("未找到目標tbody元素");
    return null; // 返回空元素
  }

  // 獲取所有tr行
  const rows = tbody.querySelectorAll("tr");
  let targetButton = null; // 目標按紐
  let targetRow = null; // 目標行

  const results = []; // 儲存結果

  // 遍歷每一筆資料
  rows.forEach((row, index) => {
    // 找到該行中所有含有 class="align-c" 的 p 標籤
    const alignCenterPs = row.querySelectorAll("td p.align-c");

    if (alignCenterPs.length > 0) {
      // 收集每個p標籤的文本
      const textsInRow = Array.from(alignCenterPs).map(
        (p) => p.textContent.trim() // 去除前後空白
      );
      results.push({
        rowIndex: index + 1, // 行數
        texts: textsInRow, // 付款單號
      });

      console.log(
        `行 ${index + 1}: 找到 ${textsInRow.length} 個符合條件的元素`
      );
      console.log(`內容: ${textsInRow.join(", ")}`);
    }
  });

  console.log(`總共在 ${results.length} 行中找到符合條件的元素`);
  return results;
}

// 在頁面上查找商品名稱
const findProductNameInPage = () => {
  // 找到包含付款單號的行
  const tbody = document.querySelector(
    'tbody[data-target="bills-loader.container"]'
  );

  if (!tbody) {
    console.log("未找到目標tbody元素");
    return null;
  }

  const rows = tbody.querySelectorAll(
    'tr td div.product-edit-tool button[title="訂單明細"]'
  ); // 獲取所有行

  console.log("rows: ", button);
  // 找到對應的按鈕
  // let targetButton = null;
  // let targetRow = null;
  // }

  // 儲存當前彈出窗口的處理函數
  // const originalDialogHandler = window.onDialogOpen;

  // 創建一個 Promise 來等待彈出窗口並獲取數據
  // return new Promise((resolve) => {
  //   // 設置一個標誌，表示我們的處理函數已被調用
  //   let handlerCalled = false;

  //   // 監聽彈出窗口
  //   window.onDialogOpen = function (dialog) {
  //     // 防止重複調用
  //     if (handlerCalled) return;
  //     handlerCalled = true;

  //     console.log("彈出窗口已打開，開始獲取商品名稱");

  //     // 給彈出窗口一點時間完全加載
  //     setTimeout(() => {
  //       try {
  //         // 獲取彈出窗口中的商品名稱
  //         const productNameElement =
  //           dialog.querySelector(".product-name") ||
  //           dialog.querySelector(".item-name") ||
  //           dialog.querySelector(".product-title");

  //         let productName = null;
  //         if (productNameElement) {
  //           productName = productNameElement.textContent.trim();
  //           console.log(`成功獲取商品名稱: ${productName}`);
  //         } else {
  //           console.log("未在彈出窗口中找到商品名稱元素");
  //         }

  //         // 關閉彈出窗口
  //         const closeButton =
  //           dialog.querySelector(".close-button") ||
  //           dialog.querySelector(".modal-close") ||
  //           dialog.querySelector("[data-dismiss='modal']");

  //         if (closeButton) {
  //           closeButton.click();
  //           console.log("已關閉彈出窗口");
  //         }

  //         // 恢復原始處理函數
  //         window.onDialogOpen = originalDialogHandler;

  //         // 返回商品名稱
  //         resolve(productName);
  //       } catch (error) {
  //         console.error("獲取商品名稱時發生錯誤:", error);
  //         // 恢復原始處理函數
  //         window.onDialogOpen = originalDialogHandler;
  //         resolve(null);
  //       }
  //     }, 1000); // 等待1秒確保彈出窗口完全加載
  // };

  //   // 模擬點擊按鈕
  //   console.log("點擊訂單明細按鈕");
  //   targetButton.click();

  //   // 設置超時，以防彈出窗口沒有打開
  //   setTimeout(() => {
  //     if (!handlerCalled) {
  //       console.log("彈出窗口未打開，可能需要其他方式獲取商品名稱");
  //       window.onDialogOpen = originalDialogHandler;
  //       resolve(null);
  //     }
  //   }, 5000); // 5秒超時
  // });
};

// 獲取商品名稱訊息
function findProductName() {}

const ExcelUploader = () => {
  const [file, setFile] = useState(null); // 選擇的文件
  const [uploading, setUploading] = useState(false); // 上傳中
  const [excelData, setExcelData] = useState([]); // 存儲處理後的數據
  const [error, setError] = useState(""); // 錯誤訊息
  const [currentIndex, setCurrentIndex] = useState(0); // 當前處理的索引
  const [isProcessing, setIsProcessing] = useState(false); // 是否正在處理數據
  const [searchAttempts, setSearchAttempts] = useState(0); // 查找嘗試次數
  const [statusMessage, setStatusMessage] = useState(""); // 狀態訊息

  const processExcelFile = async (file) => {
    try {
      if (!file) {
        throw new Error("請選擇一個檔案");
      }

      if (!file.name.match(/\.(xlsx|xls)$/)) {
        throw new Error("請上傳 Excel 檔案 (.xlsx 或 .xls)");
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (data.length < 2) {
        throw new Error("Excel 檔案必須包含標題行和至少一行數據");
      }

      const headers = data[0].map((header) => String(header).trim());
      const fbAccountColumn = findColumnName(
        headers,
        REQUIRED_COLUMNS.fbAccount
      );
      const paymentIdColumn = findColumnName(
        headers,
        REQUIRED_COLUMNS.paymentId
      );

      if (!fbAccountColumn || !paymentIdColumn) {
        throw new Error("Excel 檔案必須包含 FB帳號 和 付款單號 欄位");
      }

      const fbAccountIndex = headers.indexOf(fbAccountColumn);
      const paymentIdIndex = headers.indexOf(paymentIdColumn);

      const processedRows = data
        .slice(1)
        .map((row) => ({
          fbAccount: String(row[fbAccountIndex] || "").trim(),
          paymentId: String(row[paymentIdIndex] || "").trim(),
        }))
        .filter((row) => row.fbAccount && row.paymentId);

      if (processedRows.length === 0) {
        throw new Error("沒有找到有效的數據行");
      }

      // console.log("處理後的數據:", processedRows);
      return processedRows;
    } catch (err) {
      console.error("處理 Excel 檔案時發生錯誤:", err);
      throw err;
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setCurrentIndex(0);
      setExcelData([]);
      setSearchAttempts(0);
      setStatusMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("請先選擇檔案");
      return;
    }

    setUploading(true);
    try {
      const processedData = await processExcelFile(file);
      // 儲存處理後的數據
      setExcelData(processedData);
      setError("");
      setCurrentIndex(0);
      setSearchAttempts(0);
      // 開始自動處理
      setIsProcessing(true);
      setStatusMessage("開始查找付款單號...");
    } catch (error) {
      console.error("處理檔案失敗:", error);
      setError(error.message || "處理檔案時發生錯誤");
      setExcelData([]);
    } finally {
      setUploading(false);
    }
  };

  // 處理一筆數據
  const processOneItem = async (item) => {
    try {
      const productName = findProductNameInPage(); // 測試用的等下要刪掉
      setStatusMessage(
        `正在查找付款單號: ${item.paymentId} (嘗試次數: ${searchAttempts + 1})`
      );

      // 檢查付款單號是否存在於頁面中
      const paymentInfos = findPaymentIdInPage(); // 找到當前頁面清單中的所有付款單號訊息
      let found = false;

      // 開始進行查找的動作
      for (let i = 0; i < paymentInfos.length; i++) {
        const paymentInfo = paymentInfos.at(i).texts.at(0); // 假設第一個文本是付款單號
        if (paymentInfo === item.paymentId) {
          found = true;
          break;
        }
      }

      if (found) {
        console.log(`✓ 成功找到付款單號: ${item.paymentId}`);
        setStatusMessage(`✓ 成功找到付款單號: ${item.paymentId}`);

        // 嘗試獲取商品名稱
        // const productName = findProductNameInPage();
        // if (productName) {
        //   console.log(`商品名稱: ${productName}`);
        //   setStatusMessage(
        //     `✓ 付款單號: ${item.paymentId}, 商品名稱: ${productName}`
        //   );
        // }

        return true;
      } else {
        // 如果查找次數小於最大嘗試次數，觸發懶加載
        if (searchAttempts < 5000) {
          // 最多嘗試 50 次
          console.log(
            `未找到付款單號: ${item.paymentId}, 嘗試次數: ${searchAttempts + 1}`
          );
          setSearchAttempts((prev) => prev + 1);
          // 觸發懶加載
          if (
            window.lazyLoader &&
            typeof window.lazyLoader.triggerLazyLoad === "function"
          ) {
            await window.lazyLoader.triggerLazyLoad(); // 觸發全局懶加載
          } else if (
            window.lazyLoadControl &&
            typeof window.lazyLoadControl.start === "function"
          ) {
            // 備用方案，使用控制接口
            window.lazyLoadControl.start();
            // 等待一段時間
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } else {
            console.error("找不到懶加載控制器，請確保擴展已正確載入");
            // 再備用方案：使用滾動方式
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          return false; // 沒找到，需要繼續查找
        } else {
          // 超過最大嘗試次數
          console.log(
            `❌ 未能找到付款單號: ${item.paymentId} (已達最大嘗試次數)`
          );
          setStatusMessage(
            `❌ 未能找到付款單號: ${item.paymentId} (已達最大嘗試次數)`
          );
          return true; // 即使沒找到，也視為完成
        }
      }
    } catch (error) {
      console.error("查找付款單號時發生錯誤:", error);
      setStatusMessage(`查找錯誤: ${error.message}`);
      return true; // 發生錯誤，視為完成處理當前項目
    }
  };

  // 使用 useEffect 處理數據
  useEffect(() => {
    let isMounted = true; // 是否已掛載

    const processData = async () => {
      if (!isProcessing || currentIndex >= excelData.length) {
        return;
      }

      const currentItem = excelData[currentIndex];
      const itemProcessed = await processOneItem(currentItem); // 處理當前項目

      if (isMounted) {
        if (itemProcessed) {
          // 完成當前項目處理，移動到下一項
          setCurrentIndex((prev) => prev + 1);
          setSearchAttempts(0); // 重置嘗試次數

          if (currentIndex + 1 >= excelData.length) {
            setIsProcessing(false);
            setStatusMessage("所有付款單號處理完成");

            // 所有處理完成後，停止懶加載
            if (window.lazyLoadControl) {
              window.lazyLoadControl.stop();
            }
          }
        }
      }
    };

    if (isProcessing && excelData.length > 0) {
      processData();
    }

    return () => {
      isMounted = false;

      // 組件卸載時也確保停止懶加載
      if (window.lazyLoadControl) {
        window.lazyLoadControl.stop();
      }
    };
  }, [isProcessing, currentIndex, excelData, searchAttempts]);

  return (
    <div className="excel-uploader wide-uploader">
      <div className="upload-container">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="excel-file-input"
        />
        <label htmlFor="excel-file-input" className="upload-button">
          上傳 Excel 檔案
        </label>
        <button
          onClick={handleUpload}
          disabled={!file || uploading || isProcessing}
          className="upload-button"
        >
          {uploading ? "上傳中..." : isProcessing ? "處理中..." : "上傳"}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}

      {/* 顯示狀態訊息 */}
      {statusMessage && <div className="status-message">{statusMessage}</div>}

      {/* 顯示進度 */}
      {isProcessing && excelData.length > 0 && (
        <div className="progress-display">
          進度: {currentIndex} / {excelData.length}
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;
