/**
 * FILE: index.js (Content Script Entry Point)
 * MỤC ĐÍCH: File khởi chạy chính, kết nối Background Script với các Module khác.
 * CHỨC NĂNG:
 * 1. Khởi tạo popup và history
 * 2. Lắng nghe messages từ background.js
 * 
 * DEPENDENCIES: (phải load trước trong manifest)
 * - src/shared/constants.js
 * - src/shared/utils.js
 * - src/shared/storage-service.js
 * - src/content/styles.js
 * - src/content/popup-ui.js
 * - src/content/history.js
 */

// 1. Khởi tạo Popup
initPopup();

// 2. Khởi tạo History
cleanupOldHistory();
renderHistory();

// 3. Message Listener (Controller chính)
chrome.runtime.onMessage.addListener((request) => {
    const analysisView = document.getElementById('analysis-view');
    const simpleView = document.getElementById('simple-translate-view');

    if (request.action === 'showLoading') {
        restorePopupPosition();
        if (popup) popup.classList.add('active');

        analysisView.style.display = 'none';
        simpleView.style.display = 'block';
        simpleView.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div class="spinner"></div> ${request.loadingText || 'Đang xử lý...'}
      </div>
    `;
    }
    else if (request.action === 'displayResult') {
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
            analysisView.style.display = 'flex';
            renderAnalysisUI(request.data);
        }

        // Lưu vào lịch sử
        saveToHistory(request.originalText, request.data.type || 'text', request.data);
    }
    else if (request.action === 'displayError') {
        simpleView.innerHTML = `<p style="color:#ff5252">Lỗi: ${request.message}</p>`;
    }
});
