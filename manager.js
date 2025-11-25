document.addEventListener('DOMContentLoaded', () => {
  console.log("=== MANAGER SCRIPT (2 COLUMNS MODE - GROUP BY DATE) ===");

  // Elements
  const btnSettings = document.getElementById('btn-settings');
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const actionBar = document.getElementById('action-bar');

  // Vocab & Grammar elements
  const vocabContent = document.getElementById('vocab-content');
  const grammarContent = document.getElementById('grammar-content');

  // Action bar elements (chung)
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const selectedCountSpan = document.getElementById('selected-count');

  // State
  let currentView = 'main'; // 'main' or 'settings'

  // Init - Load cả 2 loại data
  loadBothData();

  // === SỰ KIỆN NÚT SETTINGS ===
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
    settingsView.style.display = 'block';
    btnSettings.classList.add('active');
    btnSettings.textContent = '← Quay lại';
    renderSettings();
  }

  function showMainView() {
    currentView = 'main';
    mainView.style.display = 'grid';
    actionBar.style.display = 'flex';
    settingsView.style.display = 'none';
    btnSettings.classList.remove('active');
    btnSettings.textContent = '⚙️ Cài đặt API';
  }

  // === LOAD DATA ===
  function loadBothData() {
    loadVocabData();
    loadGrammarData();
  }

  function loadVocabData() {
    chrome.storage.local.get(['savedVocab'], (result) => {
      const list = result.savedVocab || [];
      console.log("Từ vựng:", list.length);
      renderVocabList(list);
      updateActionBar();
    });
  }

  function loadGrammarData() {
    chrome.storage.local.get(['savedGrammar'], (result) => {
      const list = result.savedGrammar || [];
      console.log("Ngữ pháp:", list.length);
      renderGrammarList(list);
      updateActionBar();
    });
  }

  // === NHÓM THEO NGÀY ===
  function groupByDate(list) {
    const groups = {};

    list.forEach(item => {
      const dateObj = item.date ? new Date(item.date) : new Date();
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateObj,
          items: []
        };
      }
      groups[dateKey].items.push(item);
    });

    // Sắp xếp theo ngày mới nhất trước
    return Object.entries(groups)
      .sort((a, b) => b[1].date - a[1].date)
      .map(([key, value]) => value);
  }

  function formatDateHeader(date, count) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return `📅 Hôm nay (${count})`;
    if (dateStr === yesterdayStr) return `📅 Hôm qua (${count})`;

    // Format: ngày/tháng/năm
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `📅 ${day}/${month}/${year} (${count})`;
  }

  // === RENDER VOCAB ===
  function renderVocabList(list) {
    if (!vocabContent) return;
    vocabContent.innerHTML = '';

    if (list.length === 0) {
      vocabContent.innerHTML = '<div class="empty-state">Chưa có từ vựng nào.</div>';
      return;
    }

    const groups = groupByDate(list);

    groups.forEach(group => {
      // Tạo date header với số lượng
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      dateHeader.textContent = formatDateHeader(group.date, group.items.length);
      vocabContent.appendChild(dateHeader);

      // Tạo nhóm cards
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';

      group.items.forEach((item) => {
        const card = createVocabCard(item);
        dateGroup.appendChild(card);
      });

      vocabContent.appendChild(dateGroup);
    });

    updateDeleteButton();
  }

  function createVocabCard(item) {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <input type="checkbox" class="item-checkbox vocab-checkbox" value="${item.word}" data-type="vocab">
      <div class="card-content">
        <h3>
          ${item.word}
          <span class="btn-speak" title="Nghe phát âm">🔊</span>
          <span class="card-reading">(${item.reading})</span>
        </h3>
        <p>${item.mean}</p>
      </div>
      <button class="delete-btn">Xóa</button>
    `;

    // Sự kiện loa
    card.querySelector('.btn-speak').onclick = (e) => {
      e.stopPropagation();
      speakJapanese(item.word);
    };

    // Sự kiện checkbox
    const checkbox = card.querySelector('.item-checkbox');
    checkbox.onchange = () => updateDeleteButton();

    // Sự kiện xóa
    card.querySelector('.delete-btn').onclick = () => {
      if (confirm(`Xóa từ: "${item.word}"?`)) {
        deleteItems([{ type: 'vocab', id: item.word }]);
      }
    };

    return card;
  }

  // === RENDER GRAMMAR ===
  function renderGrammarList(list) {
    if (!grammarContent) return;
    grammarContent.innerHTML = '';

    if (list.length === 0) {
      grammarContent.innerHTML = '<div class="empty-state">Chưa có ngữ pháp nào.</div>';
      return;
    }

    const groups = groupByDate(list);

    groups.forEach(group => {
      // Tạo date header với số lượng
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header grammar';
      dateHeader.textContent = formatDateHeader(group.date, group.items.length);
      grammarContent.appendChild(dateHeader);

      // Tạo nhóm cards
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';

      group.items.forEach((item) => {
        const card = createGrammarCard(item);
        dateGroup.appendChild(card);
      });

      grammarContent.appendChild(dateGroup);
    });

    updateDeleteButton();
  }

  function createGrammarCard(item) {
    const card = document.createElement('div');
    card.className = 'card grammar';

    card.innerHTML = `
      <input type="checkbox" class="item-checkbox grammar-checkbox" value="${item.structure}" data-type="grammar">
      <div class="card-content">
        <h3>${item.structure}</h3>
        <p>${item.explain}</p>
      </div>
      <button class="delete-btn">Xóa</button>
    `;

    // Sự kiện checkbox
    const checkbox = card.querySelector('.item-checkbox');
    checkbox.onchange = () => updateDeleteButton();

    // Sự kiện xóa
    card.querySelector('.delete-btn').onclick = () => {
      if (confirm(`Xóa ngữ pháp: "${item.structure}"?`)) {
        deleteItems([{ type: 'grammar', id: item.structure }]);
      }
    };

    return card;
  }

  // === SELECT ALL (CHUNG) ===
  if (selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
      const checkboxes = document.querySelectorAll('.item-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
      updateDeleteButton();
    };
  }

  // === DELETE (CHUNG) ===
  if (btnDeleteSelected) {
    btnDeleteSelected.onclick = () => {
      const checkboxes = document.querySelectorAll('.item-checkbox:checked');
      if (checkboxes.length === 0) return;

      if (confirm(`Bạn có chắc muốn xóa ${checkboxes.length} mục đã chọn không?`)) {
        const itemsToDelete = Array.from(checkboxes).map(cb => ({
          type: cb.dataset.type,
          id: cb.value
        }));
        deleteItems(itemsToDelete);
      }
    };
  }

  // === UPDATE DELETE BUTTON ===
  function updateDeleteButton() {
    if (!selectedCountSpan || !btnDeleteSelected) return;

    const count = document.querySelectorAll('.item-checkbox:checked').length;
    selectedCountSpan.textContent = count;
    btnDeleteSelected.disabled = count === 0;
  }

  // === UPDATE ACTION BAR VISIBILITY ===
  function updateActionBar() {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      const vocabCount = (result.savedVocab || []).length;
      const grammarCount = (result.savedGrammar || []).length;

      if (actionBar) {
        actionBar.style.display = (vocabCount > 0 || grammarCount > 0) ? 'flex' : 'none';
      }
    });
  }

  // === DELETE ITEMS (CHUNG) ===
  function deleteItems(itemsToDelete) {
    const vocabIds = itemsToDelete.filter(item => item.type === 'vocab').map(item => item.id);
    const grammarIds = itemsToDelete.filter(item => item.type === 'grammar').map(item => item.id);

    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      let updates = {};

      if (vocabIds.length > 0) {
        const vocabList = result.savedVocab || [];
        const newVocabList = vocabList.filter(item => !vocabIds.includes(item.word));
        updates.savedVocab = newVocabList;
      }

      if (grammarIds.length > 0) {
        const grammarList = result.savedGrammar || [];
        const newGrammarList = grammarList.filter(item => !grammarIds.includes(item.structure));
        updates.savedGrammar = newGrammarList;
      }

      chrome.storage.local.set(updates, () => {
        console.log(`Đã xóa: ${vocabIds.length} từ vựng, ${grammarIds.length} ngữ pháp`);
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        loadBothData();
      });
    });
  }

  // === TEXT TO SPEECH ===
  function speakJapanese(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find(voice => voice.lang === 'ja-JP' || voice.name.includes('Japanese'));
    if (jpVoice) utterance.voice = jpVoice;

    window.speechSynthesis.speak(utterance);
  }

  // === RENDER SETTINGS ===
  function renderSettings() {
    if (!settingsView) return;

    chrome.storage.local.get(['geminiApiKey'], (result) => {
      const currentKey = result.geminiApiKey || '';
      const maskedKey = currentKey ? currentKey.substring(0, 10) + '...' + currentKey.substring(currentKey.length - 4) : 'Chưa thiết lập';

      settingsView.innerHTML = `
        <div class="settings-container">
          <h2 class="settings-title">⚙️ Cài đặt API</h2>
          
          <div class="settings-card">
            <h3 class="settings-card-title">🔑 Gemini API Key</h3>
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
                💾 Lưu API Key
              </button>
              <button id="test-api-btn" class="btn-test">
                🧪 Test API
              </button>
            </div>
            
            <div id="api-status" class="status-box"></div>
          </div>
          
          <div class="security-note">
            <h4 class="security-title">⚠️ Lưu ý bảo mật:</h4>
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
            showStatus('⚠️ Vui lòng nhập API key', 'error');
            return;
          }

          if (!newKey.startsWith('AIza')) {
            showStatus('⚠️ API key không hợp lệ (phải bắt đầu bằng AIza)', 'warning');
            return;
          }

          chrome.storage.local.set({ geminiApiKey: newKey }, () => {
            showStatus('✅ Đã lưu API key thành công!', 'success');
            apiInput.value = '';
            setTimeout(() => renderSettings(), 1500);
          });
        };
      }

      if (testBtn) {
        testBtn.onclick = async () => {
          const keyToTest = apiInput.value.trim() || currentKey;
          if (!keyToTest) {
            showStatus('⚠️ Không có API key để test', 'error');
            return;
          }

          showStatus('🔄 Đang test API...', 'info');

          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToTest}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Hello' }] }]
                })
              }
            );

            if (response.ok) {
              showStatus('✅ API key hoạt động tốt!', 'success');
            } else {
              const error = await response.json();
              showStatus(`❌ API key không hợp lệ: ${error.error?.message || 'Unknown error'}`, 'error');
            }
          } catch (err) {
            showStatus(`❌ Lỗi kết nối: ${err.message}`, 'error');
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