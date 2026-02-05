/**
 * FILE: history.js
 * MỤC ĐÍCH: Quản lý logic lưu trữ dữ liệu (History & Saved Items).
 * CHỨC NĂNG:
 * 1. saveToHistory(): Lưu kết quả vừa dịch vào lịch sử
 * 2. renderHistory(): Đọc lịch sử và vẽ ra màn hình
 * 3. deleteHistoryItem(): Xóa một mục lịch sử
 * 4. cleanupOldHistory(): Xóa lịch sử cũ quá 30 ngày
 * 5. saveVocabulary() / saveGrammar(): Lưu vào Sổ tay
 * 6. restoreHistoryItem(): Xem lại kết quả cũ
 * 
 * DEPENDENCIES:
 * - src/shared/constants.js
 * - src/shared/utils.js
 * - src/shared/storage-service.js
 * - src/content/popup-ui.js (renderAnalysisUI)
 */

/**
 * Dọn dẹp lịch sử cũ quá 30 ngày
 */
function cleanupOldHistory() {
    StorageService.getHistory().then(history => {
        let hasChanges = false;

        // Đảm bảo mỗi item có id
        history = history.map((item, index) => {
            if (!item.id) {
                item.id = generateUniqueId() + '_' + index;
                hasChanges = true;
            }
            return item;
        });

        // Lọc ra những item còn trong thời hạn
        const now = Date.now();
        const filtered = history.filter(
            item => (now - (item.timestamp || 0)) < HISTORY_CONFIG.MAX_AGE_MS
        );

        if (filtered.length !== history.length || hasChanges) {
            StorageService.setHistory(filtered);
        }
    });
}

/**
 * Lưu kết quả vào lịch sử
 * @param {string} text - Văn bản gốc
 * @param {string} type - Loại: 'text' hoặc 'analysis'
 * @param {Object} data - Dữ liệu kết quả
 */
function saveToHistory(text, type, data) {
    const item = {
        id: generateUniqueId(),
        selectedText: text,
        type: type,
        result: data,
        timestamp: Date.now()
    };

    StorageService.getHistory().then(history => {
        history.unshift(item);

        // Giới hạn số lượng
        if (history.length > HISTORY_CONFIG.MAX_ITEMS) {
            history = history.slice(0, HISTORY_CONFIG.MAX_ITEMS);
        }

        StorageService.setHistory(history).then(renderHistory);
    });
}

/**
 * Render danh sách lịch sử ra màn hình
 */
function renderHistory() {
    StorageService.getHistory().then(history => {
        const list = document.getElementById('history-list');
        if (!list) return;

        if (history.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:10px; font-size:12px">Chưa có lịch sử</div>';
            return;
        }

        list.innerHTML = '';

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item collapsed';
            div.style.marginBottom = '5px';

            const header = document.createElement('div');
            header.className = 'result-header';

            const headerMain = document.createElement('div');
            headerMain.className = 'result-header-main';
            headerMain.style.minWidth = '0';
            headerMain.innerHTML = `<span class="selected-text" title="${escapeHtml(item.selectedText)}">${escapeHtml(item.selectedText)}</span>`;
            headerMain.onclick = () => restoreHistoryItem(item);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-history-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Xóa mục này';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            };

            header.appendChild(headerMain);
            header.appendChild(deleteBtn);
            div.appendChild(header);
            list.appendChild(div);
        });
    });
}

/**
 * Khôi phục và hiển thị một mục lịch sử
 * @param {Object} item - Mục lịch sử cần hiển thị
 */
function restoreHistoryItem(item) {
    const analysisView = document.getElementById('analysis-view');
    const simpleView = document.getElementById('simple-translate-view');

    if (item.type === 'text' || (item.result && item.result.translatedText)) {
        // Hiển thị dạng dịch
        analysisView.style.display = 'none';
        simpleView.style.display = 'block';
        simpleView.innerHTML = `
      <div style="margin-bottom:10px; color:#888; font-size:12px">Văn bản gốc: ${item.selectedText}</div>
      <div style="font-size:16px; line-height:1.6">${item.result.translatedText}</div>
    `;
    } else {
        // Hiển thị dạng phân tích
        simpleView.style.display = 'none';
        analysisView.style.display = 'flex';
        if (item.result) renderAnalysisUI(item.result);
    }
}

/**
 * Xóa một mục khỏi lịch sử
 * @param {string} itemId - ID của mục cần xóa
 */
function deleteHistoryItem(itemId) {
    StorageService.getHistory().then(history => {
        const originalLength = history.length;
        history = history.filter(item => String(item.id) !== String(itemId));

        if (history.length < originalLength) {
            StorageService.setHistory(history).then(renderHistory);
        } else {
            cleanupOldHistory();
            renderHistory();
        }
    });
}

/**
 * Lưu từ vựng vào sổ tay
 * @param {Object} obj - Object từ vựng {word, reading, mean}
 * @param {HTMLElement} btn - Nút đã click (để update UI)
 */
function saveVocabulary(obj, btn) {
    StorageService.getSavedVocab().then(vocabList => {
        const today = getTodayDateString();

        // Kiểm tra trùng trong ngày hôm nay
        const existsToday = vocabList.some(item => {
            if (item.word !== obj.word) return false;
            const itemDate = item.date ? item.date.split('T')[0] : '';
            return itemDate === today;
        });

        if (!existsToday) {
            vocabList.push({
                ...obj,
                date: new Date().toISOString()
            });

            StorageService.setSavedVocab(vocabList).then(() => {
                btn.innerHTML = '✅';
                btn.disabled = true;
            });
        }
    });
}

/**
 * Lưu ngữ pháp vào sổ tay
 * @param {Object} obj - Object ngữ pháp {structure, explain}
 * @param {HTMLElement} btn - Nút đã click (để update UI)
 */
function saveGrammar(obj, btn) {
    StorageService.getSavedGrammar().then(grammarList => {
        // Kiểm tra trùng theo structure
        const exists = grammarList.some(item => item.structure === obj.structure);

        if (!exists) {
            grammarList.push({
                ...obj,
                date: new Date().toISOString()
            });

            StorageService.setSavedGrammar(grammarList).then(() => {
                btn.innerHTML = '✅';
                btn.disabled = true;
            });
        }
    });
}
