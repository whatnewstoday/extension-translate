/**
 * FILE: index.js (Manager Entry Point)
 * MỤC ĐÍCH: File khởi chạy chính cho trang Manager (Sổ tay).
 * CHỨC NĂNG:
 * 1. Load và render dữ liệu
 * 2. Xử lý các sự kiện UI (chọn, xóa, export, review)
 * 3. Xử lý Settings (API keys)
 * 
 * DEPENDENCIES: (phải load trước trong manager.html)
 * - src/shared/constants.js
 * - src/shared/utils.js
 * - src/shared/storage-service.js
 * - src/shared/toast.js
 * - src/manager/data-service.js
 * - src/manager/export-service.js
 * - src/manager/review-mode.js
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== MANAGER SCRIPT (REFACTORED) ===');

    // =============================================
    // 1. ELEMENTS & STATE
    // =============================================
    const btnSettings = document.getElementById('btn-settings');
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const actionBar = document.getElementById('action-bar');
    const dateExportBar = document.getElementById('date-export-bar');

    const vocabContent = document.getElementById('vocab-content');
    const grammarContent = document.getElementById('grammar-content');
    const vocabCountSpan = document.getElementById('vocab-count');
    const grammarCountSpan = document.getElementById('grammar-count');

    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    const selectedCountSpan = document.getElementById('selected-count');
    const btnExport = document.getElementById('btn-export');
    const btnReviewForgotten = document.getElementById('btn-review-forgotten');

    // Date Picker Export
    const datePicker = document.getElementById('date-picker');
    const btnExportDate = document.getElementById('btn-export-date');
    const dateExportInfo = document.getElementById('date-export-info');

    const btnReview = document.getElementById('btn-review');
    const reviewModal = document.getElementById('review-modal');
    const flashcard = document.getElementById('flashcard');
    const btnForgot = document.getElementById('btn-forgot');
    const btnRemember = document.getElementById('btn-remember');
    const btnCloseReview = document.getElementById('close-review');

    let currentView = 'main';

    // =============================================
    // 2. INIT & NAVIGATION
    // =============================================
    loadBothDataAndRender();
    initDatePicker();

    // Listen for vocab updates from background
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'vocabUpdated') {
            loadBothDataAndRender();
        }
    });

    if (btnSettings) {
        btnSettings.onclick = () => {
            if (currentView === 'main') {
                showSettings();
            } else {
                showMainView();
            }
        };
    }

    function showSettings() {
        currentView = 'settings';
        mainView.style.display = 'none';
        actionBar.style.display = 'none';
        if (dateExportBar) dateExportBar.style.display = 'none';
        settingsView.style.display = 'block';
        btnSettings.textContent = '← Quay lại';
        renderSettings();
    }

    function showMainView() {
        currentView = 'main';
        mainView.style.display = 'grid';
        actionBar.style.display = 'flex';
        if (dateExportBar) dateExportBar.style.display = 'flex';
        settingsView.style.display = 'none';
        btnSettings.textContent = '⚙️ Cài đặt API';
        loadBothDataAndRender();
    }

    // =============================================
    // 2.5. DATE PICKER EXPORT
    // =============================================
    function initDatePicker() {
        if (!datePicker) return;

        // Set default to today
        datePicker.value = getTodayDateString();
        updateDateInfo();

        // On date change
        datePicker.addEventListener('change', updateDateInfo);

        // Export button
        if (btnExportDate) {
            btnExportDate.onclick = () => {
                if (!datePicker.value) {
                    showToast('Vui lòng chọn ngày!', 'warning');
                    return;
                }
                ExportService.exportByDateCombined(datePicker.value);
            };
        }
    }

    async function updateDateInfo() {
        if (!dateExportInfo || !datePicker.value) return;

        const info = await ExportService.getDateInfo(datePicker.value);
        if (info.vocabCount === 0 && info.grammarCount === 0) {
            dateExportInfo.textContent = '(Không có dữ liệu)';
            dateExportInfo.style.color = '#999';
        } else {
            dateExportInfo.textContent = `(${info.vocabCount} từ vựng, ${info.grammarCount} ngữ pháp)`;
            dateExportInfo.style.color = '#4CAF50';
        }
    }

    // =============================================
    // 3. DATA LOADING & RENDERING
    // =============================================
    async function loadBothDataAndRender() {
        const data = await ManagerDataService.loadBothData();
        const vocabList = data.vocab;
        const grammarList = data.grammar;

        if (vocabCountSpan) vocabCountSpan.textContent = vocabList.length;
        if (grammarCountSpan) grammarCountSpan.textContent = grammarList.length;

        renderList(vocabList, vocabContent, 'vocab');
        renderList(grammarList, grammarContent, 'grammar');

        updateDeleteButton();
    }

    // Make it globally accessible for ReviewModeService
    window.loadBothDataAndRender = loadBothDataAndRender;

    function renderList(list, container, type) {
        if (!container) return;
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có dữ liệu.</div>';
            return;
        }

        const groupedData = groupByDate(list);

        groupedData.forEach(([dateKey, items]) => {
            const dateSection = document.createElement('div');
            dateSection.className = 'date-section';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
        <span class="date-title">${formatDateDisplay(dateKey)} (${items.length})</span>
        <div style="display:flex; align-items:center; gap:5px;">
          <button class="btn-download-date" title="Tải xuống từ vựng ngày này">📥 Tải</button>
          <button class="btn-review-date" title="Ôn tập các từ của ngày này">▶️ Day Card</button>
          <div class="dropdown">
            <button class="btn-dropdown-trigger">📝 Kiểm tra ▼</button>
            <div class="dropdown-content">
              <a data-action="quiz-meaning">📖 Từ vựng</a>
              <a data-action="quiz-reading">🗣️ Cách đọc</a>
            </div>
          </div>
        </div>
      `;

            // Download by date
            dateHeader.querySelector('.btn-download-date').onclick = () => {
                ExportService.exportByDate(items, type, dateKey);
            };

            // Review by date
            dateHeader.querySelector('.btn-review-date').onclick = () => {
                ReviewModeService.startReviewByDate(items, type);
            };

            // Quiz dropdown
            const dropdownContent = dateHeader.querySelector('.dropdown-content');
            dropdownContent.querySelectorAll('a').forEach(link => {
                link.onclick = (e) => {
                    const action = e.target.dataset.action;
                    if (action === 'quiz-meaning') ReviewModeService.startQuiz(items, type, 'meaning');
                    if (action === 'quiz-reading') ReviewModeService.startQuiz(items, type, 'reading');
                };
            });

            dateSection.appendChild(dateHeader);

            items.forEach(item => {
                const card = createCard(item, type);
                dateSection.appendChild(card);
            });

            container.appendChild(dateSection);
        });
    }

    function createCard(item, type) {
        const card = document.createElement('div');
        card.className = `card ${type}`;
        if (item.status === ITEM_STATUS.FORGOT) {
            card.classList.add('status-forgot');
        }
        card.style.cursor = 'pointer';

        const idValue = type === 'vocab' ? item.word : item.structure;
        const title = type === 'vocab' ? item.word : item.structure;
        const subtitle = type === 'vocab' ? `(${item.reading || ''})` : '';
        const content = type === 'vocab' ? item.mean : item.explain;

        const statusBadge = item.status === ITEM_STATUS.FORGOT
            ? `<span class="badge-forgot" title="Bạn đã quên từ này">🧠 Quên</span>`
            : '';

        card.innerHTML = `
      <div class="card-top">
        <input type="checkbox" class="item-checkbox" value="${idValue}" data-type="${type}">
        ${statusBadge}
        <div class="card-actions">
          <span class="btn-speak" title="Nghe">🔊</span>
          <button class="delete-btn-mini" title="Xóa">🗑️</button>
        </div>
      </div>
      <div class="card-body">
        <h3>${title} <span class="reading">${subtitle}</span></h3>
        <p>${content}</p>
      </div>
    `;

        // Click card to toggle checkbox
        card.addEventListener('click', (e) => {
            if (window.getSelection().toString().length > 0) return;
            if (e.target.closest('.btn-speak') || e.target.closest('.delete-btn-mini') || e.target.closest('.item-checkbox')) {
                return;
            }
            const checkbox = card.querySelector('.item-checkbox');
            if (checkbox) checkbox.click();
        });

        // Checkbox change
        const checkbox = card.querySelector('.item-checkbox');
        checkbox.addEventListener('change', () => {
            updateDeleteButton();
            if (checkbox.checked) {
                card.style.backgroundColor = '#f3e5f5';
                card.style.borderColor = '#673AB7';
            } else {
                card.style.backgroundColor = '';
                card.style.borderColor = '';
            }
        });

        // Speak button
        card.querySelector('.btn-speak').onclick = (e) => {
            e.stopPropagation();
            speakJapanese(title);
        };

        // Delete button
        card.querySelector('.delete-btn-mini').onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Xóa mục: "${title}"?`)) {
                ManagerDataService.deleteItems([{ type: type, id: idValue }])
                    .then(() => loadBothDataAndRender());
            }
        };

        return card;
    }

    // =============================================
    // 4. BULK ACTIONS
    // =============================================
    if (selectAllCheckbox) {
        selectAllCheckbox.onchange = () => {
            const allCheckboxes = document.querySelectorAll('.item-checkbox');
            allCheckboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
            updateDeleteButton();
        };
    }

    function updateDeleteButton() {
        const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
        const count = checkedBoxes.length;

        if (selectedCountSpan) selectedCountSpan.textContent = count;

        if (btnDeleteSelected) {
            btnDeleteSelected.disabled = count === 0;
            btnDeleteSelected.style.opacity = count > 0 ? '1' : '0.6';
            btnDeleteSelected.style.cursor = count > 0 ? 'pointer' : 'not-allowed';
        }
    }

    if (btnDeleteSelected) {
        btnDeleteSelected.onclick = async () => {
            const checkboxes = document.querySelectorAll('.item-checkbox:checked');
            if (checkboxes.length === 0) return;

            if (confirm(`Xóa ${checkboxes.length} mục đã chọn?`)) {
                const items = Array.from(checkboxes).map(cb => ({
                    type: cb.dataset.type,
                    id: cb.value
                }));
                await ManagerDataService.deleteItems(items);
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                loadBothDataAndRender();
            }
        };
    }

    if (btnExport) {
        btnExport.onclick = () => ExportService.exportAll();
    }

    // =============================================
    // 5. REVIEW MODE
    // =============================================
    if (btnReview) {
        btnReview.onclick = () => ReviewModeService.startReviewSession('all');
    }

    if (btnReviewForgotten) {
        btnReviewForgotten.onclick = () => ReviewModeService.startReviewSession('forgotten');
    }

    if (btnCloseReview) {
        btnCloseReview.onclick = () => ReviewModeService.hideReviewModal();
    }

    if (flashcard) {
        flashcard.onclick = () => flashcard.classList.toggle('is-flipped');
    }

    if (btnForgot) {
        btnForgot.onclick = (e) => {
            e.stopPropagation();
            ReviewModeService.handleForgot();
        };
    }

    if (btnRemember) {
        btnRemember.onclick = (e) => {
            e.stopPropagation();
            ReviewModeService.handleRemember();
        };
    }

    // Keyboard shortcuts for review
    document.addEventListener('keydown', (e) => {
        if (!reviewModal || reviewModal.classList.contains('hidden')) return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (flashcard) flashcard.classList.toggle('is-flipped');
        }
        if (e.key === '1') ReviewModeService.handleForgot();
        if (e.key === '2') ReviewModeService.handleRemember();
    });

    // =============================================
    // 6. SETTINGS
    // =============================================
    async function renderSettings() {
        const keys = await StorageService.getApiKeys();

        const keysHTML = keys.length > 0
            ? keys.map((key, index) => {
                const maskedKey = key.substring(0, 10) + '...' + key.substring(key.length - 4);
                return `
          <div class="api-key-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#f5f5f5; margin:5px 0; border-radius:5px;">
            <code>${index + 1}. ${maskedKey}</code>
            <button class="btn-delete-key" data-index="${index}" style="background:#f44336; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Xóa</button>
          </div>
        `;
            }).join('')
            : '<p style="color:#999;">Chưa có API key nào.</p>';

        settingsView.innerHTML = `
      <div class="settings-container">
        <h2>⚙️ Cài đặt API Keys</h2>
        <div class="settings-card">
          <h3>Danh sách API Keys (${keys.length})</h3>
          <div id="api-keys-list">${keysHTML}</div>
          
          <hr style="margin:20px 0;">
          
          <h3>Thêm API Key mới</h3>
          <input type="password" id="api-key-input" placeholder="Nhập API Key mới..." style="width:100%; padding:10px; margin:10px 0;">
          <button id="add-api-btn" class="btn-success">➕ Thêm Key</button>
          
          <p style="margin-top:20px; font-size:12px; color:#666;">
            💡 <strong>Mẹo:</strong> Thêm nhiều API keys từ các Google Cloud projects khác nhau để tránh rate limit.
          </p>
        </div>
      </div>
    `;

        // Add key button
        document.getElementById('add-api-btn').onclick = async () => {
            const val = document.getElementById('api-key-input').value.trim();
            if (val) {
                const currentKeys = await StorageService.getApiKeys();
                if (currentKeys.includes(val)) {
                    showToast('Key này đã tồn tại!', 'warning');
                    return;
                }

                currentKeys.push(val);
                await StorageService.setApiKeys(currentKeys);
                showToast('Đã thêm API Key!', 'success');
                renderSettings();
            }
        };

        // Delete key buttons
        document.querySelectorAll('.btn-delete-key').forEach(btn => {
            btn.onclick = async () => {
                const index = parseInt(btn.dataset.index);
                if (confirm(`Xóa API key #${index + 1}?`)) {
                    const currentKeys = await StorageService.getApiKeys();
                    currentKeys.splice(index, 1);
                    await StorageService.setApiKeys(currentKeys);
                    renderSettings();
                }
            };
        });
    }
});
