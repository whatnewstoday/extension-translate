/**
 * FILE: utils.js
 * MỤC ĐÍCH: Các hàm tiện ích dùng chung trong toàn extension.
 */

/**
 * Escape HTML entities để tránh XSS
 * @param {string} text - Text cần escape
 * @returns {string} Text đã được escape
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Delay execution
 * @param {number} ms - Số milliseconds cần chờ
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tạo unique ID
 * @returns {string} Unique ID dạng "timestamp_random"
 */
function generateUniqueId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

/**
 * Nhóm danh sách theo ngày
 * @param {Array} list - Danh sách items với trường date
 * @returns {Array<[string, Array]>} Mảng các cặp [dateKey, items]
 */
function groupByDate(list) {
    const groups = {};

    list.forEach(item => {
        const dateStr = item.date ? item.date.split('T')[0] : 'unknown';
        if (!groups[dateStr]) {
            groups[dateStr] = [];
        }
        groups[dateStr].push(item);
    });

    // Sắp xếp theo ngày mới nhất
    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'unknown') return 1;
        if (b[0] === 'unknown') return -1;
        return new Date(b[0]) - new Date(a[0]);
    });
}

/**
 * Format ngày hiển thị (Hôm nay, Hôm qua, hoặc dd/mm/yyyy)
 * @param {string} dateStr - Date string dạng yyyy-mm-dd
 * @returns {string} Ngày đã format
 */
function formatDateDisplay(dateStr) {
    if (dateStr === 'unknown') return 'Không xác định';

    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dS = date.toISOString().split('T')[0];
    const tS = today.toISOString().split('T')[0];
    const yS = yesterday.toISOString().split('T')[0];

    if (dS === tS) return '📅 Hôm nay';
    if (dS === yS) return '📅 Hôm qua';

    return `📅 ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/**
 * Phát âm tiếng Nhật
 * @param {string} text - Text tiếng Nhật cần phát âm
 */
function speakJapanese(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find(v => v.lang === 'ja-JP');
    if (jpVoice) utterance.voice = jpVoice;

    window.speechSynthesis.speak(utterance);
}

/**
 * Kiểm tra text có chứa Kanji không
 * @param {string} text - Text cần kiểm tra
 * @returns {boolean}
 */
function hasKanji(text) {
    const kanjiRegex = /[\u4e00-\u9faf]/;
    return kanjiRegex.test(text);
}

/**
 * Lấy ngày hôm nay dạng yyyy-mm-dd
 * @returns {string}
 */
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}
