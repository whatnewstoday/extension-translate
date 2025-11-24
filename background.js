// Lấy API key từ storage
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey || '');
    });
  });
}

// Định nghĩa các ID menu
const MENUS = {
  TRANSLATE: "translate_normal",
  JAPANESE_ANALYSIS: "japanese_analysis"
};

// 1.Tạo Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENUS.TRANSLATE,
    title: "Dịch sang tiếng Việt",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: MENUS.JAPANESE_ANALYSIS,
    title: "🇯🇵 Phân tích ngữ pháp & Từ vựng",
    contexts: ["selection"]
  });
});

// 2. Xử lý sự kiện click menu chuột phải
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return;

  chrome.tabs.sendMessage(tab.id, {
    action: "showLoading",
    originalText: info.selectionText
  }).catch(err => console.log("Lỗi kết nối Content Script (Hãy F5 trang web):", err));

  handleGeminiRequest(info.menuItemId, info.selectionText, tab.id);
});

// 3. Hàm xử lý logic gọi API
async function handleGeminiRequest(type, text, tabId) {
  // Lấy API key từ storage
  const apiKey = await getApiKey();

  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: "displayError",
      message: "Chưa thiết lập API key. Vui lòng vào Options để cài đặt."
    }).catch(() => { });
    return;
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  let prompt = "";

  if (type === MENUS.TRANSLATE) {
    prompt = `Dịch đoạn văn sau sang tiếng Việt.
    Trả về định dạng JSON duy nhất: { "translatedText": "nội dung dịch" }
    Văn bản: "${text}"`;
  }
  else if (type === MENUS.JAPANESE_ANALYSIS) {
    prompt = `Bạn là giáo viên tiếng Nhật N1. Hãy phân tích đoạn văn: "${text}"
    
    Yêu cầu trả về CHÍNH XÁC định dạng JSON này (không thêm markdown):
    {
      "type": "analysis",
      "meaning": "Dịch nghĩa câu sang tiếng Việt",
      "vocab": [
        { "word": "Kanji gốc", "reading": "Hiragana", "mean": "Nghĩa tiếng Việt" }
      ],
      "grammar": [
        { "structure": "Cấu trúc", "explain": "Giải thích ngắn gọn" }
      ]
    }
    Lưu ý quan trọng:
    1. Hãy tách riêng từ vựng và ngữ pháp.
    2. Phần "grammar" BẮT BUỘC phải có. Nếu không có mẫu ngữ pháp N1-N5 nào, hãy giải thích cấu trúc câu cơ bản (ví dụ: chia thể động từ, trợ từ...).`;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API Error");

    // Xử lý dữ liệu trả về
    let rawText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const jsonData = JSON.parse(cleanJson);

    // Gửi kết quả về Frontend
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "displayResult",
        data: jsonData
      });
    }

  } catch (error) {
    console.error("Lỗi xử lý Gemini:", error);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "displayError",
        message: error.message
      }).catch(e => console.log("Không thể gửi báo lỗi tới tab:", e));
    }
  }
}

// 4. Xử lý Phím tắt
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "translate_selection") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        });

        const selectedText = results[0]?.result;
        if (selectedText) {
          chrome.tabs.sendMessage(tab.id, {
            action: "showLoading",
            originalText: selectedText
          }).catch(() => { });

          handleGeminiRequest(MENUS.JAPANESE_ANALYSIS, selectedText, tab.id);
        }
      } catch (e) {
        console.log("Không thể lấy văn bản (Tab hệ thống hoặc chưa F5):", e);
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
  }
});