/**
 * FILE: popup.js
 * MỤC ĐÍCH: Xử lý popup khi click icon extension.
 * CHỨC NĂNG:
 * 1. Nút mở Manager (Sổ tay)
 * 2. Nút dịch văn bản đã bôi đen
 * 3. Nút phân tích văn bản đã bôi đen
 * 
 * DEPENDENCIES: (load trong popup.html)
 * - src/shared/constants.js
 * - src/shared/toast.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnManager = document.getElementById('btn-open-manager');
  const btnAnalyze = document.getElementById('btn-analyze-text');
  const btnTranslate = document.getElementById('btn-translate-text');

  // Nút mở Manager (Sổ tay)
  if (btnManager) {
    btnManager.onclick = () => {
      chrome.runtime.openOptionsPage();
    };
  }

  // Nút dịch văn bản
  if (btnTranslate) {
    btnTranslate.onclick = async () => {
      await handleTextAction('translate');
    };
  }

  // Nút phân tích văn bản
  if (btnAnalyze) {
    btnAnalyze.onclick = async () => {
      await handleTextAction('analyze');
    };
  }

  /**
   * Xử lý action dịch hoặc phân tích
   * @param {'translate'|'analyze'} actionType 
   */
  async function handleTextAction(actionType) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      showToast('Không thể lấy thông tin tab. Vui lòng thử lại.', 'error');
      return;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      const selectedText = results[0]?.result;

      if (!selectedText || selectedText.trim() === '') {
        showToast('Vui lòng bôi đen văn bản trước!', 'warning');
        return;
      }

      // Gửi message hiển thị loading
      chrome.tabs.sendMessage(tab.id, {
        action: 'showLoading',
        originalText: selectedText
      }).catch(() => {
        showToast('Lỗi: Hãy reload (F5) trang web rồi thử lại!', 'error');
      });

      // Gửi request đến background
      chrome.runtime.sendMessage({
        action: actionType === 'translate' ? 'translateText' : 'analyzeText',
        text: selectedText,
        tabId: tab.id
      });

      window.close();

    } catch (error) {
      console.error('Error:', error);
      showToast('Không thể thực hiện. Hãy reload (F5) trang web và thử lại!', 'error');
    }
  }
});