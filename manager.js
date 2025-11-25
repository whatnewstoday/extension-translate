document.addEventListener('DOMContentLoaded', () => {
  console.log("=== MANAGER SCRIPT (2 COLUMNS MODE) ===");

  // Elements
  const btnSettings = document.getElementById('btn-settings');
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');

  // Vocab elements
  const vocabContent = document.getElementById('vocab-content');
  const selectAllVocab = document.getElementById('select-all-vocab');
  const btnDeleteVocab = document.getElementById('btn-delete-vocab');
  const vocabCountSpan = document.getElementById('vocab-count');

  // Grammar elements
  const grammarContent = document.getElementById('grammar-content');
  const selectAllGrammar = document.getElementById('select-all-grammar');
  const btnDeleteGrammar = document.getElementById('btn-delete-grammar');
  const grammarCountSpan = document.getElementById('grammar-count');

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
    settingsView.style.display = 'block';
    btnSettings.classList.add('active');
    btnSettings.textContent = '← Quay lại';
    renderSettings();
  }

  function showMainView() {
    currentView = 'main';
    mainView.style.display = 'grid';
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
    });
  }

  function loadGrammarData() {
    chrome.storage.local.get(['savedGrammar'], (result) => {
      const list = result.savedGrammar || [];
      console.log("Ngữ pháp:", list.length);
      renderGrammarList(list);
    });
  }

  // === RENDER VOCAB ===
  function renderVocabList(list) {
    if (!vocabContent) return;
    vocabContent.innerHTML = '';

    if (list.length === 0) {
      vocabContent.innerHTML = '<div class="empty-state">Chưa có từ vựng nào.</div>';
      return;
    }

    [...list].reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';

      const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';

      card.innerHTML = `
        <input type="checkbox" class="vocab-checkbox" value="${item.word}">
        <div class="card-content">
          <h3>
            ${item.word}
            <span class="btn-speak" title="Nghe phát âm">🔊</span>
            <span class="card-reading">(${item.reading})</span>
          </h3>
          <p>${item.mean}</p>
          <small style="color:#999; font-size:11px;">${dateStr}</small>
        </div>
        <button class="delete-btn">Xóa</button>
      `;

      // Sự kiện loa
      card.querySelector('.btn-speak').onclick = (e) => {
        e.stopPropagation();
        speakJapanese(item.word);
      };

      // Sự kiện checkbox
      const checkbox = card.querySelector('.vocab-checkbox');
      checkbox.onchange = () => updateVocabDeleteButton();

      // Sự kiện xóa
      card.querySelector('.delete-btn').onclick = () => {
        if (confirm(`Xóa từ: "${item.word}"?`)) {
          deleteVocabItems([item.word]);
        }
      };

      vocabContent.appendChild(card);
    });

    updateVocabDeleteButton();
  }

  // === RENDER GRAMMAR ===
  function renderGrammarList(list) {
    if (!grammarContent) return;
    grammarContent.innerHTML = '';

    if (list.length === 0) {
      grammarContent.innerHTML = '<div class="empty-state">Chưa có ngữ pháp nào.</div>';
      return;
    }

    [...list].reverse().forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card grammar';

      const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';

      card.innerHTML = `
        <input type="checkbox" class="grammar-checkbox" value="${item.structure}">
        <div class="card-content">
          <h3>${item.structure}</h3>
          <p>${item.explain}</p>
          <small style="color:#999; font-size:11px;">${dateStr}</small>
        </div>
        <button class="delete-btn">Xóa</button>
      `;

      // Sự kiện checkbox
      const checkbox = card.querySelector('.grammar-checkbox');
      checkbox.onchange = () => updateGrammarDeleteButton();

      // Sự kiện xóa
      card.querySelector('.delete-btn').onclick = () => {
        if (confirm(`Xóa ngữ pháp: "${item.structure}"?`)) {
          deleteGrammarItems([item.structure]);
        }
      };

      grammarContent.appendChild(card);
    });

    updateGrammarDeleteButton();
  }

  // === VOCAB: SELECT ALL ===
  if (selectAllVocab) {
    selectAllVocab.onchange = () => {
      const checkboxes = document.querySelectorAll('.vocab-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllVocab.checked);
      updateVocabDeleteButton();
    };
  }

  // === GRAMMAR: SELECT ALL ===
  if (selectAllGrammar) {
    selectAllGrammar.onchange = () => {
      const checkboxes = document.querySelectorAll('.grammar-checkbox');
      checkboxes.forEach(cb => cb.checked = selectAllGrammar.checked);
      updateGrammarDeleteButton();
    };
  }

  // === VOCAB: DELETE BUTTON ===
  if (btnDeleteVocab) {
    btnDeleteVocab.onclick = () => {
      const checkboxes = document.querySelectorAll('.vocab-checkbox:checked');
      if (checkboxes.length === 0) return;

      if (confirm(`Xóa ${checkboxes.length} từ vựng đã chọn?`)) {
        const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
        deleteVocabItems(idsToDelete);
      }
    };
  }

  // === GRAMMAR: DELETE BUTTON ===
  if (btnDeleteGrammar) {
    btnDeleteGrammar.onclick = () => {
      const checkboxes = document.querySelectorAll('.grammar-checkbox:checked');
      if (checkboxes.length === 0) return;

      if (confirm(`Xóa ${checkboxes.length} ngữ pháp đã chọn?`)) {
        const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
        deleteGrammarItems(idsToDelete);
      }
    };
  }

  // === UPDATE BUTTONS ===
  function updateVocabDeleteButton() {
    if (!vocabCountSpan || !btnDeleteVocab) return;

    const count = document.querySelectorAll('.vocab-checkbox:checked').length;
    vocabCountSpan.textContent = count;
    btnDeleteVocab.disabled = count === 0;
  }

  function updateGrammarDeleteButton() {
    if (!grammarCountSpan || !btnDeleteGrammar) return;

    const count = document.querySelectorAll('.grammar-checkbox:checked').length;
    grammarCountSpan.textContent = count;
    btnDeleteGrammar.disabled = count === 0;
  }

  // === DELETE FUNCTIONS ===
  function deleteVocabItems(idsToDelete) {
    chrome.storage.local.get(['savedVocab'], (result) => {
      let list = result.savedVocab || [];
      const newList = list.filter(item => !idsToDelete.includes(item.word));

      chrome.storage.local.set({ savedVocab: newList }, () => {
        console.log(`Đã xóa ${idsToDelete.length} từ vựng`);
        if (selectAllVocab) selectAllVocab.checked = false;
        loadVocabData();
      });
    });
  }

  function deleteGrammarItems(idsToDelete) {
    chrome.storage.local.get(['savedGrammar'], (result) => {
      let list = result.savedGrammar || [];
      const newList = list.filter(item => !idsToDelete.includes(item.structure));

      chrome.storage.local.set({ savedGrammar: newList }, () => {
        console.log(`Đã xóa ${idsToDelete.length} ngữ pháp`);
        if (selectAllGrammar) selectAllGrammar.checked = false;
        loadGrammarData();
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