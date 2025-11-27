/**
 * FILE: content.js (Entry Point)
 * MỤC ĐÍCH: File khởi chạy chính, kết nối Background Script với các Module khác.
 * CHỨC NĂNG:
 * 1. Gọi `initPopup()` (từ ui-renderer.js) để chuẩn bị giao diện.
 * 2. Gọi `cleanupOldHistory()` & `renderHistory()` (từ history-manager.js) để nạp dữ liệu đầu.
 * 3. Lắng nghe `chrome.runtime.onMessage`:
 * - Nhận lệnh "showLoading" -> Gọi UI hiện Loading.
 * - Nhận lệnh "displayResult" -> Gọi UI vẽ kết quả & Gọi History lưu lại.
 * - Nhận lệnh "displayError" -> Gọi UI hiện lỗi.
 */

// 1. Khởi tạo Popup (Gọi hàm từ ui-renderer.js)
initPopup();

// 2. Khởi tạo History (Gọi hàm từ history-manager.js)
cleanupOldHistory();
renderHistory();

// 3. Message Listener (Controller chính)
chrome.runtime.onMessage.addListener((request) => {
  const analysisView = document.getElementById('analysis-view');
  const simpleView = document.getElementById('simple-translate-view');

  if (request.action === "showLoading") {
    restorePopupPosition(); // Hàm từ ui-renderer.js
    if (popup) popup.classList.add('active');

    analysisView.style.display = 'none';
    simpleView.style.display = 'block';
    simpleView.innerHTML = `<div style="text-align:center; padding:20px;"><div class="spinner"></div> ${request.loadingText || "Đang xử lý..."}</div>`;
  }
  else if (request.action === "displayResult") {
    if (request.data.translatedText) {
      // Giao diện Dịch
      analysisView.style.display = 'none';
      simpleView.style.display = 'block';
      simpleView.innerHTML = `
            <div style="margin-bottom:10px; color:#888; font-size:12px">Văn bản gốc: ${request.originalText}</div>
            <div style="font-size:16px; line-height:1.6">${request.data.translatedText}</div>
          `;
    } else {
      // Giao diện Phân tích
      simpleView.style.display = 'none';
      analysisView.style.display = 'flex'; // Flex để hiện thanh cuộn
      renderAnalysisUI(request.data); // Hàm từ ui-renderer.js
    }
    // Hàm từ history-manager.js
    saveToHistory(request.originalText, request.data.type || 'text', request.data);
  }
  else if (request.action === "displayError") {
    simpleView.innerHTML = `<p style="color:#ff5252">Lỗi: ${request.message}</p>`;
  }
});