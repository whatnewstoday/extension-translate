// ==========================================
// 1. CSS STYLING
// ==========================================
const style = document.createElement('style');
style.innerHTML = `
  #gemini-translator-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
    background: #20232b;
    color: #ffffff;
    border: 1px solid #4a4d52;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-family: 'Segoe UI', sans-serif;
    user-select: none;
    
    display: none;
    flex-direction: column;
    width: 450px;
    max-width: 90vw;
    max-height: 80vh;
    min-height: 150px;
    
    resize: both;
    overflow: hidden;
  }

  #gemini-translator-popup.active {
    display: flex;
  }
  /*header controls*/
  #gemini-translator-popup h4 {
    margin: 0;
    padding: 12px 15px;
    background: #2b303b;
    color: #4CAF50;
    border-bottom: 1px solid #4a4d52;
    cursor: move;
    flex-shrink: 0;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #close-gemini-popup {
    background: transparent;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 24px;
    line-height: 1;
    padding: 0 5px;
    border-radius: 4px;
    transition: color 0.2s;
  }
  #close-gemini-popup:hover {
    color: #ff5252;
    background: rgba(255,255,255,0.1);
  }

  #gemini-content-area {
    padding: 15px;
    overflow-y: auto;
    overscroll-behavior: contain;
    flex-grow: 1;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
  }

  #gemini-content-area::-webkit-scrollbar { width: 8px; }
  #gemini-content-area::-webkit-scrollbar-track { background: #20232b; }
  #gemini-content-area::-webkit-scrollbar-thumb { background: #4a4d52; border-radius: 4px; }

  #gemini-content-area ul { padding-left: 20px; margin: 5px 0; }
  #gemini-content-area li { margin-bottom: 8px; }
  #gemini-content-area hr { border: 0; border-top: 1px solid #4a4d52; margin: 15px 0; }
  #gemini-content-area b { color: #81C784; }
  
  .spinner {
    border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #4CAF50;
    border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite;
    display: inline-block; vertical-align: middle; margin-right: 8px;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-btn {
    background: transparent;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 20px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #close-gemini-popup:hover {
    color: #ff5252;
    background: rgba(255,255,255,0.1);
  }

  #open-manager-btn:hover {
    color: #4CAF50;
    background: rgba(255,255,255,0.1);
    transform: scale(1.1);
  }

  /* ===== HISTORY SECTION ===== */
  #history-section {
    margin-top: 15px;
    border-top: 2px solid #4a4d52;
    padding-top: 10px;
  }

  .history-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    color: #888;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .history-count {
    font-size: 11px;
    color: #666;
  }

  /* Result Item (Main + History) */
  .result-item {
    margin-bottom: 8px;
    border: 1px solid #4a4d52;
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .result-item:hover {
    border-color: #4CAF50;
  }

  .result-header {
    display: flex;
    align-items: flex-start; /* Đảm bảo khi text quá dài, icon vẫn nằm trên cùng */
    justify-content: space-between;
    padding: 10px 12px;
    background: #2b303b;
    user-select: none;
    width: 100%; /* Chiếm toàn bộ chiều rộng */
    box-sizing: border-box; /* Bao gồm padding và border */
  }

  .result-header-main {
    display: flex;
    align-items: flex-start; /* icon mũi tên và text căn đầu dòng */
    gap: 8px;
    flex: 1;
    cursor: pointer;
    min-width: 0; /* Cho phép text overflow */
    margin-right: 8px; /* Tạo khoảng cách giữa nút và text */
    overflow: hidden; /* Ẩn text khi vượt quá chiều rộng */
    text-overflow: ellipsis; /* Hiển thị dấu ba chấm khi text bị cắt */
    white-space: nowrap; /* Ngăn text không xuống dòng */
  }

  .result-header-main:hover {
    opacity: 0.9;
  }

  .collapse-icon {
    font-size: 10px;
    color: #4CAF50;
    transition: transform 0.2s;
    flex-shrink: 0;
    margin-top: 5px;
  }

  .result-item.collapsed .collapse-icon {
    transform: rotate(-90deg);
  }
  .result-item:not(.collapsed) .selected-text {
    white-space: normal; /* cho phép text xuống dòng */
    word-break: break-word; /* cho phép text break word nếu quá dài*/
    max-height: 150px;
    overflow-y: auto;
    padding-right: 5px; /* chừa chỗ cho thanh cuộn */
  }

  .selected-text {
    flex: 1;
    font-size: 14px;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: max-height 0.3s ease;
  }
  .selected-text::-webkit-scrollbar { width: 4px; }
  .selected-text::-webkit-scrollbar-track { background: transparent; }
  .selected-text::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }

  .delete-history-btn {
    background: transparent;
    border: none;
    color: #ff5252;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    opacity: 0.6;
    transition: opacity 0.2s;
    flex-shrink: 0; /* không cho phép nút xóa thu hẹp */
    margin-top: -2px;
  }

  .delete-history-btn:hover {
    opacity: 1;
    background: rgba(255, 82, 82, 0.1);
    border-radius: 4px;
  }

  .result-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    
  }

  .result-body.active {
    max-height: 2000px;
    padding: 12px;
    border-top: 1px solid #3e4147;
  }

  .empty-state {
    text-align: center;
    color: #888;
    padding: 20px;
    font-style: italic;
  }

  .btn-speak {
    transition: transform 0.2s;
    display: inline-block;
    opacity: 0.7;
    cursor: pointer;
  }

  .btn-speak:hover {
    transform: scale(1.2);
    opacity: 1;
  }

  .btn-speak:active {
    transform: scale(0.9);
  }
`;
document.head.appendChild(style);

// ==========================================
// 2. CREATE POPUP
// ==========================================
let popup = document.getElementById('gemini-translator-popup');

function restorePopupPosition() {
  chrome.storage.local.get(['popupPosition'], (result) => {
    if (result.popupPosition && popup) {
      //apply saved position
      popup.style.top = result.popupPosition.top;
      popup.style.left = result.popupPosition.left;
      //reset transform và margin mặc định
      popup.style.transform = 'none';
      popup.style.margin = '0';
    }
  });
}

if (!popup) {
  popup = document.createElement('div');
  popup.id = 'gemini-translator-popup';

  popup.innerHTML = `
        <h4>
            <span>Gemini Japanese AI</span>
            <div class="header-controls">
                 <button id="open-manager-btn" class="header-btn" title="Mở sổ tay từ vựng">📖</button>
                 <button id="close-gemini-popup" class="header-btn" title="Đóng">&times;</button>
            </div>
        </h4>
        <div id="gemini-content-area">
            <!-- Main result -->
            <div id="main-result" class="result-item">
                <div class="result-header">
                    <div class="result-header-main">
                        <span class="collapse-icon">▼</span>
                        <span class="selected-text">Đang tải...</span>
                    </div>
                </div>
                <div class="result-body active">
                    <div class="spinner"></div> Đang phân tích...
                </div>
            </div>
            
            <!-- History section -->
            <div id="history-section">
                <div class="history-title">
                    <span>📜 Lịch sử</span>
                </div>
                <div id="history-list"></div>
            </div>
        </div>
    `;
  document.body.appendChild(popup);

  restorePopupPosition();

  // Event: Manager button
  const managerBtn = popup.querySelector('#open-manager-btn');
  managerBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  managerBtn.onclick = (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: "openOptionsPage" });
  };

  // Event: Close button
  const closeBtn = popup.querySelector('#clear-main-result');
  if (closeBtn) {
    closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      //reset về trạng thái trống
      const mainResult = document.getElementById('main-result');
      const mainBody = mainResult.querySelector('.result-body');
      mainResult.classList.add('collapsed');
      mainBody.innerHTML = '<div style="padding: 10px; text-align:center; color:#888">Đã xóa kết quả hiện tại</div>';
      mainResult.querySelector('.selected-text').textContent = '(Trống)';
    }
  }
}

const closeBtn = document.getElementById('close-gemini-popup');
const headerHandler = popup.querySelector('h4');
const contentArea = document.getElementById('gemini-content-area');

// ==========================================
// 3. EVENT HANDLERS
// ==========================================

// Close button
closeBtn.onclick = (e) => {
  e.stopPropagation();
  popup.classList.remove('active');
};

// Drag and drop
let isDragging = false;
let offsetX, offsetY;

headerHandler.addEventListener('mousedown', (e) => {
  if (e.target.closest('#close-gemini-popup')) return;

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

    // [FIX LỖI CONTEXT INVALIDATED]
    // Kiểm tra xem Extension context còn hợp lệ không trước khi gọi API
    if (!chrome.runtime?.id) {
      console.warn("Extension đã được reload. Vui lòng F5 trang web.");
      return; // Dừng lại, không gọi chrome.storage nữa
    }
    // Lưu vị trí khi thả chuột
    if (popup) {
      const position = {
        top: popup.style.top,
        left: popup.style.left
      };
      chrome.storage.local.set({ popupPosition: position }, () => {
        console.log("Đã lưu vị trí popup:", position);
      });
    }
  }
});
// ==========================================
// 4. HISTORY MANAGEMENT
// ==========================================

// Auto-cleanup old history (30 days)
function cleanupOldHistory() {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    let history = data.analysisHistory || [];
    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    const filtered = history.filter(item => {
      return (now - item.timestamp) < thirtyDaysInMs;
    });

    if (filtered.length !== history.length) {
      chrome.storage.local.set({ analysisHistory: filtered });
      console.log(`Đã xóa ${history.length - filtered.length} lịch sử cũ (>30 ngày)`);
    }
  });
}

// Save to history
function saveToHistory(selectedText, type, resultData) {
  const historyItem = {
    id: Date.now().toString(),
    selectedText: selectedText,
    type: type,
    result: resultData,
    timestamp: Date.now()
  };

  chrome.storage.local.get(['analysisHistory'], (data) => {
    let history = data.analysisHistory || [];

    history.unshift(historyItem);

    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    chrome.storage.local.set({ analysisHistory: history }, () => {
      renderHistory();
    });
  });
}

// Render history (show only 5 items)
function renderHistory() {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    const allHistory = data.analysisHistory || [];
    const historyList = document.getElementById('history-list');
    const historyTitle = document.querySelector('.history-title');

    if (allHistory.length === 0) {
      historyList.innerHTML = '<div class="empty-state">Chưa có lịch sử</div>';
      historyTitle.innerHTML = '<span>📜 Lịch sử</span>';
      return;
    }

    historyTitle.innerHTML = `
      <span>📜 Lịch sử</span>
      <span class="history-count">(${Math.min(5, allHistory.length)}/${allHistory.length})</span>
    `;

    const displayHistory = allHistory.slice(0, 5);

    historyList.innerHTML = '';
    displayHistory.forEach(item => {
      const historyItem = createHistoryItem(item);
      historyList.appendChild(historyItem);
    });
  });
}

// Create history item
function createHistoryItem(item) {
  const div = document.createElement('div');
  div.className = 'result-item collapsed';
  div.dataset.id = item.id;

  const header = document.createElement('div');
  header.className = 'result-header';

  const headerMain = document.createElement('div');
  headerMain.className = 'result-header-main';
  headerMain.innerHTML = `
    <span class="collapse-icon">▼</span>
    <span class="selected-text">${escapeHtml(item.selectedText)}</span>
  `;
  headerMain.onclick = () => toggleResultItem(div);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-history-btn';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.title = 'Xóa lịch sử này';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteHistoryItem(item.id);
  };

  header.appendChild(headerMain);
  header.appendChild(deleteBtn);

  const body = document.createElement('div');
  body.className = 'result-body';
  renderAnalysisUI(body, item.result);

  div.appendChild(header);
  div.appendChild(body);

  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Delete history item
function deleteHistoryItem(itemId) {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    let history = data.analysisHistory || [];

    history = history.filter(item => item.id !== itemId);

    chrome.storage.local.set({ analysisHistory: history }, () => {
      console.log(`Đã xóa lịch sử ${itemId}`);
      renderHistory();
    });
  });
}

// Toggle accordion
function toggleResultItem(itemElement) {
  const isCurrentlyExpanded = !itemElement.classList.contains('collapsed');

  document.querySelectorAll('.result-item').forEach(item => {
    item.classList.add('collapsed');
    item.querySelector('.result-body').classList.remove('active');
  });

  if (!isCurrentlyExpanded) {
    itemElement.classList.remove('collapsed');
    itemElement.querySelector('.result-body').classList.add('active');
  }
}

// Toggle main result
document.querySelector('#main-result .result-header-main').onclick = () => {
  toggleResultItem(document.getElementById('main-result'));
};

// Init: cleanup old history
cleanupOldHistory();
renderHistory();

// ==========================================
// 5. MESSAGE LISTENER
// ==========================================
chrome.runtime.onMessage.addListener((request) => {
  const mainResult = document.getElementById('main-result');
  const mainBody = mainResult.querySelector('.result-body');

  switch (request.action) {
    case "showLoading":
      //khi popup hiện lại, kiểm tra và khôi phục vị trí
      restorePopupPosition();

      contentArea.scrollTop = 0;
      mainBody.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <div class="spinner"></div> Đang phân tích...
                </div>
            `;
      mainResult.querySelector('.selected-text').textContent = request.originalText || 'Đang tải...';
      mainResult.classList.remove('collapsed');
      mainBody.classList.add('active');
      popup.classList.add('active');
      break;

    case "displayResult":
      mainBody.innerHTML = '';
      renderAnalysisUI(mainBody, request.data);

      mainResult.querySelector('.selected-text').textContent = request.originalText || 'Kết quả mới';

      saveToHistory(request.originalText, request.data.type || 'analysis', request.data);

      mainResult.classList.remove('collapsed');
      mainBody.classList.add('active');
      break;

    case "displayError":
      mainBody.innerHTML = `<p style="color:#ff5252;">Lỗi: ${request.message}</p>`;
      break;
  }
});

// ==========================================
// 6. RENDER UI
// ==========================================
function renderAnalysisUI(container, data) {
  if (data.translatedText) {
    container.innerHTML = `<p><strong>Kết quả:</strong></p><p>${data.translatedText}</p>`;
    return;
  }

  const meaningEl = document.createElement('div');
  meaningEl.innerHTML = `<b>Ý nghĩa:</b> ${data.meaning} <hr>`;
  container.appendChild(meaningEl);

  if (data.vocab && data.vocab.length > 0) {
    const vocabTitle = document.createElement('div');
    vocabTitle.innerHTML = `<b>Từ vựng:</b>`;
    container.appendChild(vocabTitle);

    const ul = document.createElement('ul');
    data.vocab.forEach(word => {
      const li = document.createElement('li');
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";
      li.style.marginBottom = "5px";

      const textSpan = document.createElement('span');
      textSpan.innerHTML = `<span style="color:#81C784; font-weight:bold;">${word.word}</span> (${word.reading}) : ${word.mean}`;

      const saveBtn = createSaveButton();
      saveBtn.onclick = () => saveVocabulary(word, saveBtn);

      li.appendChild(textSpan);
      li.appendChild(saveBtn);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  if (data.grammar && data.grammar.length > 0) {
    const grammarTitle = document.createElement('div');
    grammarTitle.innerHTML = `<hr><b>Ngữ pháp & Cấu trúc:</b>`;
    container.appendChild(grammarTitle);

    const ulGrammar = document.createElement('ul');
    data.grammar.forEach(gram => {
      const li = document.createElement('li');
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "start";
      li.style.marginBottom = "8px";

      const textSpan = document.createElement('span');
      textSpan.style.flex = "1";
      textSpan.style.marginRight = "10px";
      textSpan.innerHTML = `<b style="color:#FFB74D">${gram.structure}</b>: ${gram.explain}`;

      const saveBtn = createSaveButton();
      saveBtn.onclick = () => saveGrammar(gram, saveBtn);

      li.appendChild(textSpan);
      li.appendChild(saveBtn);
      ulGrammar.appendChild(li);
    });
    container.appendChild(ulGrammar);
  }
}

function createSaveButton() {
  const btn = document.createElement('button');
  btn.innerHTML = "💾";
  btn.title = "Lưu lại";
  btn.style.cssText = "background:none; border:1px solid #555; color:#fff; cursor:pointer; padding:2px 6px; border-radius:4px; font-size:12px; height: 24px; min-width: 28px;";
  return btn;
}

function saveVocabulary(wordObj, btnElement) {
  chrome.storage.local.get(['savedVocab'], (result) => {
    let currentList = result.savedVocab || [];

    if (!wordObj || !wordObj.word) {
      alert("Không thể lưu từ này do lỗi dữ liệu.");
      return;
    }

    const exists = currentList.some(item => item.word === wordObj.word);

    if (!exists) {
      const newEntry = { ...wordObj, date: new Date().toISOString() };
      currentList.push(newEntry);

      chrome.storage.local.set({ savedVocab: currentList }, () => {
        updateBtnStatus(btnElement);
      });
    } else {
      alert("Từ này đã có trong sổ tay!");
    }
  });
}

function saveGrammar(gramObj, btnElement) {
  chrome.storage.local.get(['savedGrammar'], (result) => {
    let currentList = result.savedGrammar || [];

    if (!gramObj || !gramObj.structure) {
      return;
    }

    const exists = currentList.some(item => item.structure === gramObj.structure);

    if (!exists) {
      const newEntry = { ...gramObj, date: new Date().toISOString() };
      currentList.push(newEntry);

      chrome.storage.local.set({ savedGrammar: currentList }, () => {
        updateBtnStatus(btnElement);
      });
    } else {
      alert("Ngữ pháp này đã lưu rồi!");
    }
  });
}

function updateBtnStatus(btn) {
  btn.innerHTML = "✅";
  btn.style.borderColor = "#4CAF50";
  btn.style.color = "#4CAF50";
  btn.disabled = true;
}