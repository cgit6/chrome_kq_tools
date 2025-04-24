import React, { useState } from 'react';
import './ExcelUploader.css';
import * as XLSX from 'xlsx';  // 需要先安裝: npm install xlsx
import ExcelModal from '../ExcelModal/ExcelModal';

const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [excelData, setExcelData] = useState(null);  // 存储 Excel 数据
  const [showModal, setShowModal] = useState(false);  // 控制弹窗显示

    // 選擇Excel文件
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && (
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      selectedFile.type === 'application/vnd.ms-excel'
    )) {
      setFile(selectedFile);
      readExcelFile(selectedFile);
    } else {
      alert('请选择有效的 Excel 文件 (.xlsx 或 .xls)');
    }
  };

  const readExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // 修改數據處理邏輯，根據截圖格式提取數據
        const processedData = jsonData.map(row => {
          // 從截圖可以看到需要的欄位
          return {
            fbAccount: row['FB帳號'] || row['訂單編號'] || '', // 訂單編號作為 FB 帳號
            paymentId: row['付款單號'] || row['訂單號'] || row['訂單編號'] || ''  // 付款單號
          };
        }).filter(row => row.fbAccount || row.paymentId); // 過濾掉空行

        console.log('原始數據:', jsonData);
        console.log('處理後的數據:', processedData);
        
        if (processedData.length === 0) {
          alert('無法從 Excel 中找到有效的數據，請確認文件格式是否正確');
          return;
        }

        setExcelData(processedData);
      } catch (error) {
        console.error('解析Excel文件失败:', error);
        alert('解析文件失败，请确保文件格式正确');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }

    setUploading(true);
    try {
      // 模拟上传
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('文件上传成功！');
      setShowModal(true);  // 移到這裡，上傳成功後才顯示 Modal
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="excel-uploader">
      <div className="upload-container">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          id="excel-file"
          className="file-input"
        />
        <label htmlFor="excel-file" className="file-label">
          {file ? file.name : '选择 Excel 文件'}
        </label>
        <button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? '上传中...' : '上传'}
        </button>
      </div>

          {showModal && excelData && (
            // 顯示Modal
        <ExcelModal 
          data={excelData} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
};

export default ExcelUploader;
