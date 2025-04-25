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

// 在頁面上查找付款單號
const findPaymentIdInPage = (paymentId) => {
  // 找到頁面上所有包含表格數據的元素
  // 這裡需要根據實際網頁結構調整選擇器
  const tableElements = document.querySelectorAll("table tr td");

  for (let i = 0; i < tableElements.length; i++) {
    const element = tableElements[i];
    // 檢查元素內容是否包含付款單號
    if (element.textContent.includes(paymentId)) {
      console.log(`在網頁中找到付款單號: ${paymentId}`);
      return true;
    }
  }

  return false;
};

// 觸發懶加載功能
const triggerLazyLoad = () => {
  console.log("觸發懶加載使用 lazyLoadTrigger.js...");

  // 使用 lazyLoadTrigger.js 提供的全局控制介面
  if (window.lazyLoadControl) {
    // 先停止之前可能正在運行的懶加載
    window.lazyLoadControl.stop();

    // 啟動懶加載
    window.lazyLoadControl.start();

    // 返回 Promise 以便等待
    return new Promise((resolve) => setTimeout(resolve, 3000)); // 等待 3 秒讓懶加載生效
  } else {
    console.error(
      "找不到 lazyLoadControl，請確保 lazyLoadTrigger.js 已正確載入"
    );

    // 備用方案：使用滾動方式
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });

    return new Promise((resolve) => setTimeout(resolve, 2000)); // 等待 2 秒
  }
};

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

      console.log("處理後的數據:", processedRows);
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
      setStatusMessage(
        `正在查找付款單號: ${item.paymentId} (嘗試次數: ${searchAttempts + 1})`
      );

      // 在頁面上查找付款單號
      const found = findPaymentIdInPage(item.paymentId);

      if (found) {
        console.log(`✓ 成功找到付款單號: ${item.paymentId}`);
        setStatusMessage(`✓ 成功找到付款單號: ${item.paymentId}`);
        return true;
      } else {
        // 如果查找次數小於最大嘗試次數，觸發懶加載
        if (searchAttempts < 5) {
          // 最多嘗試 5 次
          console.log(
            `未找到付款單號: ${item.paymentId}, 嘗試次數: ${searchAttempts + 1}`
          );
          setSearchAttempts((prev) => prev + 1);
          // 觸發懶加載
          await triggerLazyLoad();
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
      const itemProcessed = await processOneItem(currentItem);

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
