/**
 * FILE: storage-service.js
 * MỤC ĐÍCH: Wrapper cho Chrome Storage API với Promise support.
 * SỬ DỤNG: Cung cấp các hàm tiện ích để đọc/ghi Chrome Storage.
 */

/**
 * Storage Service - Wrapper cho chrome.storage.local
 */
const StorageService = {
    /**
     * Lấy giá trị từ storage
     * @param {string|string[]} keys - Key hoặc array keys cần lấy
     * @returns {Promise<Object>} Object chứa các giá trị
     */
    get: function (keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    },

    /**
     * Lưu giá trị vào storage
     * @param {Object} data - Object chứa key-value cần lưu
     * @returns {Promise<void>}
     */
    set: function (data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    },

    /**
     * Xóa keys khỏi storage
     * @param {string|string[]} keys - Key hoặc array keys cần xóa
     * @returns {Promise<void>}
     */
    remove: function (keys) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(keys, resolve);
        });
    },

    // =============================================
    // CONVENIENCE METHODS
    // =============================================

    /**
     * Lấy API keys (hỗ trợ migration từ single key sang array)
     * @returns {Promise<string[]>} Array các API keys
     */
    getApiKeys: async function () {
        const result = await this.get([STORAGE_KEY.API_KEYS, STORAGE_KEY.API_KEY_LEGACY]);
        let keys = result[STORAGE_KEY.API_KEYS] || [];

        // Migration: Convert single key to array
        if (keys.length === 0 && result[STORAGE_KEY.API_KEY_LEGACY]) {
            keys = [result[STORAGE_KEY.API_KEY_LEGACY]];
        }

        return keys;
    },

    /**
     * Lưu API keys
     * @param {string[]} keys - Array các API keys
     * @returns {Promise<void>}
     */
    setApiKeys: function (keys) {
        return this.set({ [STORAGE_KEY.API_KEYS]: keys });
    },

    /**
     * Lấy danh sách từ vựng đã lưu
     * @returns {Promise<Array>}
     */
    getSavedVocab: async function () {
        const result = await this.get(STORAGE_KEY.SAVED_VOCAB);
        return result[STORAGE_KEY.SAVED_VOCAB] || [];
    },

    /**
     * Lưu danh sách từ vựng
     * @param {Array} vocabList 
     * @returns {Promise<void>}
     */
    setSavedVocab: function (vocabList) {
        return this.set({ [STORAGE_KEY.SAVED_VOCAB]: vocabList });
    },

    /**
     * Lấy danh sách ngữ pháp đã lưu
     * @returns {Promise<Array>}
     */
    getSavedGrammar: async function () {
        const result = await this.get(STORAGE_KEY.SAVED_GRAMMAR);
        return result[STORAGE_KEY.SAVED_GRAMMAR] || [];
    },

    /**
     * Lưu danh sách ngữ pháp
     * @param {Array} grammarList 
     * @returns {Promise<void>}
     */
    setSavedGrammar: function (grammarList) {
        return this.set({ [STORAGE_KEY.SAVED_GRAMMAR]: grammarList });
    },

    /**
     * Lấy lịch sử tra cứu
     * @returns {Promise<Array>}
     */
    getHistory: async function () {
        const result = await this.get(STORAGE_KEY.HISTORY);
        return result[STORAGE_KEY.HISTORY] || [];
    },

    /**
     * Lưu lịch sử tra cứu
     * @param {Array} history 
     * @returns {Promise<void>}
     */
    setHistory: function (history) {
        return this.set({ [STORAGE_KEY.HISTORY]: history });
    },

    /**
     * Lấy vị trí popup
     * @returns {Promise<{top: string, left: string}|null>}
     */
    getPopupPosition: async function () {
        const result = await this.get(STORAGE_KEY.POPUP_POSITION);
        return result[STORAGE_KEY.POPUP_POSITION] || null;
    },

    /**
     * Lưu vị trí popup
     * @param {{top: string, left: string}} position 
     * @returns {Promise<void>}
     */
    setPopupPosition: function (position) {
        return this.set({ [STORAGE_KEY.POPUP_POSITION]: position });
    },

    /**
     * Lấy kích thước popup
     * @returns {Promise<{width: string, height: string}|null>}
     */
    getPopupSize: async function () {
        const result = await this.get(STORAGE_KEY.POPUP_SIZE);
        return result[STORAGE_KEY.POPUP_SIZE] || null;
    },

    /**
     * Lưu kích thước popup
     * @param {{width: string, height: string}} size 
     * @returns {Promise<void>}
     */
    setPopupSize: function (size) {
        return this.set({ [STORAGE_KEY.POPUP_SIZE]: size });
    }
};
