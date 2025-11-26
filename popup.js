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

  // Hàm xử lý chung cho cả dịch và phân tích
  async function handleTextAction(actionType) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      alert('Không thể lấy thông tin tab. Vui lòng thử lại.');
      return;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      const selectedText = results[0]?.result;

      if (!selectedText || selectedText.trim() === '') {
        alert('Vui lòng bôi đen văn bản trước!');
        return;
      }

      // Gửi message hiển thị loading
      chrome.tabs.sendMessage(tab.id, {
        action: "showLoading",
        originalText: selectedText
      }).catch(() => {
        alert('Lỗi: Hãy reload (F5) trang web rồi thử lại!');
      });

      // Gọi API tương ứng
      chrome.runtime.sendMessage({
        action: actionType === 'translate' ? "translateText" : "analyzeText",
        text: selectedText,
        tabId: tab.id
      });

      window.close();

    } catch (error) {
      console.error("Lỗi:", error);
      alert('Không thể thực hiện. Hãy reload (F5) trang web và thử lại!');
    }
  }
});