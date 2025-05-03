// src/context/DataContext.jsx
import React, { createContext, useState, useContext } from "react";

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [excelData, setExcelData] = useState([]); // 上傳的excel資料
  const [processedData, setProcessedData] = useState([]); // 處理後的資料
  const [currentIndex, setCurrentIndex] = useState(0); // 當前處理的索引
  const [isProcessing, setIsProcessing] = useState(false); // 是否正在處理
  const [file, setFile] = useState(null); // 選擇的文件

  return (
    <DataContext.Provider
      value={{
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
