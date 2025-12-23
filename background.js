// Lấy API keys từ storage (hỗ trợ nhiều keys)
async function getApiKeys() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKeys', 'geminiApiKey'], (result) => {
      // Ưu tiên dùng geminiApiKeys (array), nếu không có thì convert từ geminiApiKey cũ
      let keys = result.geminiApiKeys || [];

      // Migration: Nếu chỉ có key cũ, convert sang array
      if (keys.length === 0 && result.geminiApiKey) {
        keys = [result.geminiApiKey];
      }

      resolve(keys);
    });
  });
}

// Lấy API key hiện tại (cho backward compatibility)
async function getApiKey() {
  const keys = await getApiKeys();
  return keys[0] || '';
}

// Lấy API key tiếp theo khi gặp rate limit
let currentKeyIndex = 0;
async function getNextApiKey() {
  const keys = await getApiKeys();
  if (keys.length === 0) return null;

  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  console.log(`Switching to API key #${currentKeyIndex + 1}/${keys.length}`);
  return keys[currentKeyIndex];
}

// Reset về key đầu tiên
function resetKeyIndex() {
  currentKeyIndex = 0;
}

// Timeout mặc định (ms) - tăng cho đoạn văn dài
const DEFAULT_TIMEOUT = 90000; // 90 giây
const LONG_TEXT_TIMEOUT = 120000; // 120 giây cho văn bản > 500 ký tự

// hàm fetch :tự động thử lại khi có 429, có timeout
async function fetchWithRetry(url, options, retries = 3, backoff = 1000, timeoutMs = DEFAULT_TIMEOUT) {
  // Tạo AbortController để hủy request khi timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Thêm signal vào options
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId); // Clear timeout nếu thành công

    if (response.status === 429) {
      if (retries > 0) {
        console.warn(`Gặp lỗi 429. Đang chờ ${backoff}ms để thử lại... (Còn ${retries} lần)`);

        //chờ 1 chút (backoff)
        await new Promise(resolve => setTimeout(resolve, backoff));

        //đệ quy lại hàm với thời gian chờ tăng gấp đôi
        return fetchWithRetry(url, options, retries - 1, backoff * 2, timeoutMs);
      } else {
        throw new Error("Đã hết lần thử. Hệ thống đang quá tải. Vui lòng thử lại sau.");
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Xử lý lỗi timeout
    if (error.name === 'AbortError') {
      throw new Error(`Quá thời gian chờ (${timeoutMs / 1000}s). Thử đoạn văn ngắn hơn hoặc thử lại sau.`);
    }

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
  // Lấy tất cả API keys
  const apiKeys = await getApiKeys();

  if (apiKeys.length === 0) {
    chrome.tabs.sendMessage(tabId, {
      action: "displayError",
      message: "Chưa thiết lập API key. Vui lòng vào Manager để cài đặt."
    }).catch(() => { });
    return;
  }

  // Reset về key đầu tiên khi bắt đầu request mới
  resetKeyIndex();

  // Thử từng API key cho đến khi thành công
  let lastError = null;
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    console.log(`Trying API key ${keyIndex + 1}/${apiKeys.length}`);

    try {
      await processWithApiKey(type, text, tabId, apiKey);
      return; // Thành công, thoát
    } catch (error) {
      lastError = error;

      // Nếu là lỗi 429 và còn keys khác, thử key tiếp theo
      if (error.message.includes("429") || error.message.includes("quá tải")) {
        console.warn(`API key ${keyIndex + 1} gặp rate limit, thử key tiếp theo...`);
        continue;
      } else {
        // Nếu không phải 429, không thử key khác nữa
        break;
      }
    }
  }

  // Tất cả keys đều fail
  console.error("Tất cả API keys đều thất bại:", lastError);
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      action: "displayError",
      message: lastError?.message || "Lỗi không xác định"
    }).catch(e => console.log("Không thể gửi báo lỗi tới tab:", e));
  }
}

// Helper function: Xử lý request với một API key cụ thể
async function processWithApiKey(type, text, tabId, apiKey) {

  // Cấu hình Model
  let modelName = "";
  let fallbackModelName = null; // Fallback model khi gặp rate limit
  if (type === MENUS.TRANSLATE) {
    modelName = "gemini-2.5-flash-lite"; // Dịch: Nhanh, Rẻ
  } else {
    modelName = "gemini-2.5-flash"; // Phân tích: Ổn định JSON
    fallbackModelName = "gemini-2.0-flash"; // Fallback cho phân tích tiếng Nhật
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let prompt = "";

  // [THAY ĐỔI 1] Prompt dịch: Chỉ yêu cầu text thuần túy, KHÔNG JSON
  if (type === MENUS.TRANSLATE) {
    prompt = `Dịch đoạn văn bản sau sang tiếng Việt. Chỉ trả về kết quả dịch, không giải thích gì thêm, không dùng dấu ngoặc kép bao quanh nếu không cần thiết.
    Văn bản: "${text}"`;
  }
  else if (type === MENUS.JAPANESE_ANALYSIS) {
    // Prompt phân tích: Sử dụng delimiter format (gọn hơn JSON)
    prompt = `Phân tích tiếng Nhật: "${text}"

Trả về ĐÚNG format sau (không thêm gì khác):
MEANING: [dịch nghĩa tiếng Việt]
---VOCAB---
từ|cách đọc|nghĩa
---GRAMMAR---
cấu trúc|giải thích

Luôn có vocab và grammar. Mỗi mục 1 dòng. Cách đọc dùng hiragana`;
  }

  try {
    let response;
    let data;

    // Xác định timeout dựa trên độ dài văn bản
    const timeoutMs = text.length > 500 ? LONG_TEXT_TIMEOUT : DEFAULT_TIMEOUT;
    console.log(`Văn bản dài ${text.length} ký tự, timeout: ${timeoutMs / 1000}s`);

    try {
      // Thử với model chính trước
      response = await fetchWithRetry(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }, 3, 1000, timeoutMs);

      data = await response.json();

      // Kiểm tra nếu là 429 và có fallback model
      if (!response.ok && response.status === 429 && fallbackModelName) {
        console.log(`Model chính gặp rate limit (429), chuyển sang fallback: ${fallbackModelName}`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModelName}:generateContent?key=${apiKey}`;

        response = await fetchWithRetry(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }, 3, 1000, timeoutMs);

        data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "API Error");
      } else if (!response.ok) {
        // Nếu không phải 429 hoặc không có fallback, throw error
        throw new Error(data.error?.message || "API Error");
      }
    } catch (primaryError) {
      // Nếu fetchWithRetry throw error (đã hết retries với 429) và có fallback, thử fallback
      if (fallbackModelName && (primaryError.message.includes("429") || primaryError.message.includes("quá tải"))) {
        console.log(`Model chính đã hết retries, chuyển sang fallback: ${fallbackModelName}`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModelName}:generateContent?key=${apiKey}`;

        try {
          response = await fetchWithRetry(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }, 3, 1000, timeoutMs);

          data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || "API Error");
        } catch (fallbackError) {
          // Nếu fallback cũng lỗi, throw lỗi gốc
          throw primaryError;
        }
      } else {
        // Nếu không phải 429 hoặc không có fallback, throw lỗi gốc
        throw primaryError;
      }
    }

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
      // --- LOGIC CHO PHÂN TÍCH (DELIMITER FORMAT) ---
      try {
        // Tách các phần bằng delimiter
        const meaningMatch = rawText.match(/MEANING:\s*(.+?)(?=---VOCAB---|$)/s);
        const vocabMatch = rawText.match(/---VOCAB---\s*([\s\S]*?)(?=---GRAMMAR---|$)/);
        const grammarMatch = rawText.match(/---GRAMMAR---\s*([\s\S]*?)$/);

        const meaning = meaningMatch ? meaningMatch[1].trim() : "";

        // Parse từ vựng: mỗi dòng có format "từ|cách đọc|nghĩa"
        const vocab = [];
        if (vocabMatch && vocabMatch[1]) {
          const vocabLines = vocabMatch[1].trim().split('\n').filter(line => line.includes('|'));
          for (const line of vocabLines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
              vocab.push({ word: parts[0], reading: parts[1], mean: parts[2] });
            } else if (parts.length === 2) {
              vocab.push({ word: parts[0], reading: "", mean: parts[1] });
            }
          }
        }

        // Parse ngữ pháp: mỗi dòng có format "cấu trúc|giải thích"
        const grammar = [];
        if (grammarMatch && grammarMatch[1]) {
          const grammarLines = grammarMatch[1].trim().split('\n').filter(line => line.includes('|'));
          for (const line of grammarLines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) {
              grammar.push({ structure: parts[0], explain: parts[1] });
            }
          }
        }

        // Tạo object giống format cũ để frontend không cần đổi
        finalData = {
          type: "analysis",
          meaning: meaning,
          vocab: vocab,
          grammar: grammar
        };

        console.log("Parsed delimiter data:", finalData);
      } catch (e) {
        console.error("Lỗi Parse delimiter:", e, "Raw:", rawText);
        throw new Error("Lỗi xử lý phản hồi từ AI. Hãy thử lại.");
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
    // Throw error để handleGeminiRequest có thể thử API key khác
    throw error;
  }
}

// 5. Xử lý shortcut từ keyboard
chrome.commands.onCommand.addListener(async (command) => {
  console.log("Phím tắt vừa bấm gửi lệnh:", command); // Debug

  // --- XỬ LÝ RELOAD ---
  if (command === "cmd_reload_extension") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.reload(tab.id);
    setTimeout(() => chrome.runtime.reload(), 100);
    return;
  }

  // --- XỬ LÝ DỊCH / PHÂN TÍCH ---
  if (command === "cmd_translate" || command === "cmd_analyze") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection().toString()
        });

        const selectedText = results[0]?.result;

        if (selectedText && selectedText.trim().length > 0) {

          // [FIX QUAN TRỌNG] Xác định loại lệnh và Text hiển thị TRƯỚC
          let menuType = "";
          let loadingMessage = "";

          if (command === "cmd_translate") {
            menuType = MENUS.TRANSLATE;
            loadingMessage = "Đang dịch...";
          }
          else if (command === "cmd_analyze") {
            menuType = MENUS.JAPANESE_ANALYSIS;
            loadingMessage = "Đang phân tích...";
          }

          // 1. Gửi tin nhắn hiện Loading (kèm text đúng)
          chrome.tabs.sendMessage(tab.id, {
            action: "showLoading",
            originalText: selectedText,
            loadingText: loadingMessage // Gửi text "Đang dịch" hoặc "Đang phân tích"
          }).catch(() => { });

          // 2. Gọi hàm xử lý API với đúng loại menu
          handleGeminiRequest(menuType, selectedText, tab.id);

        } else {
          console.log("Chưa bôi đen văn bản.");
        }
      } catch (e) {
        console.log("Lỗi:", e);
      }
    }
  }
});

// ==========================================
// 5. LẮNG NGHE YÊU CẦU TỪ FRONTEND
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Lắng nghe lệnh mở trang Options (Sổ tay)
  if (request.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
  }

  // Xử lý yêu cầu dịch từ popup
  if (request.action === "translateText") {
    chrome.tabs.sendMessage(request.tabId, {
      action: "showLoading",
      originalText: request.text,
      loadingText: "Đang dịch..."
    }).catch(() => { });
    handleGeminiRequest(MENUS.TRANSLATE, request.text, request.tabId);
  }

  // Xử lý yêu cầu phân tích từ popup
  if (request.action === "analyzeText") {
    chrome.tabs.sendMessage(request.tabId, {
      action: "showLoading",
      originalText: request.text,
      loadingText: "Đang phân tích..."
    }).catch(() => { });
    handleGeminiRequest(MENUS.JAPANESE_ANALYSIS, request.text, request.tabId);
  }

});