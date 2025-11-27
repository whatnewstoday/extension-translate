/**
 * FILE: history-manager.js
 * MỤC ĐÍCH: Quản lý logic lưu trữ dữ liệu (History & Saved Items).
 * CHỨC NĂNG:
 * 1. saveToHistory(): Lưu kết quả vừa dịch vào lịch sử truy cập.
 * 2. renderHistory(): Đọc lịch sử từ Storage và vẽ danh sách ra màn hình.
 * 3. deleteHistoryItem(): Xóa một mục lịch sử cụ thể.
 * 4. cleanupOldHistory(): Tự động dọn dẹp lịch sử cũ quá 30 ngày.
 * 5. saveVocabulary() / saveGrammar(): Lưu từ/ngữ pháp vào Sổ tay (Manager).
 * 6. restoreHistoryItem(): Logic khi bấm vào lịch sử để xem lại kết quả cũ.
 */

function cleanupOldHistory() {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    let history = data.analysisHistory || [];
    let hasChanges = false;
    history = history.map((item, index) => {
      if (!item.id) { item.id = Date.now().toString() + "_" + index; hasChanges = true; }
      return item;
    });
    const now = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const filtered = history.filter(item => (now - (item.timestamp || 0)) < thirtyDaysInMs);
    if (filtered.length !== history.length || hasChanges) {
      chrome.storage.local.set({ analysisHistory: filtered });
    }
  });
}

function saveToHistory(text, type, data) {
  const uniqueId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  const item = { id: uniqueId, selectedText: text, type: type, result: data, timestamp: Date.now() };
  chrome.storage.local.get(['analysisHistory'], (res) => {
    let h = res.analysisHistory || []; h.unshift(item);
    if (h.length > 20) h = h.slice(0, 20);
    chrome.storage.local.set({ analysisHistory: h }, renderHistory);
  });
}

function renderHistory() {
  chrome.storage.local.get(['analysisHistory'], (res) => {
    const h = res.analysisHistory || [];
    const list = document.getElementById('history-list');
    if (!list) return;

    if (h.length === 0) {
      list.innerHTML = '<div class="empty-state" style="padding:10px; font-size:12px">Chưa có lịch sử</div>';
      return;
    }

    list.innerHTML = '';
    h.forEach(item => {
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
      deleteBtn.title = "Xóa mục này";
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

function restoreHistoryItem(item) {
  const analysisView = document.getElementById('analysis-view');
  const simpleView = document.getElementById('simple-translate-view');

  if (item.type === 'text' || (item.result && item.result.translatedText)) {
    analysisView.style.display = 'none';
    simpleView.style.display = 'block';
    simpleView.innerHTML = `
            <div style="margin-bottom:10px; color:#888; font-size:12px">Văn bản gốc: ${item.selectedText}</div>
            <div style="font-size:16px; line-height:1.6">${item.result.translatedText}</div>
        `;
  } else {
    simpleView.style.display = 'none';
    analysisView.style.display = 'flex';
    if (item.result) renderAnalysisUI(item.result);
  }
}

function deleteHistoryItem(itemId) {
  chrome.storage.local.get(['analysisHistory'], (data) => {
    let history = data.analysisHistory || [];
    const originalLength = history.length;
    history = history.filter(item => String(item.id) !== String(itemId));
    if (history.length < originalLength) {
      chrome.storage.local.set({ analysisHistory: history }, renderHistory);
    } else {
      cleanupOldHistory(); renderHistory();
    }
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