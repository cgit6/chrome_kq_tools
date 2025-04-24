import React from 'react';
import './ExcelModal.css';

const ExcelModal = ({ data, onClose }) => {
  console.log('Modal收到的數據:', data);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="excel-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Excel 文件内容</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>訂單編號</th>
                  <th>付款單號</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(data) && data.map((row, index) => (
                  <tr key={index}>
                    <td>{row.fbAccount || '無數據'}</td>
                    <td>{row.paymentId || '無數據'}</td>
                  </tr>
                ))}
                {(!Array.isArray(data) || data.length === 0) && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center' }}>
                      沒有找到有效的數據
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExcelModal;
