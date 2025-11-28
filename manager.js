document.addEventListener('DOMContentLoaded', () => {
  console.log("=== MANAGER SCRIPT (FULL FEATURES) ===");

  // --- 1. ELEMENTS & STATE ---
  const btnSettings = document.getElementById('btn-settings');
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const actionBar = document.getElementById('action-bar');

  // Content Containers
  const vocabContent = document.getElementById('vocab-content');
  const grammarContent = document.getElementById('grammar-content');
  const vocabCountSpan = document.getElementById('vocab-count');
  const grammarCountSpan = document.getElementById('grammar-count');

  // Action Bar Elements
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const selectedCountSpan = document.getElementById('selected-count');
  const btnExport = document.getElementById('btn-export');

  // Review Mode Elements
  const btnReview = document.getElementById('btn-review');
  const reviewModal = document.getElementById('review-modal');
  const flashcard = document.getElementById('flashcard');
  const btnForgot = document.getElementById('btn-forgot');
  const btnRemember = document.getElementById('btn-remember');
  const btnCloseReview = document.getElementById('close-review');
  const reviewProgress = document.getElementById('review-progress');
  const reviewAudioBtn = document.getElementById('review-audio-btn');

  let currentView = 'main';
  let reviewQueue = [];
  let currentReviewIndex = 0;

  // --- 2. INIT & NAVIGATION ---
  loadBothData();

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
    btnSettings.textContent = '← Quay lại';
    renderSettings();
  }

  function showMainView() {
    currentView = 'main';
    mainView.style.display = 'grid'; // Grid layout cho 2 cột
    actionBar.style.display = 'flex';
    settingsView.style.display = 'none';
    btnSettings.textContent = '⚙️ Cài đặt API';
    loadBothData(); // Reload data khi quay lại
  }

  // --- 3. DATA LOADING & RENDERING ---
  function loadBothData() {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      const vocabList = result.savedVocab || [];
      const grammarList = result.savedGrammar || [];

      // Update counts
      if (vocabCountSpan) vocabCountSpan.textContent = vocabList.length;
      if (grammarCountSpan) grammarCountSpan.textContent = grammarList.length;

      renderList(vocabList, vocabContent, 'vocab');
      renderList(grammarList, grammarContent, 'grammar');

      updateDeleteButton();
    });
  }

  function renderList(list, container, type) {
    if (!container) return;
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state">Chưa có dữ liệu.</div>';
      return;
    }

    // 1. Gom nhóm theo ngày
    const groupedData = groupByDate(list);

    // 2. Render từng nhóm
    groupedData.forEach(([dateKey, items]) => {
      // Tạo container cho nhóm ngày
      const dateSection = document.createElement('div');
      dateSection.className = 'date-section';

      // Tạo Header ngày + Nút ôn tập riêng cho ngày đó
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      dateHeader.innerHTML = `
            <span class="date-title">${formatDateDisplay(dateKey)} (${items.length})</span>
            <button class="btn-review-date" title="Chỉ ôn tập các từ của ngày này">
                ▶️ Ôn ngày này
            </button>
        `;

      // Gắn sự kiện cho nút ôn tập ngày
      dateHeader.querySelector('.btn-review-date').onclick = () => {
        startReviewByDate(items, type); // Hàm mới sẽ viết ở dưới
      };

      dateSection.appendChild(dateHeader);

      // Render các thẻ Card bên trong nhóm này
      items.forEach(item => {
        const card = createCard(item, type); // Tách hàm tạo card ra cho gọn
        dateSection.appendChild(card);
      });

      container.appendChild(dateSection);
    });
  }

  // Hàm phụ tạo HTML cho Card (Tách ra từ code cũ của bạn)
  // Hàm tạo thẻ Card (Đã fix lỗi sự kiện)
  function createCard(item, type) {
    const card = document.createElement('div');
    card.className = `card ${type}`;

    const idValue = type === 'vocab' ? item.word : item.structure;
    const title = type === 'vocab' ? item.word : item.structure;
    const subtitle = type === 'vocab' ? `(${item.reading || ''})` : '';
    const content = type === 'vocab' ? item.mean : item.explain;

    card.innerHTML = `
        <div class="card-top">
            <input type="checkbox" class="item-checkbox" value="${idValue}" data-type="${type}">
            
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

    // --- SỰ KIỆN QUAN TRỌNG ---

    // 1. Khi tick vào checkbox -> Cập nhật trạng thái nút xóa tổng
    const checkbox = card.querySelector('.item-checkbox');
    checkbox.addEventListener('change', () => {
      updateDeleteButton(); // Gọi hàm cập nhật nút xóa
    });

    // 2. Nút Loa
    card.querySelector('.btn-speak').onclick = (e) => {
      e.stopPropagation();
      speakJapanese(title);
    };

    // 3. Nút Xóa nhỏ (Xóa lẻ)
    card.querySelector('.delete-btn-mini').onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Xóa mục: "${title}"?`)) {
        deleteItems([{ type: type, id: idValue }]);
      }
    };

    return card;
  }

  // --- 4. BULK ACTIONS (DELETE, EXPORT) ---

  if (selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
      // Tìm tất cả checkbox bài học (vocab hoặc grammar)
      const allCheckboxes = document.querySelectorAll('.item-checkbox');

      // Đặt trạng thái của chúng giống hệt nút "Chọn tất cả"
      allCheckboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
      });

      // Cập nhật lại nút xóa
      updateDeleteButton();
    };
  }

  // Hàm cập nhật trạng thái nút "Xóa đã chọn"
  function updateDeleteButton() {
    // Tìm tất cả checkbox đang được tick
    const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
    const count = checkedBoxes.length;

    // Cập nhật số lượng lên giao diện
    const selectedCountSpan = document.getElementById('selected-count');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    if (selectedCountSpan) selectedCountSpan.textContent = count;

    // Nếu có ít nhất 1 cái được chọn thì bật nút xóa, ngược lại thì tắt
    if (btnDeleteSelected) {
      btnDeleteSelected.disabled = count === 0;

      // Thêm chút hiệu ứng visual (tùy chọn)
      if (count > 0) {
        btnDeleteSelected.style.opacity = '1';
        btnDeleteSelected.style.cursor = 'pointer';
      } else {
        btnDeleteSelected.style.opacity = '0.6';
        btnDeleteSelected.style.cursor = 'not-allowed';
      }
    }
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.onclick = () => {
      const checkboxes = document.querySelectorAll('.item-checkbox:checked');
      if (checkboxes.length === 0) return;

      if (confirm(`Xóa ${checkboxes.length} mục đã chọn?`)) {
        const items = Array.from(checkboxes).map(cb => ({
          type: cb.dataset.type,
          id: cb.value
        }));
        deleteItems(items);
      }
    };
  }

  function deleteItems(itemsToDelete) {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      let vocabList = result.savedVocab || [];
      let grammarList = result.savedGrammar || [];

      const vocabIds = itemsToDelete.filter(i => i.type === 'vocab').map(i => i.id);
      const grammarIds = itemsToDelete.filter(i => i.type === 'grammar').map(i => i.id);

      if (vocabIds.length > 0) {
        vocabList = vocabList.filter(item => !vocabIds.includes(item.word));
      }
      if (grammarIds.length > 0) {
        grammarList = grammarList.filter(item => !grammarIds.includes(item.structure));
      }

      chrome.storage.local.set({ savedVocab: vocabList, savedGrammar: grammarList }, () => {
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        loadBothData();
      });
    });
  }

  // Export CSV Logic
  if (btnExport) {
    btnExport.onclick = () => {
      chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
        const vocab = result.savedVocab || [];
        const grammar = result.savedGrammar || [];

        if (vocab.length === 0 && grammar.length === 0) {
          alert("Danh sách trống!"); return;
        }

        let csvContent = "\uFEFFType,Front,Back,Tags\n"; // Header for Anki

        vocab.forEach(item => {
          const front = `"${(item.word || '').replace(/"/g, '""')}"`;
          const back = `"${(item.reading || '')}<br>${(item.mean || '').replace(/"/g, '""')}"`;
          csvContent += `Vocab,${front},${back},Gemini_Vocab\n`;
        });

        grammar.forEach(item => {
          const front = `"${(item.structure || '').replace(/"/g, '""')}"`;
          const back = `"${(item.explain || '').replace(/"/g, '""')}"`;
          csvContent += `Grammar,${front},${back},Gemini_Grammar\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "Gemini_Japanese_Export.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    };
  }

  // --- 5. REVIEW MODE LOGIC (FIXED) ---
  if (btnReview) {
    btnReview.onclick = () => {
      chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
        const vocab = (result.savedVocab || []).map(i => ({ ...i, type: 'vocab' }));
        const grammar = (result.savedGrammar || []).map(i => ({ ...i, type: 'grammar' }));

        // Gộp chung 2 danh sách để ôn tập
        let combinedList = [...vocab, ...grammar];

        if (combinedList.length === 0) {
          alert("Bạn chưa lưu từ vựng hay ngữ pháp nào để ôn tập!");
          return;
        }

        // Shuffle
        reviewQueue = combinedList.sort(() => Math.random() - 0.5);
        currentReviewIndex = 0;

        showReviewModal();
        loadReviewCard(0);
      });
    };
  }

  function showReviewModal() {
    if (reviewModal) reviewModal.classList.remove('hidden');
  }

  function hideReviewModal() {
    if (reviewModal) reviewModal.classList.add('hidden');
  }

  if (btnCloseReview) btnCloseReview.onclick = hideReviewModal;

  function loadReviewCard(index) {
    if (index >= reviewQueue.length) {
      alert("🎉 Chúc mừng! Bạn đã hoàn thành bài ôn tập.");
      hideReviewModal();
      return;
    }

    const item = reviewQueue[index];
    const frontEl = document.getElementById('card-front-content');
    const backEl = document.getElementById('card-back-content');

    // Reset Flip
    if (flashcard) flashcard.classList.remove('is-flipped');

    // Update Content
    if (item.type === 'vocab') {
      frontEl.innerHTML = `<div style="font-size:40px;">${item.word}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Từ vựng)</div>`;
      backEl.innerHTML = `
            <div style="font-size:24px; color:#81C784; margin-bottom:10px">${item.reading || ''}</div>
            <div style="font-size:18px;">${item.mean}</div>
        `;
    } else {
      frontEl.innerHTML = `<div style="font-size:32px;">${item.structure}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Ngữ pháp)</div>`;
      backEl.innerHTML = `<div style="font-size:16px; text-align:left;">${item.explain}</div>`;
    }

    if (reviewProgress) reviewProgress.textContent = `${index + 1} / ${reviewQueue.length}`;

    // Update Audio Button Logic
    if (reviewAudioBtn) {
      reviewAudioBtn.onclick = (e) => {
        e.stopPropagation();
        const textToSpeak = item.type === 'vocab' ? item.word : item.structure;
        speakJapanese(textToSpeak);
      };
    }
  }

  // Card Flip Logic
  if (flashcard) {
    flashcard.onclick = () => flashcard.classList.toggle('is-flipped');
  }

  // Keyboard Shortcuts for Review
  document.addEventListener('keydown', (e) => {
    if (!reviewModal || reviewModal.classList.contains('hidden')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      flashcard.classList.toggle('is-flipped');
    }
    if (e.key === '1' || e.key === '2') {
      handleNextCard();
    }
  });

  function handleNextCard() {
    currentReviewIndex++;
    setTimeout(() => loadReviewCard(currentReviewIndex), 200);
  }

  if (btnForgot) btnForgot.onclick = (e) => { e.stopPropagation(); handleNextCard(); };
  if (btnRemember) btnRemember.onclick = (e) => { e.stopPropagation(); handleNextCard(); };

  // Hàm bắt đầu ôn tập cho một danh sách cụ thể (theo ngày)
  function startReviewByDate(items, type) {
    // Chuyển đổi format items để phù hợp với flashcard
    const formattedItems = items.map(item => ({
      ...item,
      type: type // Gán cứng loại (vocab/grammar) để flashcard hiển thị đúng
    }));

    if (formattedItems.length === 0) return;

    // Set hàng đợi ôn tập
    reviewQueue = formattedItems; // Không cần shuffle nếu muốn ôn theo thứ tự, hoặc shuffle tùy bạn
    currentReviewIndex = 0;

    // Mở Modal
    showReviewModal();
    loadReviewCard(0);
  }

  // --- 6. UTILS & SETTINGS RENDER ---
  function speakJapanese(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find(v => v.lang === 'ja-JP');
    if (jpVoice) utterance.voice = jpVoice;
    window.speechSynthesis.speak(utterance);
  }

  // Render Settings View Logic (Giữ nguyên logic của bạn nhưng bọc trong hàm renderSettings)
  function renderSettings() {
    // ... (Code render settings giữ nguyên như cũ của bạn, đã rất ổn) ...
    // Copy phần logic renderSettings cũ vào đây để code gọn
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      const currentKey = result.geminiApiKey || '';
      const maskedKey = currentKey ? currentKey.substring(0, 10) + '...' + currentKey.substring(currentKey.length - 4) : 'Chưa thiết lập';

      settingsView.innerHTML = `
            <div class="settings-container">
                <h2>⚙️ Cài đặt API</h2>
                <div class="settings-card">
                    <p>Key hiện tại: <code>${maskedKey}</code></p>
                    <input type="password" id="api-key-input" placeholder="Nhập API Key mới..." style="width:100%; padding:10px; margin:10px 0;">
                    <button id="save-api-btn" class="btn-success">Lưu Key</button>
                    <div id="api-status" style="margin-top:10px;"></div>
                </div>
            </div>
        `;

      document.getElementById('save-api-btn').onclick = () => {
        const val = document.getElementById('api-key-input').value.trim();
        if (val) {
          chrome.storage.local.set({ geminiApiKey: val }, () => {
            alert("Đã lưu API Key!");
            renderSettings();
          });
        }
      };
    });
  }
  // Hàm gom nhóm danh sách theo ngày
  function groupByDate(list) {
    const groups = {};

    list.forEach(item => {
      // Nếu item không có date, gán vào ngày hiện tại hoặc "Unknown"
      const dateStr = item.date ? item.date.split('T')[0] : 'unknown';

      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(item);
    });

    // Sắp xếp các nhóm ngày giảm dần (Mới nhất lên đầu)
    // Object.entries trả về mảng [[key, val], [key, val]]
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'unknown') return 1;
      if (b[0] === 'unknown') return -1;
      return new Date(b[0]) - new Date(a[0]);
    });
  }

  // Hàm format ngày cho đẹp (VD: Hôm nay, Hôm qua, 28/11/2025)
  function formatDateDisplay(dateStr) {
    if (dateStr === 'unknown') return 'Không xác định';

    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dS = date.toISOString().split('T')[0];
    const tS = today.toISOString().split('T')[0];
    const yS = yesterday.toISOString().split('T')[0];

    if (dS === tS) return "📅 Hôm nay";
    if (dS === yS) return "📅 Hôm qua";

    return `📅 ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }
});