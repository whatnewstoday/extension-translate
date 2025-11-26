document.addEventListener('DOMContentLoaded', () => {
  const btnManager = document.getElementById('btn-open-manager');
  const btnAnalyze = document.getElementById('btn-analyze-text');

  // Nút mở Manager (Sổ tay)
  if (btnManager) {
    btnManager.onclick = () => {
      chrome.runtime.openOptionsPage();
    };
  }

  // Nút phân tích văn bản
  if (btnAnalyze) {
    btnAnalyze.onclick = async () => {
      // Lấy tab hiện tại
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        alert('Không thể lấy thông tin tab. Vui lòng thử lại.');
        return;
      }

      try {
        // Lấy văn bản đã bôi đen
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        });

        const selectedText = results[0]?.result;

        if (!selectedText || selectedText.trim() === '') {
          alert('Vui lòng bôi đen văn bản trước khi phân tích!');
          return;
        }

        // Gửi message để hiển thị loading
        chrome.tabs.sendMessage(tab.id, {
          action: "showLoading",
          originalText: selectedText
        }).catch(() => {
          alert('Lỗi: Hãy reload (F5) trang web rồi thử lại!');
        });

        // Gọi API phân tích
        chrome.runtime.sendMessage({
          action: "analyzeText",
          text: selectedText,
          tabId: tab.id
        });

        // Đóng popup
        window.close();

      } catch (error) {
        console.error("Lỗi:", error);
        alert('Không thể phân tích văn bản. Hãy reload (F5) trang web và thử lại!');
      }
    };
  }
});