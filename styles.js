/**
 * FILE: styles.js
 * MỤC ĐÍCH: Chứa toàn bộ CSS (giao diện) của Popup.
 * CHỨC NĂNG:
 * 1. Khai báo biến `CSS_CONTENT`: Chứa chuỗi CSS định kiểu cho Popup, Tabs, Scrollbar, History...
 * 2. Hàm `injectStyles()`: Tạo thẻ <style> và chèn vào <head> của trang web hiện tại.
 */
const CSS_CONTENT = `
  /* --- BASE POPUP --- */
  #gemini-translator-popup {
    position: fixed;
    top: 50%; 
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
    background: #20232b;
    color: #ffffff;
    border: 1px solid #4a4d52;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-family: 'Segoe UI', sans-serif;
    user-select: none;
    
    display: none;
    flex-direction: column;
    width: 450px;
    max-width: 90vw;
    max-height: 80vh;
    min-height: 200px;

    /*mặc định kích thước*/
    width: 450px;
    height: 400px; /* Chiều cao mặc định */
    min-width: 300px;
    min-height: 250px;
    max-width: 90vw;
    max-height: 90vh;

    overflow: visible;
  }
  #gemini-translator-popup.active { display: flex; }

  /* --- [MỚI] HỆ THỐNG RESIZER (8 HƯỚNG) --- */
  .resizer {
    position: absolute;
    background: transparent; /* Trong suốt */
    z-index: 1000000; /* Luôn nằm trên cùng */
  }

  /* 1. Bốn Cạnh (Dày 5px để dễ bắt chuột) */
  .resizer-n { top: -5px; left: 0; right: 0; height: 10px; cursor: ns-resize; } /* Bắc (Trên) */
  .resizer-s { bottom: -5px; left: 0; right: 0; height: 10px; cursor: ns-resize; } /* Nam (Dưới) */
  .resizer-e { right: -5px; top: 0; bottom: 0; width: 10px; cursor: ew-resize; } /* Đông (Phải) */
  .resizer-w { left: -5px; top: 0; bottom: 0; width: 10px; cursor: ew-resize; } /* Tây (Trái) */

  /* 2. Bốn Góc (Vuông 15px) */
  .resizer-ne { top: -5px; right: -5px; width: 15px; height: 15px; cursor: nesw-resize; z-index: 1000001; } /* Đông Bắc */
  .resizer-nw { top: -5px; left: -5px; width: 15px; height: 15px; cursor: nwse-resize; z-index: 1000001; } /* Tây Bắc */
  .resizer-se { bottom: -5px; right: -5px; width: 15px; height: 15px; cursor: nwse-resize; z-index: 1000001; } /* Đông Nam */
  .resizer-sw { bottom: -5px; left: -5px; width: 15px; height: 15px; cursor: nesw-resize; z-index: 1000001; } /* Tây Nam */

  /* HEADER */
  #gemini-translator-popup h4 {
    margin: 0; padding: 12px 15px;
    background: #2b303b; color: #4CAF50;
    border-bottom: 1px solid #4a4d52;
    cursor: move; flex-shrink: 0;
    font-size: 16px; font-weight: 600;
    display: flex; justify-content: space-between; align-items: center;
  }

  .header-controls { display: flex; align-items: center; gap: 8px; }
  .header-btn {
    background: transparent; border: none; color: #aaa; cursor: pointer;
    font-size: 18px; padding: 4px; border-radius: 4px; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
  }
  .header-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
  #close-gemini-popup:hover { color: #ff5252; }

  /* MAIN CONTENT LAYOUT */
  #gemini-content-area {
    padding: 0;
    overflow: hidden !important; 
    display: flex !important; 
    flex-direction: column; 
    flex-grow: 1;
    min-height: 0;
  }

  /* --- [FEATURE] TABS STYLES (2 TABS) --- */
  .tabs-nav {
    display: flex;
    background: #2b303b;
    border-bottom: 1px solid #4a4d52;
    flex-shrink: 0;
  }
  .tab-btn {
    flex: 1;
    background: none; border: none;
    color: #888;
    padding: 10px 0;
    cursor: pointer;
    font-weight: 600; font-size: 13px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .tab-btn:hover { color: #ccc; background: rgba(255,255,255,0.05); }
  .tab-btn.active { color: #4CAF50; border-bottom-color: #4CAF50; background: rgba(76, 175, 80, 0.1); }

  .tab-content-container {
    flex-grow: 1;
    overflow-y: auto !important;
    padding: 15px;
    height: 100%;
    overscroll-behavior: contain;
  }
  .tab-pane { display: none; }
  .tab-pane.active { display: block; }

  /* MEANING SECTION (Luôn hiện trên cùng) */
  #static-meaning {
    padding: 15px;
    background: #252830;
    border-bottom: 1px solid #4a4d52;
    font-size: 15px;
    line-height: 1.5;
    flex-shrink: 0;
    max-height: 100px;
    overflow-y: auto;
  }

  /* LIST STYLES */
  #gemini-translator-popup ul { 
      padding: 0; list-style: none; margin: 0; 
  }
  
  #gemini-translator-popup li { 
      background: rgba(255,255,255,0.03); 
      margin-bottom: 8px; padding: 10px; 
      border-radius: 6px; border: 1px solid #3e4147;
  }

  /* HISTORY STYLES */
  #history-section { margin-top: 15px; border-top: 2px solid #4a4d52; padding-top: 10px; flex-shrink: 0; background: #20232b; }
  .history-title { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #888; margin-bottom: 8px; }
  #history-list {
      max-height: 110px; /* Giới hạn chiều cao cho khoảng 2 item */
      overflow-y: auto;
      overscroll-behavior: contain; /* Ngăn cuộn lan ra ngoài */
  }
  .result-item { margin-bottom: 8px; border: 1px solid #4a4d52; border-radius: 6px; overflow: hidden; }
  .result-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 12px; background: #2b303b; width: 100%; box-sizing: border-box; gap: 10px; }
  .result-header-main { display: flex; align-items: flex-start; gap: 8px; flex: 1; cursor: pointer; min-width: 0; }
  .selected-text { flex: 1; font-size: 14px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .result-item:not(.collapsed) .selected-text { white-space: normal; word-break: break-word; max-height: 150px; overflow-y: auto; padding-right: 5px; }
  .collapse-icon { font-size: 10px; color: #4CAF50; transition: transform 0.2s; flex-shrink: 0; margin-top: 5px; }
  .result-item.collapsed .collapse-icon { transform: rotate(-90deg); }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #20232b; }
  ::-webkit-scrollbar-thumb { background: #4a4d52; border-radius: 3px; }
  #static-meaning::-webkit-scrollbar,
  #history-list::-webkit-scrollbar { 
      width: 4px; 
  }
  #static-meaning::-webkit-scrollbar-track,
  #history-list::-webkit-scrollbar-track { 
      background: transparent; 
  }
  #static-meaning::-webkit-scrollbar-thumb,
  #history-list::-webkit-scrollbar-thumb { 
      background: #4a4d52; 
      border-radius: 2px; 
  }
  .selected-text::-webkit-scrollbar { width: 4px; }
  .selected-text::-webkit-scrollbar-thumb { background: #555; }
  
  .spinner { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #4CAF50; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

// Hàm helper để inject CSS
function injectStyles() {
  const style = document.createElement('style');
  style.innerHTML = CSS_CONTENT;
  document.head.appendChild(style);
}