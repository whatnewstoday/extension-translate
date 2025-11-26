// ==========================================
// 1. CSS STYLING
// ==========================================
const style = document.createElement('style');
style.innerHTML = `
  /* --- BASE POPUP --- */
  #gemini-translator-popup {
    position: fixed;
    top: 50%; left: 50%;
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
    min-height: 200px;
    
    resize: both;
    overflow: hidden;
  }
  #gemini-translator-popup.active { display: flex; }

  /* HEADER */
  #gemini-translator-popup h4 {
    margin: 0; padding: 12px 15px;
    background: #2b303b; color: #4CAF50;
    border-bottom: 1px solid #4a4d52;
    cursor: move; flex-shrink: 0;
    font-size: 16px; font-weight: 600;
    display: flex; justify-content: space-between; align-items: center;
  }

  .header-controls { display: flex; align-items: center; gap: 8px; }
  .header-btn {
    background: transparent; border: none; color: #aaa; cursor: pointer;
    font-size: 18px; padding: 4px; border-radius: 4px; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
  }
  .header-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
  #close-gemini-popup:hover { color: #ff5252; }

  /* MAIN CONTENT LAYOUT */
  #gemini-content-area {
    padding: 0;
    overflow-y: hidden; 
    display: flex; flex-direction: column; flex-grow: 1;
  }

  /* --- [FEATURE] TABS STYLES (2 TABS) --- */
  .tabs-nav {
    display: flex;
    background: #2b303b;
    border-bottom: 1px solid #4a4d52;
    flex-shrink: 0;
  }
  .tab-btn {
    flex: 1;
    background: none; border: none;
    color: #888;
    padding: 10px 0;
    cursor: pointer;
    font-weight: 600; font-size: 13px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .tab-btn:hover { color: #ccc; background: rgba(255,255,255,0.05); }
  .tab-btn.active { color: #4CAF50; border-bottom-color: #4CAF50; background: rgba(76, 175, 80, 0.1); }

  .tab-content-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 15px;
    overscroll-behavior: contain;
  }
  .tab-pane { display: none; }
  .tab-pane.active { display: block; }

  /* MEANING SECTION (Luôn hiện trên cùng) */
  #static-meaning {
    padding: 15px;
    background: #252830;
    border-bottom: 1px solid #4a4d52;
    font-size: 15px;
    line-height: 1.5;
    flex-shrink: 0;
  }

  /* LIST STYLES */
  ul { padding: 0; list-style: none; margin: 0; }
  li { 
    background: rgba(255,255,255,0.03); 
    margin-bottom: 8px; padding: 10px; 
    border-radius: 6px; border: 1px solid #3e4147;
  }

  /* HISTORY STYLES */
  #history-section { margin-top: 15px; border-top: 2px solid #4a4d52; padding-top: 10px; }
  .history-title { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #888; margin-bottom: 8px; }
  .result-item { margin-bottom: 8px; border: 1px solid #4a4d52; border-radius: 6px; overflow: hidden; }
  .result-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 10px 12px; background: #2b303b; width: 100%; box-sizing: border-box; gap: 10px; }
  .result-header-main { display: flex; align-items: flex-start; gap: 8px; flex: 1; cursor: pointer; min-width: 0; }
  .selected-text { flex: 1; font-size: 14px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .result-item:not(.collapsed) .selected-text { white-space: normal; word-break: break-word; max-height: 150px; overflow-y: auto; padding-right: 5px; }
  .collapse-icon { font-size: 10px; color: #4CAF50; transition: transform 0.2s; flex-shrink: 0; margin-top: 5px; }
  .result-item.collapsed .collapse-icon { transform: rotate(-90deg); }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #20232b; }
  ::-webkit-scrollbar-thumb { background: #4a4d52; border-radius: 3px; }
  .selected-text::-webkit-scrollbar { width: 4px; }
  .selected-text::-webkit-scrollbar-thumb { background: #555; }
  
  .spinner { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid #4CAF50; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// ==========================================
// 2. CREATE POPUP & LOGIC
// ==========================================
let popup = document.getElementById('gemini-translator-popup');

function restorePopupPosition() {
  chrome.storage.local.get(['popupPosition'], (result) => {
    if (result.popupPosition && popup) {
      popup.style.top = result.popupPosition.top;
      popup.style.left = result.popupPosition.left;
      popup.style.transform = "none"; popup.style.margin = "0";
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
                 <button id="open-manager-btn" class="header-btn" title="Sổ tay">📖</button>
                 <button id="close-gemini-popup" class="header-btn" title="Đóng">&times;</button>
            </div>
        </h4>

        <div id="gemini-content-area">
            
            <div id="analysis-view" style="display:none; flex-direction:column; flex-grow:1;">
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

            <div id="simple-translate-view" style="display:none; padding:15px; flex-grow:1; overflow-y:auto;"></div>

            <div id="history-section" style="padding: 10px 15px;">
                <div class="history-title"><span>📜 Lịch sử</span></div>
                <div id="history-list"></div>
            </div>
        </div>
    `;
  document.body.appendChild(popup);
  restorePopupPosition();

  // --- EVENTS ---

  // 1. Tab Switching
  const tabBtns = popup.querySelectorAll('.tab-btn');
  const tabPanes = popup.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    }
  });

  // 2. Manager & Close
  popup.querySelector('#open-manager-btn').onclick = () => chrome.runtime.sendMessage({ action: "openOptionsPage" });
  document.getElementById('close-gemini-popup').onclick = () => popup.classList.remove('active');
}

// Drag Logic (Giữ nguyên)
const headerHandler = popup.querySelector('h4');
let isDragging = false, offsetX, offsetY;
headerHandler.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) return;
  isDragging = true;
  const rect = popup.getBoundingClientRect();
  offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
  popup.style.transform = 'none'; popup.style.margin = '0';
});
document.addEventListener('mousemove', (e) => {
  if (isDragging) { e.preventDefault(); popup.style.left = `${e.clientX - offsetX}px`; popup.style.top = `${e.clientY - offsetY}px`; }
});
document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    if (popup && chrome.runtime?.id) chrome.storage.local.set({ popupPosition: { top: popup.style.top, left: popup.style.left } });
  }
});

// ==========================================
// 3. MESSAGE & RENDER
// ==========================================
chrome.runtime.onMessage.addListener((request) => {
  const analysisView = document.getElementById('analysis-view');
  const simpleView = document.getElementById('simple-translate-view');

  if (request.action === "showLoading") {
    restorePopupPosition();
    popup.classList.add('active');
    analysisView.style.display = 'none';
    simpleView.style.display = 'block';
    simpleView.innerHTML = `<div style="text-align:center; padding:20px;"><div class="spinner"></div> ${request.loadingText || "Đang xử lý..."}</div>`;
  }
  else if (request.action === "displayResult") {
    if (request.data.translatedText) {
      // Giao diện Dịch
      analysisView.style.display = 'none';
      simpleView.style.display = 'block';
      simpleView.innerHTML = `
            <div style="margin-bottom:10px; color:#888; font-size:12px">Văn bản gốc: ${request.originalText}</div>
            <div style="font-size:16px; line-height:1.6">${request.data.translatedText}</div>
          `;
    } else {
      // Giao diện Phân tích (2 Tabs)
      simpleView.style.display = 'none';
      analysisView.style.display = 'flex';
      renderAnalysisUI(request.data);
    }
    saveToHistory(request.originalText, request.data.type || 'text', request.data);
  }
  else if (request.action === "displayError") {
    simpleView.innerHTML = `<p style="color:#ff5252">Lỗi: ${request.message}</p>`;
  }
});

// ==========================================
// 4. RENDER UI FUNCTIONS
// ==========================================
function renderAnalysisUI(data) {
  // 1. Nghĩa chính
  document.getElementById('static-meaning').innerHTML = `
      <div style="font-weight:bold; color:#fff; margin-bottom:5px">Ý nghĩa:</div>
      <div style="font-size:15px; color:#ddd">${data.meaning}</div>
  `;

  // 2. Tab: TỪ VỰNG
  const tabVocab = document.getElementById('tab-vocab');
  tabVocab.innerHTML = '';
  if (data.vocab && data.vocab.length > 0) {
    const ul = document.createElement('ul');
    data.vocab.forEach(word => {
      const li = document.createElement('li');
      li.style.display = "flex"; li.style.justifyContent = "space-between"; li.style.alignItems = "center";

      // Hiển thị dạng: Kanji (Reading)
      const readingDisplay = word.reading ? `(${word.reading})` : '';

      const leftDiv = document.createElement('div');
      leftDiv.innerHTML = `
             <div style="font-size:16px; color:#81C784; font-weight:bold;">${word.word} <span style="font-size:14px; color:#aaa; font-weight:normal">${readingDisplay}</span></div>
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

  // 3. Tab: NGỮ PHÁP
  const tabGrammar = document.getElementById('tab-grammar');
  tabGrammar.innerHTML = '';
  if (data.grammar && data.grammar.length > 0) {
    const ul = document.createElement('ul');
    data.grammar.forEach(gram => {
      const li = document.createElement('li');
      li.style.display = "flex"; li.style.justifyContent = "space-between";

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

function createSaveButton() {
  const btn = document.createElement('button');
  btn.innerHTML = "💾";
  btn.style.cssText = "background:none; border:1px solid #555; color:#fff; cursor:pointer; padding:4px 8px; border-radius:4px; font-size:14px;";
  return btn;
}

// Reuse History & Save (Giữ nguyên logic cũ)
function cleanupOldHistory() { /*...*/ }
function saveToHistory(text, type, data) {
  const item = { id: Date.now().toString(), selectedText: text, type, result: data, timestamp: Date.now() };
  chrome.storage.local.get(['analysisHistory'], (res) => {
    let h = res.analysisHistory || []; h.unshift(item); if (h.length > 20) h = h.slice(0, 20);
    chrome.storage.local.set({ analysisHistory: h }, renderHistory);
  });
}
function renderHistory() {
  chrome.storage.local.get(['analysisHistory'], (res) => {
    const h = res.analysisHistory || [];
    const list = document.getElementById('history-list');
    if (!list) return;
    if (h.length === 0) { list.innerHTML = '<div class="empty-state">Chưa có lịch sử</div>'; return; }
    list.innerHTML = '';
    h.slice(0, 5).forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-item collapsed';
      // Render History Header (Text only)
      div.innerHTML = `
                <div class="result-header">
                    <div class="result-header-main" style="min-width:0">
                       <span class="selected-text" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${item.selectedText}</span>
                    </div>
                </div>`;
      list.appendChild(div);
    });
  });
}
function saveVocabulary(obj, btn) {
  chrome.storage.local.get(['savedVocab'], r => {
    let l = r.savedVocab || []; if (!l.some(i => i.word === obj.word)) { l.push({ ...obj, date: new Date().toISOString() }); chrome.storage.local.set({ savedVocab: l }, () => { btn.innerHTML = "✅"; btn.disabled = true; }); }
  });
}
function saveGrammar(obj, btn) {
  chrome.storage.local.get(['savedGrammar'], r => {
    let l = r.savedGrammar || []; if (!l.some(i => i.structure === obj.structure)) { l.push({ ...obj, date: new Date().toISOString() }); chrome.storage.local.set({ savedGrammar: l }, () => { btn.innerHTML = "✅"; btn.disabled = true; }); }
  });
}

// Init
renderHistory();