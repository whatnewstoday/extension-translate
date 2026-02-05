/**
 * FILE: popup-ui.js
 * MỤC ĐÍCH: Xử lý việc render giao diện và các tương tác UI.
 * CHỨC NĂNG:
 * 1. initPopup(): Khởi tạo HTML popup và chèn vào trang web
 * 2. setupEvents(): Gắn sự kiện Click và Drag
 * 3. setupResizing(): Xử lý resize popup 8 hướng
 * 4. renderAnalysisUI(): Render kết quả phân tích
 * 5. restorePopupPosition(): Khôi phục vị trí popup
 * 
 * DEPENDENCIES:
 * - src/shared/constants.js
 * - src/shared/storage-service.js
 * - src/content/styles.js (injectStyles)
 * - src/content/history.js (saveVocabulary, saveGrammar)
 */

/** Biến global lưu reference đến popup element */
let popup = null;

/**
 * Khởi tạo popup
 */
function initPopup() {
    // 1. Inject CSS
    injectStyles();

    // 2. Tạo HTML
    popup = document.createElement('div');
    popup.id = 'gemini-translator-popup';
    popup.innerHTML = `
    <h4>
      <span>Gemini Japanese AI</span>
      <div class="header-controls">
        <button id="open-manager-btn" class="header-btn" title="Sổ tay">📖</button>
        <button id="close-gemini-popup" class="header-btn" title="Đóng">&times;</button>
      </div>
    </h4>

    <div id="gemini-content-area">
      <div id="analysis-view" style="display:flex; flex-direction:column; flex-grow:1; min-height:0; overflow:hidden;">
        <div id="static-meaning"></div>
        <div class="tabs-nav">
          <button class="tab-btn active" data-tab="tab-vocab">Từ vựng</button>
          <button class="tab-btn" data-tab="tab-grammar">Ngữ pháp</button>
        </div>
        <div class="tab-content-container" id="tabs-container">
          <div id="tab-vocab" class="tab-pane active"></div>
          <div id="tab-grammar" class="tab-pane"></div>
        </div>
      </div>

      <div id="simple-translate-view" style="display:none; padding:15px; flex-grow:1; overflow-y:auto; min-height:0;"></div>

      <div id="history-section">
        <div class="history-title"><span>📜 Lịch sử</span></div>
        <div id="history-list"></div>
      </div>
    </div>
    
    <div class="resizer resizer-n" data-dir="n"></div>
    <div class="resizer resizer-s" data-dir="s"></div>
    <div class="resizer resizer-e" data-dir="e"></div>
    <div class="resizer resizer-w" data-dir="w"></div>
    <div class="resizer resizer-ne" data-dir="ne"></div>
    <div class="resizer resizer-nw" data-dir="nw"></div>
    <div class="resizer resizer-se" data-dir="se"></div>
    <div class="resizer resizer-sw" data-dir="sw"></div>
  `;

    document.body.appendChild(popup);

    // 3. Gắn sự kiện
    setupEvents();
    setupResizing();

    // 4. Khôi phục vị trí
    restorePopupPosition();
}

/**
 * Gắn các sự kiện cơ bản cho popup
 */
function setupEvents() {
    // Tab Switching
    const tabBtns = popup.querySelectorAll('.tab-btn');
    const tabPanes = popup.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        };
    });

    // Open Manager Button
    const openManagerBtn = popup.querySelector('#open-manager-btn');
    openManagerBtn.onmousedown = (e) => e.stopPropagation();
    openManagerBtn.onclick = () => chrome.runtime.sendMessage({ action: 'openOptionsPage' });

    // Close Button
    document.getElementById('close-gemini-popup').onclick = () => popup.classList.remove('active');

    // Drag Logic
    setupDragging();
}

/**
 * Thiết lập drag để di chuyển popup
 */
function setupDragging() {
    const headerHandler = popup.querySelector('h4');
    let isDragging = false;
    let offsetX, offsetY;

    headerHandler.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        const rect = popup.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        popup.style.transform = 'none';
        popup.style.margin = '0';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            savePopupState();
        }
    });
}

/**
 * Thiết lập resize 8 hướng cho popup
 */
function setupResizing() {
    const resizers = popup.querySelectorAll('.resizer');
    let currentResizer;
    let isResizing = false;
    let startX, startY, startW, startH, startTop, startLeft;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentResizer = resizer;
            isResizing = true;

            const rect = popup.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startW = rect.width;
            startH = rect.height;
            startTop = rect.top;
            startLeft = rect.left;

            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });
    });

    function resize(e) {
        if (!isResizing) return;

        const direction = currentResizer.getAttribute('data-dir');
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Horizontal resize
        if (direction.includes('e')) {
            popup.style.width = `${startW + dx}px`;
        } else if (direction.includes('w')) {
            const newW = startW - dx;
            if (newW > UI_CONFIG.POPUP_MIN_WIDTH) {
                popup.style.width = `${newW}px`;
                popup.style.left = `${startLeft + dx}px`;
            }
        }

        // Vertical resize
        if (direction.includes('s')) {
            popup.style.height = `${startH + dy}px`;
        } else if (direction.includes('n')) {
            const newH = startH - dy;
            if (newH > UI_CONFIG.POPUP_MIN_HEIGHT) {
                popup.style.height = `${newH}px`;
                popup.style.top = `${startTop + dy}px`;
            }
        }
    }

    function stopResize() {
        if (isResizing) {
            isResizing = false;
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
            savePopupState();
        }
    }
}

/**
 * Lưu trạng thái popup (vị trí, kích thước)
 */
function savePopupState() {
    if (!popup || !chrome.runtime?.id) return;

    try {
        StorageService.set({
            [STORAGE_KEY.POPUP_SIZE]: { width: popup.style.width, height: popup.style.height },
            [STORAGE_KEY.POPUP_POSITION]: { top: popup.style.top, left: popup.style.left }
        });
    } catch (e) {
        console.error('Error saving popup state:', e);
    }
}

/**
 * Khôi phục vị trí popup từ storage
 */
function restorePopupPosition() {
    StorageService.getPopupPosition().then(position => {
        if (position && popup) {
            popup.style.top = position.top;
            popup.style.left = position.left;
            popup.style.transform = 'none';
            popup.style.margin = '0';
        }
    });
}

/**
 * Render UI cho kết quả phân tích
 * @param {Object} data - Dữ liệu phân tích {meaning, vocab, grammar}
 */
function renderAnalysisUI(data) {
    // Nghĩa chính
    document.getElementById('static-meaning').innerHTML = `
    <div style="font-weight:bold; color:#fff; margin-bottom:5px">Ý nghĩa:</div>
    <div style="font-size:15px; color:#ddd">${data.meaning}</div>
  `;

    // Tab: TỪ VỰNG
    const tabVocab = document.getElementById('tab-vocab');
    tabVocab.innerHTML = '';

    if (data.vocab && data.vocab.length > 0) {
        const ul = document.createElement('ul');

        data.vocab.forEach(word => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';

            const readingDisplay = word.reading ? `(${word.reading})` : '';

            const leftDiv = document.createElement('div');
            leftDiv.innerHTML = `
        <div style="font-size:16px; color:#81C784; font-weight:bold;">
          ${word.word} <span style="font-size:14px; color:#aaa; font-weight:normal">${readingDisplay}</span>
        </div>
        <div style="font-size:13px; color:#ccc; margin-top:2px;">${word.mean}</div>
      `;

            const saveBtn = createSaveButton();
            saveBtn.onclick = () => saveVocabulary(word, saveBtn);

            li.appendChild(leftDiv);
            li.appendChild(saveBtn);
            ul.appendChild(li);
        });

        tabVocab.appendChild(ul);
    } else {
        tabVocab.innerHTML = '<div class="empty-state">Không có từ vựng.</div>';
    }

    // Tab: NGỮ PHÁP
    const tabGrammar = document.getElementById('tab-grammar');
    tabGrammar.innerHTML = '';

    if (data.grammar && data.grammar.length > 0) {
        const ul = document.createElement('ul');

        data.grammar.forEach(gram => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';

            const leftDiv = document.createElement('div');
            leftDiv.innerHTML = `
        <div style="color:#FFB74D; font-weight:bold; margin-bottom:4px">${gram.structure}</div>
        <div style="font-size:13px; color:#ddd;">${gram.explain}</div>
      `;

            const saveBtn = createSaveButton();
            saveBtn.onclick = () => saveGrammar(gram, saveBtn);

            li.appendChild(leftDiv);
            li.appendChild(saveBtn);
            ul.appendChild(li);
        });

        tabGrammar.appendChild(ul);
    } else {
        tabGrammar.innerHTML = '<div class="empty-state">Không có ngữ pháp.</div>';
    }
}

/**
 * Tạo nút lưu (💾)
 * @returns {HTMLButtonElement}
 */
function createSaveButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '💾';
    btn.style.cssText = 'background:none; border:1px solid #555; color:#fff; cursor:pointer; padding:4px 8px; border-radius:4px; font-size:14px;';
    return btn;
}
