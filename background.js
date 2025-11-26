// Lấy API key từ storage
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey || '');
    });
  });
}

// hàm fetch :tự động thử lại khi có 429
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
  try {
    const response = await fetch(url, options);
    if (response.status === 429) {
      if (retries > 0) {
        console.warn(`Gặp lỗi 429. Đang chờ ${backoff}ms để thử lại... (Còn ${retries} lần)`);

        //chờ 1 chút (backoff)
        await new Promise(resolve => setTimeout(resolve, backoff));

        //đệ quy lại hàm với thời gian chờ tăng gấp đôi
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      } else {
        throw new Error("Đã hết lần thử. Hệ thống đang quá tải. Vui lòng thử lại sau.");
      }
    }

    return response;
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
    throw error;
  }
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
  // Lấy API key
  const apiKey = await getApiKey();

  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: "displayError",
      message: "Chưa thiết lập API key. Vui lòng vào Options để cài đặt."
    }).catch(() => { });
    return;
  }

  // Cấu hình Model
  let modelName = "";
  if (type === MENUS.TRANSLATE) {
    modelName = "gemini-2.5-flash-lite"; // Dịch: Nhanh, Rẻ
  } else {
    modelName = "gemini-2.5-flash"; // Phân tích: Ổn định JSON
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let prompt = "";

  // [THAY ĐỔI 1] Prompt dịch: Chỉ yêu cầu text thuần túy, KHÔNG JSON
  if (type === MENUS.TRANSLATE) {
    prompt = `Dịch đoạn văn bản sau sang tiếng Việt. Chỉ trả về kết quả dịch, không giải thích gì thêm, không dùng dấu ngoặc kép bao quanh nếu không cần thiết.
    Văn bản: "${text}"`;
  }
  else if (type === MENUS.JAPANESE_ANALYSIS) {
    // Prompt phân tích: Vẫn giữ nguyên yêu cầu JSON
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
    Lưu ý:
    1. Tách riêng từ vựng và ngữ pháp.
    2. Phần "grammar" BẮT BUỘC phải có.`;
  }

  try {
    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API Error");

    let rawText = data.candidates[0].content.parts[0].text;
    let finalData = null;

    // [THAY ĐỔI 2] Xử lý kết quả dựa trên loại Menu
    if (type === MENUS.TRANSLATE) {
      // --- LOGIC CHO DỊCH THUẬT (TEXT) ---
      // Lấy nguyên văn text, chỉ xóa khoảng trắng thừa
      finalData = {
        translatedText: rawText.trim()
      };
    }
    else {
      // --- LOGIC CHO PHÂN TÍCH (JSON) ---
      // Trích xuất JSON từ dấu { đến dấu }
      const startIndex = rawText.indexOf('{');
      const endIndex = rawText.lastIndexOf('}');

      if (startIndex !== -1 && endIndex !== -1) {
        const jsonString = rawText.substring(startIndex, endIndex + 1);
        try {
          finalData = JSON.parse(jsonString);
        } catch (e) {
          console.error("Lỗi Parse JSON:", e);
          throw new Error("Lỗi định dạng JSON từ AI. Hãy thử lại.");
        }
      } else {
        throw new Error("AI không trả về đúng định dạng JSON.");
      }
    }

    // Gửi kết quả về Frontend (Cấu trúc dữ liệu vẫn đồng nhất)
    if (tabId && finalData) {
      chrome.tabs.sendMessage(tabId, {
        action: "displayResult",
        data: finalData,
        originalText: text
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

// 5. Xử lý Runtime Messages
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
  } else if (request.action === "analyzeText") {
    // Xử lý từ popup.js - phân tích văn bản
    handleGeminiRequest(MENUS.JAPANESE_ANALYSIS, request.text, request.tabId);
  } else if (request.action === "translateText") {
    // Xử lý từ popup.js - dịch văn bản
    handleGeminiRequest(MENUS.TRANSLATE, request.text, request.tabId);
  }
});