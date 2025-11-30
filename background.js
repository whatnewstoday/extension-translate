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

  // [NEW] Thêm vào hàng đợi tạo ví dụ
  if (request.action === "addToVocabQueue") {
    addToQueue(request.word);
  }

  // [NEW] Ép buộc tạo ví dụ ngay (Manual Trigger)
  if (request.action === "forceGenerateExamples") {
    forceGenerate(request.words);
  }
});

// ==========================================
// 6. AUTO-GENERATE EXAMPLES LOGIC (NEW)
// ==========================================
let vocabQueue = [];
let queueTimer = null;

function addToQueue(word) {
  // Tránh trùng lặp
  if (!vocabQueue.includes(word)) {
    vocabQueue.push(word);
    console.log(`Đã thêm "${word}" vào hàng đợi. Tổng: ${vocabQueue.length}`);
  }

  // Nếu đủ 10 từ -> Xử lý ngay
  if (vocabQueue.length >= 10) {
    processQueue();
  } else {
    // Nếu chưa đủ, reset timer chờ 5 giây mới xử lý (Debounce)
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = setTimeout(processQueue, 5000);
  }
}

function forceGenerate(words) {
  if (!words || words.length === 0) return;
  console.log("Force generating examples for:", words);
  generateExamples(words);
}

async function processQueue() {
  if (queueTimer) clearTimeout(queueTimer);
  if (vocabQueue.length === 0) return;

  const batch = [...vocabQueue];
  vocabQueue = []; // Clear queue
  console.log("Đang xử lý batch:", batch);

  await generateExamples(batch);
}

async function generateExamples(words) {
  const apiKey = await getApiKey();
  if (!apiKey) return;

  const modelName = "gemini-2.5-flash-preview-09-2025"; // Model theo yêu cầu
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const prompt = `
    Hãy tạo 3 câu ví dụ song ngữ (Nhật - Việt) cho mỗi từ vựng sau đây: ${words.join(", ")}.
    
    Yêu cầu trả về JSON chính xác theo định dạng sau (không thêm markdown):
    [
      {
        "word": "Từ vựng 1",
        "examples": [
          { "jp": "Câu tiếng Nhật 1", "vi": "Nghĩa tiếng Việt 1" },
          { "jp": "Câu tiếng Nhật 2", "vi": "Nghĩa tiếng Việt 2" },
          { "jp": "Câu tiếng Nhật 3", "vi": "Nghĩa tiếng Việt 3" }
        ]
      }
    ]
  `;

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

    const rawText = data.candidates[0].content.parts[0].text;
    const jsonString = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1);
    const results = JSON.parse(jsonString);

    // Lưu kết quả vào Storage
    updateVocabWithExamples(results);

  } catch (error) {
    console.error("Lỗi tạo ví dụ:", error);
  }
}

function updateVocabWithExamples(results) {
  chrome.storage.local.get(['savedVocab'], (data) => {
    let vocabList = data.savedVocab || [];
    let hasChanges = false;

    results.forEach(res => {
      const itemIndex = vocabList.findIndex(v => v.word === res.word);
      if (itemIndex !== -1) {
        vocabList[itemIndex].examples = res.examples;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      chrome.storage.local.set({ savedVocab: vocabList }, () => {
        console.log("Đã cập nhật ví dụ cho", results.length, "từ.");
        // Gửi thông báo để Manager reload nếu đang mở
        chrome.runtime.sendMessage({ action: "vocabUpdated" }).catch(() => { });
      });
    }
  });
}