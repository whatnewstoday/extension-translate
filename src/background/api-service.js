/**
 * FILE: api-service.js
 * MỤC ĐÍCH: Service xử lý gọi Gemini API.
 * SỬ DỤNG: Được gọi từ background.js
 */

/**
 * Gemini API Service
 * Quản lý việc gọi API với retry logic và key rotation
 */
const GeminiApiService = {
    /** Index của API key hiện tại */
    currentKeyIndex: 0,

    /**
     * Reset về key đầu tiên
     */
    resetKeyIndex: function () {
        this.currentKeyIndex = 0;
    },

    /**
     * Fetch với retry logic khi gặp lỗi 429
     * @param {string} url - URL API
     * @param {RequestInit} options - Fetch options
     * @param {number} retries - Số lần retry còn lại
     * @param {number} backoff - Thời gian chờ giữa các lần retry (ms)
     * @param {number} timeoutMs - Timeout cho request (ms)
     * @returns {Promise<Response>}
     */
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

    /**
     * Xây dựng prompt dựa trên loại menu
     * @param {string} menuType - MENU_ID.TRANSLATE hoặc MENU_ID.JAPANESE_ANALYSIS
     * @param {string} text - Text cần xử lý
     * @returns {string} Prompt
     */
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

    /**
     * Parse response từ Gemini API
     * @param {string} menuType - Loại menu
     * @param {string} rawText - Raw text từ API
     * @returns {Object} Parsed data
     */
    parseResponse: function (menuType, rawText) {
        if (menuType === MENU_ID.TRANSLATE) {
            return {
                translatedText: rawText.trim()
            };
        }

        // Parse analysis response (delimiter format)
        try {
            const meaningMatch = rawText.match(/MEANING:\s*(.+?)(?=---VOCAB---|$)/s);
            const vocabMatch = rawText.match(/---VOCAB---\s*([\s\S]*?)(?=---GRAMMAR---|$)/);
            const grammarMatch = rawText.match(/---GRAMMAR---\s*([\s\S]*?)$/);

            const meaning = meaningMatch ? meaningMatch[1].trim() : '';

            // Parse từ vựng
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

            // Parse ngữ pháp
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

            return {
                type: 'analysis',
                meaning: meaning,
                vocab: vocab,
                grammar: grammar
            };
        } catch (e) {
            console.error('Parse error:', e, 'Raw:', rawText);
            throw new Error('Lỗi xử lý phản hồi từ AI. Hãy thử lại.');
        }
    },

    /**
     * Gọi API với một API key cụ thể
     * @param {string} menuType - Loại menu
     * @param {string} text - Text cần xử lý
     * @param {string} apiKey - API key
     * @returns {Promise<Object>} Kết quả
     */
    callApi: async function (menuType, text, apiKey) {
        // Chọn model
        let modelName = menuType === MENU_ID.TRANSLATE ? MODEL.TRANSLATE : MODEL.ANALYZE;
        const fallbackModelName = menuType === MENU_ID.JAPANESE_ANALYSIS ? MODEL.FALLBACK : null;

        const url = `${API_CONFIG.BASE_URL}/${modelName}:generateContent?key=${apiKey}`;
        const prompt = this.buildPrompt(menuType, text);
        const timeoutMs = text.length > TIMEOUT.LONG_TEXT_THRESHOLD ? TIMEOUT.LONG_TEXT_MS : TIMEOUT.DEFAULT_MS;

        console.log(`Text length: ${text.length}, timeout: ${timeoutMs / 1000}s`);

        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        try {
            let response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }, API_CONFIG.MAX_RETRIES, API_CONFIG.INITIAL_BACKOFF_MS, timeoutMs);

            let data = await response.json();

            // Thử fallback model nếu gặp 429 và có fallback
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

    /**
     * Xử lý request chính với key rotation
     * @param {string} menuType - Loại menu
     * @param {string} text - Text cần xử lý
     * @returns {Promise<Object>} Kết quả
     */
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

                // Nếu là lỗi 429, thử key tiếp theo
                if (error.message.includes('429') || error.message.includes('quá tải')) {
                    console.warn(`API key ${keyIndex + 1} rate limited, trying next...`);
                    continue;
                } else {
                    // Nếu không phải 429, không thử key khác
                    break;
                }
            }
        }

        console.error('All API keys failed:', lastError);
        throw lastError || new Error('Lỗi không xác định');
    }
};
