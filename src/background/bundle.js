/**
 * FILE: bundle.js (Background Service Worker Bundle)
 * MỤC ĐÍCH: Bundle tất cả dependencies cho background service worker.
 * LÝ DO: Service Worker trong MV3 chỉ cho phép 1 file, nên cần bundle.
 * 
 * FILE NÀY SẼ ĐƯỢC TẠO TỰ ĐỘNG BỞI BUILD SCRIPT HOẶC COPY THỦ CÔNG
 * Hiện tại: Concatenate các files theo thứ tự dependencies
 */

// ============================================
// 1. CONSTANTS (from src/shared/constants.js)
// ============================================

/**
 * Timeout configurations
 */
const TIMEOUT = {
    DEFAULT_MS: 90000,
    LONG_TEXT_MS: 120000,
    LONG_TEXT_THRESHOLD: 500
};

const HISTORY_CONFIG = {
    MAX_ITEMS: 20,
    MAX_AGE_DAYS: 30,
    MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000
};

const MENU_ID = {
    TRANSLATE: 'translate_normal',
    JAPANESE_ANALYSIS: 'japanese_analysis'
};

const MODEL = {
    TRANSLATE: 'gemini-2.5-flash-lite',
    ANALYZE: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.0-flash'
};

const STORAGE_KEY = {
    API_KEYS: 'geminiApiKeys',
    API_KEY_LEGACY: 'geminiApiKey',
    SAVED_VOCAB: 'savedVocab',
    SAVED_GRAMMAR: 'savedGrammar',
    HISTORY: 'analysisHistory',
    POPUP_POSITION: 'popupPosition',
    POPUP_SIZE: 'popupSize'
};

const API_CONFIG = {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    MAX_RETRIES: 3,
    INITIAL_BACKOFF_MS: 1000
};

const UI_CONFIG = {
    TOAST_DURATION_MS: 3000,
    POPUP_MIN_WIDTH: 300,
    POPUP_MIN_HEIGHT: 250
};

const ITEM_STATUS = {
    REMEMBERED: 'remember',
    FORGOT: 'forgot'
};

// ============================================
// 2. UTILS (from src/shared/utils.js)
// ============================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 3. STORAGE SERVICE (from src/shared/storage-service.js)
// ============================================

const StorageService = {
    get: function (keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    },

    set: function (data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    },

    getApiKeys: async function () {
        const result = await this.get([STORAGE_KEY.API_KEYS, STORAGE_KEY.API_KEY_LEGACY]);
        let keys = result[STORAGE_KEY.API_KEYS] || [];

        if (keys.length === 0 && result[STORAGE_KEY.API_KEY_LEGACY]) {
            keys = [result[STORAGE_KEY.API_KEY_LEGACY]];
        }

        return keys;
    }
};

// ============================================
// 4. API SERVICE (from src/background/api-service.js)
// ============================================

const GeminiApiService = {
    currentKeyIndex: 0,

    resetKeyIndex: function () {
        this.currentKeyIndex = 0;
    },

    fetchWithRetry: async function (url, options, retries = API_CONFIG.MAX_RETRIES, backoff = API_CONFIG.INITIAL_BACKOFF_MS, timeoutMs = TIMEOUT.DEFAULT_MS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions = {
            ...options,
            signal: controller.signal
        };

        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (response.status === 429) {
                if (retries > 0) {
                    console.warn(`Rate limited (429). Waiting ${backoff}ms... (${retries} retries left)`);
                    await delay(backoff);
                    return this.fetchWithRetry(url, options, retries - 1, backoff * 2, timeoutMs);
                } else {
                    throw new Error('Đã hết lần thử. Hệ thống đang quá tải. Vui lòng thử lại sau.');
                }
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Quá thời gian chờ (${timeoutMs / 1000}s). Thử đoạn văn ngắn hơn hoặc thử lại sau.`);
            }

            console.error('API Error:', error);
            throw error;
        }
    },

    buildPrompt: function (menuType, text) {
        if (menuType === MENU_ID.TRANSLATE) {
            return `Dịch đoạn văn bản sau sang tiếng Việt. Chỉ trả về kết quả dịch, không giải thích gì thêm, không dùng dấu ngoặc kép bao quanh nếu không cần thiết.
      Văn bản: "${text}"`;
        }

        if (menuType === MENU_ID.JAPANESE_ANALYSIS) {
            return `Phân tích tiếng Nhật: "${text}"

Trả về ĐÚNG format sau (không thêm gì khác):
MEANING: [dịch nghĩa tiếng Việt]
---VOCAB---
từ|cách đọc|nghĩa
---GRAMMAR---
cấu trúc|giải thích

Luôn có vocab và grammar. Mỗi mục 1 dòng. Cách đọc dùng hiragana`;
        }

        return '';
    },

    parseResponse: function (menuType, rawText) {
        if (menuType === MENU_ID.TRANSLATE) {
            return { translatedText: rawText.trim() };
        }

        try {
            const meaningMatch = rawText.match(/MEANING:\s*(.+?)(?=---VOCAB---|$)/s);
            const vocabMatch = rawText.match(/---VOCAB---\s*([\s\S]*?)(?=---GRAMMAR---|$)/);
            const grammarMatch = rawText.match(/---GRAMMAR---\s*([\s\S]*?)$/);

            const meaning = meaningMatch ? meaningMatch[1].trim() : '';

            const vocab = [];
            if (vocabMatch && vocabMatch[1]) {
                const vocabLines = vocabMatch[1].trim().split('\n').filter(line => line.includes('|'));
                for (const line of vocabLines) {
                    const parts = line.split('|').map(p => p.trim());
                    if (parts.length >= 3) {
                        vocab.push({ word: parts[0], reading: parts[1], mean: parts[2] });
                    } else if (parts.length === 2) {
                        vocab.push({ word: parts[0], reading: '', mean: parts[1] });
                    }
                }
            }

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

            return { type: 'analysis', meaning, vocab, grammar };
        } catch (e) {
            console.error('Parse error:', e, 'Raw:', rawText);
            throw new Error('Lỗi xử lý phản hồi từ AI. Hãy thử lại.');
        }
    },

    callApi: async function (menuType, text, apiKey) {
        let modelName = menuType === MENU_ID.TRANSLATE ? MODEL.TRANSLATE : MODEL.ANALYZE;
        const fallbackModelName = menuType === MENU_ID.JAPANESE_ANALYSIS ? MODEL.FALLBACK : null;

        const url = `${API_CONFIG.BASE_URL}/${modelName}:generateContent?key=${apiKey}`;
        const prompt = this.buildPrompt(menuType, text);
        const timeoutMs = text.length > TIMEOUT.LONG_TEXT_THRESHOLD ? TIMEOUT.LONG_TEXT_MS : TIMEOUT.DEFAULT_MS;

        console.log(`Text length: ${text.length}, timeout: ${timeoutMs / 1000}s`);

        const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

        try {
            let response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }, API_CONFIG.MAX_RETRIES, API_CONFIG.INITIAL_BACKOFF_MS, timeoutMs);

            let data = await response.json();

            if (!response.ok && response.status === 429 && fallbackModelName) {
                console.log(`Switching to fallback model: ${fallbackModelName}`);
                const fallbackUrl = `${API_CONFIG.BASE_URL}/${fallbackModelName}:generateContent?key=${apiKey}`;

                response = await this.fetchWithRetry(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }, API_CONFIG.MAX_RETRIES, API_CONFIG.INITIAL_BACKOFF_MS, timeoutMs);

                data = await response.json();
            }

            if (!response.ok) {
                throw new Error(data.error?.message || 'API Error');
            }

            const rawText = data.candidates[0].content.parts[0].text;
            return this.parseResponse(menuType, rawText);
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    },

    processRequest: async function (menuType, text) {
        const apiKeys = await StorageService.getApiKeys();

        if (apiKeys.length === 0) {
            throw new Error('Chưa thiết lập API key. Vui lòng vào Manager để cài đặt.');
        }

        this.resetKeyIndex();
        let lastError = null;

        for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
            const apiKey = apiKeys[keyIndex];
            console.log(`Trying API key ${keyIndex + 1}/${apiKeys.length}`);

            try {
                return await this.callApi(menuType, text, apiKey);
            } catch (error) {
                lastError = error;
                if (error.message.includes('429') || error.message.includes('quá tải')) {
                    console.warn(`API key ${keyIndex + 1} rate limited, trying next...`);
                    continue;
                } else {
                    break;
                }
            }
        }

        console.error('All API keys failed:', lastError);
        throw lastError || new Error('Lỗi không xác định');
    }
};

// ============================================
// 5. MAIN BACKGROUND LOGIC (from src/background/index.js)
// ============================================

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: MENU_ID.TRANSLATE,
        title: 'Dịch sang tiếng Việt',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: MENU_ID.JAPANESE_ANALYSIS,
        title: '🇯🇵 Phân tích ngữ pháp & Từ vựng',
        contexts: ['selection']
    });
});

// Context Menu Click Handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;

    sendToTab(tab.id, 'showLoading', { originalText: info.selectionText });
    handleGeminiRequest(info.menuItemId, info.selectionText, tab.id);
});

// Keyboard Shortcuts Handler
chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);

    if (command === 'cmd_reload_extension') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.reload(tab.id);
        setTimeout(() => chrome.runtime.reload(), 100);
        return;
    }

    if (command === 'cmd_translate' || command === 'cmd_analyze') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab?.id) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => window.getSelection().toString()
                });

                const selectedText = results[0]?.result;

                if (selectedText && selectedText.trim().length > 0) {
                    const menuType = command === 'cmd_translate' ? MENU_ID.TRANSLATE : MENU_ID.JAPANESE_ANALYSIS;
                    const loadingMessage = command === 'cmd_translate' ? 'Đang dịch...' : 'Đang phân tích...';

                    sendToTab(tab.id, 'showLoading', { originalText: selectedText, loadingText: loadingMessage });
                    handleGeminiRequest(menuType, selectedText, tab.id);
                } else {
                    console.log('No text selected');
                }
            } catch (e) {
                console.log('Error:', e);
            }
        }
    }
});

// Message Listener (from popup.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage();
    }

    if (request.action === 'translateText') {
        sendToTab(request.tabId, 'showLoading', { originalText: request.text, loadingText: 'Đang dịch...' });
        handleGeminiRequest(MENU_ID.TRANSLATE, request.text, request.tabId);
    }

    if (request.action === 'analyzeText') {
        sendToTab(request.tabId, 'showLoading', { originalText: request.text, loadingText: 'Đang phân tích...' });
        handleGeminiRequest(MENU_ID.JAPANESE_ANALYSIS, request.text, request.tabId);
    }
});

// Main Request Handler
async function handleGeminiRequest(menuType, text, tabId) {
    try {
        const result = await GeminiApiService.processRequest(menuType, text);
        sendToTab(tabId, 'displayResult', { data: result, originalText: text });
    } catch (error) {
        console.error('Gemini request failed:', error);
        sendToTab(tabId, 'displayError', { message: error.message || 'Lỗi không xác định' });
    }
}

function sendToTab(tabId, action, data) {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { action, ...data }).catch(err => console.log('Cannot send message to tab:', err));
}
