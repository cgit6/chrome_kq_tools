import React, { useState, useEffect } from "react";
import "./ExcelUploader.css";
import * as XLSX from "xlsx"; // 需要先安裝: npm install xlsx

import { useData } from "../../context/DataContext";

const REQUIRED_COLUMNS = {
  fbAccount: ["FB帳號", "fb帳號", "Facebook帳號", "facebook帳號"],
  paymentId: ["付款單號", "付款編號", "支付編號", "付款ID", "支付ID"],
};

//
const findColumnName = (headers, possibleNames) => {
  return headers.find((header) =>
    possibleNames.some(
      (name) => header.trim().toLowerCase() === name.toLowerCase()
    )
  );
};

// 找到當前頁面清單中的所有付款單號訊息
function findAllPaymentIdInPage() {
  // 查找含有 data-target="bills-loader.container" 的 tbody
  const tbody = document.querySelector(
    'tbody[data-target="bills-loader.container"]'
  );

  if (!tbody) {
    // console.log("未找到目標tbody元素");
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
    const realName = row.querySelector("td p.account-ship-info span.ship_name");
    // console.log("真名", realName);

    if (alignCenterPs.length > 0) {
      // 收集每個p標籤的文本
      const textsInRow = Array.from(alignCenterPs).map(
        (p) => p.textContent.trim() // 去除前後空白
      );

      // 儲存結果
      results.push({
        rowIndex: index + 1, // 行數
        texts: textsInRow, // 付款單號
        realName, // 姓名
      });

      // console.log(
      //   `行 ${index + 1}: 找到 ${textsInRow.length} 個符合條件的元素`
      // );
      // console.log(`內容: ${textsInRow.join(", ")}`);
    }
  });

  return results;
}

// 在頁面上查找商品名稱
const findAllOrderButtonInPage = () => {
  // 找到包含付款單號的行
  const tbody = document.querySelector(
    'tbody[data-target="bills-loader.container"]'
  );

  if (!tbody) {
    // console.log("未找到目標tbody元素");
    return null;
  }

  const button = tbody.querySelectorAll(
    'tr td div.product-edit-tool button[title="訂單明細"]'
  ); // 獲取所有行

  // console.log("button: ", button);
  return button;
};

// 獲取商品名稱訊息
function findProductName() {}

// excel 處理的組件
const ExcelUploader = () => {
  const {
    excelData,
    setExcelData,
    processedData,
    setProcessedData,
    currentIndex,
    setCurrentIndex,
    isProcessing,
    setIsProcessing,
    file,
    setFile,
  } = useData();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // 處理上傳的 excel 檔案，從中獲取需要的數據
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

      // 如果資料除了標題之外要在外加 1 筆資料
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

      // 處理後的數據
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

      return processedRows;
    } catch (err) {
      console.error("處理 Excel 檔案時發生錯誤:", err);
      throw err;
    }
  };

  // 接收上傳的 excel 檔案所觸發的呼叫函數
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]; // 獲取上傳來的檔案
    if (selectedFile) {
      setFile(selectedFile); // 儲存上傳的檔案
      setError(""); // 清空錯誤訊息
      setCurrentIndex(0); // 重置當前索引
      setExcelData([]); // 清空上傳的 excel 資料
      setStatusMessage(""); // 清空狀態訊息
    }
  };

  // 一般來說，上傳了 excel 資料之後，點下"上傳" 按鈕就會執行的個個呼叫函數
  const handleUpload = async () => {
    // 如果沒有任何檔案
    if (!file) {
      setError("請先選擇檔案");
      return;
    }

    setUploading(true); //
    try {
      // 獲取上傳的 excel 中的資料並處理完畢
      const processedData = await processExcelFile(file);
      // 儲存處理後的數據
      setProcessedData([]); // 清空處理後的數據
      setExcelData(processedData);
      setError("");
      setCurrentIndex(0);
      // 開始自動處理
      setIsProcessing(true);
      setStatusMessage("開始查找付款單號...");
    } catch (error) {
      console.error("處理檔案失敗:", error);
      setError(error.message || "處理檔案時發生錯誤");
      setExcelData([]);
    } finally {
      setUploading(false); // 什麼都沒有上傳
    }
  };

  // 獲取彈出視窗中的訊息
  const getPopupMessage = () => {
    const results = []; // 所有的搜尋結果

    // 1. 獲取品項名稱和數量的欄位索引
    let productNameColumnIndex = 2; // 品項名稱是第3欄（索引從0開始）
    let amountColumnIndex = 7; // 數量是第8欄（索引從0開始）

    // 2. 獲取表格內容
    const tbody = document.querySelector(".ui-dialog tbody#target");
    if (tbody) {
      const rows = tbody.querySelectorAll("tr");
      // console.log(`找到 ${rows.length} 筆訂單資料`);

      // 3. 遍歷每一行獲取品項名稱和數量
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll("td");

        // 獲取品項名稱
        const productNameCell = cells[productNameColumnIndex];
        const productNameElement = productNameCell.querySelector("h3");
        const productName = productNameElement
          ? productNameElement.textContent.trim()
          : "無品項名稱";

        // 獲取數量
        const amountCell = cells[amountColumnIndex];
        const amountElement = amountCell.querySelector("p.quantity");
        const amount = amountElement
          ? amountElement.textContent.trim()
          : "無數量資訊";

        // 儲存找到的結果
        results.push({ productName, amount });
        // console.log(`訂單 ${rowIndex + 1}:`);
        // console.log(`品項名稱: ${productName}`);
        // console.log(`數量: ${amount}`);
      });
      return results;
    } else {
      console.log("未找到表格內容");
    }
  };

  // 打開與關閉彈出視窗(嘗試獲取商品名稱)
  const handleOpenAndClosePopup = async (item, foundButton) => {
    console.log(`✓ 成功找到付款單號: ${item.paymentId}`);
    setStatusMessage(`✓ 成功找到付款單號: ${item.paymentId}`);

    if (foundButton) {
      // 1.模擬點擊 foundButton (打開詳細明細)
      foundButton.click(); // 模擬點擊按鈕
      console.log("已模擬點擊按鈕以開啟彈出視窗");

      // 等待彈出視窗加載
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒確保彈出窗口完全加載

      // 2.❗獲取彈出視窗中的訊息
      const popupMessage = getPopupMessage();

      // 3.直接選擇「關閉」按鈕 - 使用具體文本內容
      const closeButton = document.querySelector(
        ".ui-dialog-buttonpane .ui-dialog-buttonset button:last-child"
      );
      console.log("closeButton: ", closeButton);

      // 如果關閉按鈕存在，則模擬點擊關閉按鈕
      if (closeButton) {
        closeButton.click(); // 模擬點擊關閉按鈕
        console.log("已模擬點擊關閉按鈕以關閉彈出視窗");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.log("未找到關閉按鈕");
      }

      return popupMessage;
    }
  };

  // 處理一筆數據(比對某一筆資料的函數)返回 true(找到了) => 找下一筆資料
  const processOneItem = async (item) => {
    try {
      setStatusMessage(`正在查找付款單號: ${item.paymentId}`);
      // 初始化查找嘗試次數
      let attempts = 0;
      let found = false;
      let foundButton = null;
      let realName = null;
      let paymentInfos = [];
      let productButtons = [];

      // 使用迴圈進行查找，直到找到或達到最大嘗試次數
      while (!found && attempts < 5000) {
        // 更新嘗試次數
        attempts++;
        setStatusMessage(
          `正在查找付款單號: ${item.paymentId} (嘗試次數: ${attempts})`
        );

        // 檢查付款單號是否存在於頁面中
        paymentInfos = findAllPaymentIdInPage();
        productButtons = findAllOrderButtonInPage();

        if (!paymentInfos || paymentInfos.length === 0) {
          console.log("未找到任何付款單號資訊，準備觸發懶加載");
        } else {
          // 開始進行查找(比對)的動作
          for (let i = 0; i < paymentInfos.length; i++) {
            const paymentInfo = paymentInfos[i].texts[0]; // 假設第一個文本是付款單號
            if (paymentInfo === item.paymentId) {
              realName = paymentInfos[i].realName;
              foundButton = productButtons[i]; // 那個按鈕
              found = true;
              break;
            }
          }
        }

        // 如果找到了，跳出迴圈
        if (found) break;

        // 沒找到，觸發懶加載
        console.log(
          `未找到付款單號: ${item.paymentId}, 嘗試次數: ${attempts}, 觸發懶加載`
        );

        // 觸發懶加載
        if (
          window.lazyLoader &&
          typeof window.lazyLoader.triggerLazyLoad === "function"
        ) {
          await window.lazyLoader.triggerLazyLoad();
        } else if (
          window.lazyLoadControl &&
          typeof window.lazyLoadControl.start === "function"
        ) {
          window.lazyLoadControl.start();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.error("找不到懶加載控制器，使用滾動方式");
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // 處理查找結果
      if (found && foundButton) {
        const productData = await handleOpenAndClosePopup(item, foundButton);
        console.log("找到的姓名:", realName.innerText);
        console.log("找到的商品名稱:", productData);

        // 儲存處理後的資料
        setProcessedData((prev) => [
          ...prev,
          { name: realName.innerText, products: productData || [] },
        ]);

        return true;
      } else {
        // 超過最大嘗試次數或其他原因未找到
        console.log(
          `❌ 未能找到付款單號: ${item.paymentId} (已嘗試 ${attempts} 次)`
        );
        setStatusMessage(
          `❌ 未能找到付款單號: ${item.paymentId} (已嘗試 ${attempts} 次)`
        );
        return true; // 即使沒找到，也視為完成
      }
    } catch (error) {
      console.error("查找付款單號時發生錯誤:", error);
      setStatusMessage(`查找錯誤: ${error.message}`);
      return true; // 發生錯誤，視為完成處理當前項目
    }
  };

  // 批次處理所有上傳的 excel 檔案轉換成處理後的資料
  const handleBatchCompareDate = () => {
    let isMounted = true; // 是否已掛載(用來控制 lazyload 的開始/停止)

    // 批次處理所有資料
    const processData = async () => {
      if (!isProcessing || currentIndex >= excelData.length) {
        return;
      }

      const currentItem = excelData[currentIndex]; // 取得當前資料
      const itemProcessed = await processOneItem(currentItem); // 處理當前項目

      if (isMounted) {
        if (itemProcessed) {
          // 完成當前項目處理，移動到下一項
          setCurrentIndex((prev) => prev + 1); // 更新當前索引

          if (currentIndex + 1 >= excelData.length) {
            setIsProcessing(false);
            setStatusMessage("所有付款單號處理完成");

            // 處理所有資料的查找完成後，上傳到資料整理的 server 然後會返回一個整理過後的 excel 與 pdf 檔案
            uploadProcessedDataToServer();

            // 所有處理完成後，停止懶加載
            if (window.lazyLoadControl) {
              window.lazyLoadControl.stop();
            }
          }
        }
      }
    };

    //
    if (isProcessing && excelData.length > 0) {
      processData(); // 執行批次處理所有資料的動作
    }

    return () => {
      isMounted = false;

      // 組件卸載時也確保停止懶加載
      if (window.lazyLoadControl) {
        window.lazyLoadControl.stop(); // 停止懶加載
      }
    };
  };

  // 使用 useEffect 處理數據
  useEffect(handleBatchCompareDate, [isProcessing, currentIndex, excelData]);

  // 上傳處理後的數據到伺服器並下載返回的 Excel 檔案
  const uploadProcessedDataToServer = async () => {
    try {
      setStatusMessage("正在上傳處理後的數據...");

      // 檢查是否有數據可以上傳
      if (!processedData || processedData.length === 0) {
        setStatusMessage("沒有數據可以上傳");
        return;
      }

      // 直接發送數據列表，與Python測試一致
      console.log("準備上傳的數據:", processedData);

      // 發送 POST 請求
      const response = await fetch(
        "https://excel-flask-755089340805.us-central1.run.app/process_excel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData), // 直接發送數據列表
        }
      );

      // 其餘代碼保持不變
      if (!response.ok) {
        const errorText = await response.text();
        console.error("伺服器回應:", response.status, errorText);
        throw new Error(
          `伺服器回應錯誤: ${response.status} - ${errorText || "無詳細信息"}`
        );
      }

      // 獲取 blob 數據
      const blob = await response.blob();

      // 後續下載邏輯不變...
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

      downloadLink.href = downloadUrl;
      downloadLink.download = `處理結果_${timestamp}.xlsx`;

      document.body.appendChild(downloadLink);
      downloadLink.click();

      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage("處理完成，檔案已下載");

      // 可選：嘗試下載PDF
      setTimeout(async () => {
        try {
          const pdfResponse = await fetch(
            "https://excel-flask-755089340805.us-central1.run.app/get_pdf?filename=json_formatted_output.pdf"
          );

          if (pdfResponse.ok) {
            const pdfBlob = await pdfResponse.blob();
            const pdfUrl = window.URL.createObjectURL(pdfBlob);
            const pdfLink = document.createElement("a");

            pdfLink.href = pdfUrl;
            pdfLink.download = `處理結果_${timestamp}.pdf`;

            document.body.appendChild(pdfLink);
            pdfLink.click();

            document.body.removeChild(pdfLink);
            window.URL.revokeObjectURL(pdfUrl);

            setStatusMessage("Excel和PDF檔案已下載");
          }
        } catch (pdfError) {
          console.error("下載PDF時出錯:", pdfError);
          // 不用額外設置狀態訊息，因為Excel已成功下載
        }
      }, 1000);
    } catch (error) {
      console.error("上傳數據或下載檔案時出錯:", error);
      setStatusMessage(`處理失敗: ${error.message}`);
    }
  };

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
      {/* <p>當前資料: {JSON.stringify(processedData)}</p> */}
    </div>
  );
};

export default ExcelUploader;
