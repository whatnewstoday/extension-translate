document.addEventListener('DOMContentLoaded', () => {
  console.log("=== MANAGER SCRIPT (SAFE MODE) ===");

  // Elements
  const btnVocab = document.getElementById('btn-vocab');
  const btnGrammar = document.getElementById('btn-grammar');
  const btnSettings = document.getElementById('btn-settings');
  const contentArea = document.getElementById('content-area');

  // Bulk Action Elements
  const actionBar = document.getElementById('action-bar');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const btnDeleteMulti = document.getElementById('btn-delete-multi');
  const selectedCountSpan = document.getElementById('selected-count');

  // State Tracking
  let currentTab = 'vocab';

  // Init
  loadData();

  // --- SỰ KIỆN CHUYỂN TAB ---
  if (btnVocab) btnVocab.onclick = () => switchTab('vocab');
  if (btnGrammar) btnGrammar.onclick = () => switchTab('grammar');
  if (btnSettings) btnSettings.onclick = () => switchTab('settings');

  function switchTab(type) {
    currentTab = type;

    // Remove active from all tabs
    [btnVocab, btnGrammar, btnSettings].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    // Set active tab
    if (type === 'vocab' && btnVocab) btnVocab.classList.add('active');
    if (type === 'grammar' && btnGrammar) btnGrammar.classList.add('active');
    if (type === 'settings' && btnSettings) btnSettings.classList.add('active');

    // Reset checkbox an toàn
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkDeleteButton();

    if (type === 'settings') {
      renderSettings();
    } else {
      loadData();
    }
  }

  // --- SỰ KIỆN CHỌN TẤT CẢ ---
  if (selectAllCheckbox) {
    selectAllCheckbox.onclick = () => {
      const checkboxes = document.querySelectorAll('.item-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
      updateBulkDeleteButton();
    };
  }

  // --- SỰ KIỆN XÓA NHIỀU ---
  if (btnDeleteMulti) {
    btnDeleteMulti.onclick = () => {
      const checkboxes = document.querySelectorAll('.item-checkbox:checked');
      if (checkboxes.length === 0) return;

      if (confirm(`Bạn có chắc muốn xóa ${checkboxes.length} mục đã chọn không?`)) {
        const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
        deleteBulkItems(idsToDelete);
      }
    };
  }

  // --- HÀM LOAD DỮ LIỆU ---
  function loadData() {
    const storageKey = currentTab === 'vocab' ? 'savedVocab' : 'savedGrammar';

    console.log(`Đang tải dữ liệu tab: ${currentTab}`);

    chrome.storage.local.get([storageKey], (result) => {
      const list = result[storageKey] || [];
      console.log("Số lượng tìm thấy:", list.length);
      renderList(list);
    });
  }

  // --- HÀM RENDER UI ---
  function renderList(list) {
    if (!contentArea) return;
    contentArea.innerHTML = '';

    // Xử lý hiển thị/ẩn thanh Action Bar
    if (list.length === 0) {
      if (actionBar) actionBar.style.display = 'none';

      contentArea.innerHTML = `
                <div style="text-align:center; margin-top:50px; color:#888;">
                    <p>Chưa có dữ liệu nào.</p>
                </div>`;
      return;
    }

    // Hiện thanh công cụ nếu nó tồn tại
    if (actionBar) actionBar.style.display = 'flex';

    // Render Cards
    [...list].reverse().forEach((item) => {
      try {
        const card = document.createElement('div');
        card.className = `card ${currentTab === 'grammar' ? 'grammar' : ''}`;

        let title, subtitle, content, idValue;

        // Fallback dữ liệu nếu bị thiếu trường
        if (currentTab === 'vocab') {
          title = item.word || '(Lỗi dữ liệu)';
          subtitle = item.reading ? `(${item.reading})` : '';
          content = item.mean || '';
          idValue = item.word;
        } else {
          title = item.structure || '(Lỗi dữ liệu)';
          subtitle = '';
          content = item.explain || '';
          idValue = item.structure;
        }

        const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';

        card.innerHTML = `
                    <input type="checkbox" class="item-checkbox" value="${idValue}">
                    <div class="card-content">
                        <h3>${title} <span class="card-reading">${subtitle}</span></h3>
                        <p>${content}</p>
                        <small style="color:#ccc; font-size:11px;">${dateStr}</small>
                    </div>
                    <button class="delete-btn" style="background:#ffebee; color:#d32f2f; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Xóa</button>
                `;

        // Logic Checkbox
        const checkbox = card.querySelector('.item-checkbox');
        checkbox.onchange = () => {
          updateBulkDeleteButton();
          if (!checkbox.checked && selectAllCheckbox) selectAllCheckbox.checked = false;
        };

        // Logic Xóa Lẻ
        card.querySelector('.delete-btn').onclick = () => {
          if (confirm(`Xóa mục: "${title}"?`)) {
            deleteBulkItems([idValue]);
          }
        };

        contentArea.appendChild(card);
        updateBulkDeleteButton();
      } catch (err) {
        console.error("Lỗi khi render 1 thẻ:", err);
      }
    });
  }

  // --- HÀM CẬP NHẬT TRẠNG THÁI NÚT XÓA NHIỀU ---
  function updateBulkDeleteButton() {
    if (!selectedCountSpan || !btnDeleteMulti) return;

    const count = document.querySelectorAll('.item-checkbox:checked').length;
    selectedCountSpan.textContent = count;

    if (count > 0) {
      btnDeleteMulti.disabled = false;
      btnDeleteMulti.style.opacity = '1';
    } else {
      btnDeleteMulti.disabled = true;
      btnDeleteMulti.style.opacity = '0.6';
    }
  }

  // --- HÀM XÓA (XỬ LÝ CẢ LẺ VÀ NHIỀU) ---
  function deleteBulkItems(idsToDelete) {
    const storageKey = currentTab === 'vocab' ? 'savedVocab' : 'savedGrammar';
    const idKey = currentTab === 'vocab' ? 'word' : 'structure';

    chrome.storage.local.get([storageKey], (result) => {
      let list = result[storageKey] || [];

      // Lọc: Giữ lại những item KHÔNG nằm trong danh sách cần xóa
      const newList = list.filter(item => !idsToDelete.includes(item[idKey]));

      chrome.storage.local.set({ [storageKey]: newList }, () => {
        console.log(`Đã xóa ${idsToDelete.length} mục.`);

        // Reset UI thủ công
        if (selectAllCheckbox) selectAllCheckbox.checked = false;

        if (btnDeleteMulti) {
          btnDeleteMulti.disabled = true;
          btnDeleteMulti.style.opacity = '0.6';
        }
        if (selectedCountSpan) {
          selectedCountSpan.textContent = '0';
        }

        loadData();
      });
    });
  }

  // --- HÀM RENDER SETTINGS TAB ---
  function renderSettings() {
    if (!contentArea) return;

    // Ẩn action bar khi ở settings
    if (actionBar) actionBar.style.display = 'none';

    // Lấy API key hiện tại (nếu có)
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      const currentKey = result.geminiApiKey || '';
      const maskedKey = currentKey ? currentKey.substring(0, 10) + '...' + currentKey.substring(currentKey.length - 4) : 'Chưa thiết lập';

      contentArea.innerHTML = `
        <div class="settings-container">
          <h2 class="settings-title">⚙️ Cài đặt API</h2>
          
          <div class="settings-card">
            <h3 class="settings-card-title"> Gemini API Key</h3>
            <p class="settings-card-text">
              API key hiện tại: <code class="api-key-display">${maskedKey}</code>
            </p>
            
            <div class="input-group">
              <label class="input-label">
                Nhập API Key mới:
              </label>
              <input type="password" id="api-key-input" placeholder="AIzaSy..." class="api-input">
              <small class="helper-text">
                Lấy API key tại: <a href="https://makersuite.google.com/app/apikey" target="_blank" class="link-blue">Google AI Studio</a>
              </small>
            </div>
            
            <div class="button-group">
              <button id="save-api-btn" class="btn-save">
                 Lưu API Key
              </button>
              <button id="test-api-btn" class="btn-test">
                 Test API
              </button>
            </div>
            
            <div id="api-status" class="status-box"></div>
          </div>
          
          <div class="security-note">
            <h4 class="security-title"> Lưu ý bảo mật:</h4>
            <ul class="security-list">
              <li>API key được lưu an toàn trong bộ nhớ local của trình duyệt</li>
              <li>Không bao giờ chia sẻ API key với người khác</li>
              <li>Nếu upload code lên GitHub, API key sẽ KHÔNG bị lộ</li>
            </ul>
          </div>
        </div>
      `;

      // Event handlers
      const saveBtn = document.getElementById('save-api-btn');
      const testBtn = document.getElementById('test-api-btn');
      const apiInput = document.getElementById('api-key-input');
      const statusDiv = document.getElementById('api-status');

      if (saveBtn) {
        saveBtn.onclick = () => {
          const newKey = apiInput.value.trim();
          if (!newKey) {
            showStatus(' Vui lòng nhập API key', 'error');
            return;
          }

          if (!newKey.startsWith('AIza')) {
            showStatus(' API key không hợp lệ (phải bắt đầu bằng AIza)', 'warning');
            return;
          }

          chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            showStatus(' Đã lưu API key thành công!', 'success');
            apiInput.value = '';

            // Reload lại UI sau 1.5s
            setTimeout(() => renderSettings(), 1500);
          });
        };
      }

      if (testBtn) {
        testBtn.onclick = async () => {
          const keyToTest = apiInput.value.trim() || currentKey;
          if (!keyToTest) {
            showStatus(' Không có API key để test', 'error');
            return;
          }

          showStatus(' Đang test API...', 'info');

          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${keyToTest}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Hello' }] }]
                })
              }
            );

            if (response.ok) {
              showStatus(' API key hoạt động tốt!', 'success');
            } else {
              const error = await response.json();
              showStatus(` API key không hợp lệ: ${error.error?.message || 'Unknown error'}`, 'error');
            }
          } catch (err) {
            showStatus(` Lỗi kết nối: ${err.message}`, 'error');
          }
        };
      }

      function showStatus(message, type) {
        if (!statusDiv) return;

        const colors = {
          success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
          error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
          warning: { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' },
          info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
        };

        const color = colors[type] || colors.info;
        statusDiv.style.display = 'block';
        statusDiv.style.background = color.bg;
        statusDiv.style.color = color.text;
        statusDiv.style.border = `1px solid ${color.border}`;
        statusDiv.textContent = message;
      }
    });
  }
});