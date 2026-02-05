/**
 * FILE: background.js
 * MỤC ĐÍCH: Service Worker chính của extension.
 * CHỨC NĂNG:
 * 1. Đăng ký Context Menus khi extension cài đặt
 * 2. Lắng nghe click context menu → Gọi API
 * 3. Lắng nghe keyboard shortcuts → Gọi API
 * 4. Lắng nghe messages từ popup.js → Gọi API
 * 
 * DEPENDENCIES: (phải load trước trong manifest)
 * - src/shared/constants.js
 * - src/shared/utils.js
 * - src/shared/storage-service.js
 * - src/background/api-service.js
 */

// ===========================================
// 1. CONTEXT MENU SETUP
// ===========================================
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

// ===========================================
// 2. CONTEXT MENU CLICK HANDLER
// ===========================================
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;

    sendToTab(tab.id, 'showLoading', {
        originalText: info.selectionText
    });

    handleGeminiRequest(info.menuItemId, info.selectionText, tab.id);
});

// ===========================================
// 3. KEYBOARD SHORTCUTS HANDLER
// ===========================================
chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);

    // Xử lý Reload Extension
    if (command === 'cmd_reload_extension') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.reload(tab.id);
        setTimeout(() => chrome.runtime.reload(), 100);
        return;
    }

    // Xử lý Dịch / Phân tích
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
                    const menuType = command === 'cmd_translate'
                        ? MENU_ID.TRANSLATE
                        : MENU_ID.JAPANESE_ANALYSIS;

                    const loadingMessage = command === 'cmd_translate'
                        ? 'Đang dịch...'
                        : 'Đang phân tích...';

                    sendToTab(tab.id, 'showLoading', {
                        originalText: selectedText,
                        loadingText: loadingMessage
                    });

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

// ===========================================
// 4. MESSAGE LISTENER (từ popup.js)
// ===========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Mở trang Options (Sổ tay)
    if (request.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage();
    }

    // Dịch văn bản từ popup
    if (request.action === 'translateText') {
        sendToTab(request.tabId, 'showLoading', {
            originalText: request.text,
            loadingText: 'Đang dịch...'
        });
        handleGeminiRequest(MENU_ID.TRANSLATE, request.text, request.tabId);
    }

    // Phân tích văn bản từ popup
    if (request.action === 'analyzeText') {
        sendToTab(request.tabId, 'showLoading', {
            originalText: request.text,
            loadingText: 'Đang phân tích...'
        });
        handleGeminiRequest(MENU_ID.JAPANESE_ANALYSIS, request.text, request.tabId);
    }
});

// ===========================================
// 5. MAIN REQUEST HANDLER
// ===========================================

/**
 * Xử lý request gọi Gemini API
 * @param {string} menuType - MENU_ID.TRANSLATE hoặc MENU_ID.JAPANESE_ANALYSIS
 * @param {string} text - Text cần xử lý
 * @param {number} tabId - ID của tab để gửi kết quả
 */
async function handleGeminiRequest(menuType, text, tabId) {
    try {
        const result = await GeminiApiService.processRequest(menuType, text);

        sendToTab(tabId, 'displayResult', {
            data: result,
            originalText: text
        });
    } catch (error) {
        console.error('Gemini request failed:', error);
        sendToTab(tabId, 'displayError', {
            message: error.message || 'Lỗi không xác định'
        });
    }
}

/**
 * Gửi message đến content script của tab
 * @param {number} tabId - ID của tab
 * @param {string} action - Tên action
 * @param {Object} data - Dữ liệu gửi kèm
 */
function sendToTab(tabId, action, data) {
    if (!tabId) return;

    chrome.tabs.sendMessage(tabId, { action, ...data })
        .catch(err => console.log('Cannot send message to tab:', err));
}
