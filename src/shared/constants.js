/**
 * FILE: constants.js
 * MỤC ĐÍCH: Định nghĩa tất cả hằng số, magic numbers, và cấu hình dùng chung.
 * SỬ DỤNG: Load file này đầu tiên trong manifest.json
 */

// ===========================================
// TIMEOUT CONFIGURATIONS
// ===========================================
const TIMEOUT = {
    /** Timeout mặc định cho API calls (90 giây) */
    DEFAULT_MS: 90000,
    /** Timeout cho văn bản dài > 500 ký tự (120 giây) */
    LONG_TEXT_MS: 120000,
    /** Ngưỡng ký tự để dùng timeout dài */
    LONG_TEXT_THRESHOLD: 500
};

// ===========================================
// HISTORY CONFIGURATIONS
// ===========================================
const HISTORY_CONFIG = {
    /** Số lượng mục lịch sử tối đa */
    MAX_ITEMS: 20,
    /** Số ngày tối đa lưu lịch sử */
    MAX_AGE_DAYS: 30,
    /** Số milliseconds tối đa lưu lịch sử */
    MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000
};

// ===========================================
// CONTEXT MENU IDs
// ===========================================
const MENU_ID = {
    /** Menu dịch văn bản */
    TRANSLATE: 'translate_normal',
    /** Menu phân tích tiếng Nhật */
    JAPANESE_ANALYSIS: 'japanese_analysis'
};

// ===========================================
// GEMINI MODEL NAMES
// ===========================================
const MODEL = {
    /** Model nhanh, rẻ - dùng cho dịch văn bản */
    TRANSLATE: 'gemini-2.5-flash-lite',
    /** Model mạnh - dùng cho phân tích ngữ pháp */
    ANALYZE: 'gemini-2.5-flash',
    /** Model fallback khi model chính gặp rate limit */
    FALLBACK: 'gemini-2.0-flash'
};

// ===========================================
// CHROME STORAGE KEYS
// ===========================================
const STORAGE_KEY = {
    /** Array các API keys (mới) */
    API_KEYS: 'geminiApiKeys',
    /** Single API key (legacy, backward compatible) */
    API_KEY_LEGACY: 'geminiApiKey',
    /** Danh sách từ vựng đã lưu */
    SAVED_VOCAB: 'savedVocab',
    /** Danh sách ngữ pháp đã lưu */
    SAVED_GRAMMAR: 'savedGrammar',
    /** Lịch sử tra cứu */
    HISTORY: 'analysisHistory',
    /** Vị trí popup {top, left} */
    POPUP_POSITION: 'popupPosition',
    /** Kích thước popup {width, height} */
    POPUP_SIZE: 'popupSize'
};

// ===========================================
// API CONFIGURATIONS
// ===========================================
const API_CONFIG = {
    /** Base URL cho Gemini API */
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    /** Số lần retry tối đa khi gặp lỗi 429 */
    MAX_RETRIES: 3,
    /** Thời gian chờ ban đầu giữa các lần retry (ms) */
    INITIAL_BACKOFF_MS: 1000
};

// ===========================================
// UI CONFIGURATIONS
// ===========================================
const UI_CONFIG = {
    /** Thời gian hiển thị toast notification (ms) */
    TOAST_DURATION_MS: 3000,
    /** Chiều rộng tối thiểu của popup */
    POPUP_MIN_WIDTH: 300,
    /** Chiều cao tối thiểu của popup */
    POPUP_MIN_HEIGHT: 250
};

// ===========================================
// ITEM STATUS
// ===========================================
const ITEM_STATUS = {
    /** Đã nhớ (remembered) */
    REMEMBERED: 'remember',
    /** Đã quên (forgot) */
    FORGOT: 'forgot'
};
