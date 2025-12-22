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
  const btnReviewForgotten = document.getElementById('btn-review-forgotten');

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

  // Listen for vocab updates from background
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "vocabUpdated") {
      loadBothData();
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
    settingsView.style.display = 'block';
    btnSettings.textContent = '← Quay lại';
    renderSettings();
  }

  function showMainView() {
    currentView = 'main';
    mainView.style.display = 'grid';
    actionBar.style.display = 'flex';
    settingsView.style.display = 'none';
    btnSettings.textContent = '⚙️ Cài đặt API';
    loadBothData();
  }

  // --- 3. DATA LOADING & RENDERING ---
  function loadBothData() {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      const vocabList = result.savedVocab || [];
      const grammarList = result.savedGrammar || [];

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

    const groupedData = groupByDate(list);

    groupedData.forEach(([dateKey, items]) => {
      const dateSection = document.createElement('div');
      dateSection.className = 'date-section';

      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';
      dateHeader.innerHTML = `
            <span class="date-title">${formatDateDisplay(dateKey)} (${items.length})</span>
            <div style="display:flex; align-items:center;">
                <button class="btn-review-date" title="Ôn tập các từ của ngày này">
                    ▶️ Day Card
                </button>
                <div class="dropdown">
                    <button class="btn-dropdown-trigger">📝 Kiểm tra ▼</button>
                    <div class="dropdown-content">
                        <a data-action="quiz-meaning">📖 Từ vựng</a>
                        <a data-action="quiz-reading">🗣️ Cách đọc</a>
                    </div>
                </div>
            </div>
        `;

      dateHeader.querySelector('.btn-review-date').onclick = () => {
        startReviewByDate(items, type);
      };

      // Dropdown Actions
      const dropdownContent = dateHeader.querySelector('.dropdown-content');
      dropdownContent.querySelectorAll('a').forEach(link => {
        link.onclick = (e) => {
          const action = e.target.dataset.action;
          if (action === 'quiz-meaning') startQuiz(items, type, 'meaning');
          if (action === 'quiz-reading') startQuiz(items, type, 'reading');
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
    if (item.status === 'forgot') {
      card.classList.add('status-forgot');
    }
    card.style.cursor = 'pointer';

    const idValue = type === 'vocab' ? item.word : item.structure;
    const title = type === 'vocab' ? item.word : item.structure;
    const subtitle = type === 'vocab' ? `(${item.reading || ''})` : '';
    const content = type === 'vocab' ? item.mean : item.explain;

    const statusBadge = item.status === 'forgot'
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

    card.addEventListener('click', (e) => {
      if (window.getSelection().toString().length > 0) return;
      if (e.target.closest('.btn-speak') || e.target.closest('.delete-btn-mini') || e.target.closest('.item-checkbox')) {
        return;
      }
      const checkbox = card.querySelector('.item-checkbox');
      if (checkbox) checkbox.click();
    });

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

    card.querySelector('.btn-speak').onclick = (e) => {
      e.stopPropagation();
      speakJapanese(title);
    };

    card.querySelector('.delete-btn-mini').onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Xóa mục: "${title}"?`)) {
        deleteItems([{ type: type, id: idValue }]);
      }
    };

    return card;
  }

  // --- 4. BULK ACTIONS ---

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
    const selectedCountSpan = document.getElementById('selected-count');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    if (selectedCountSpan) selectedCountSpan.textContent = count;

    if (btnDeleteSelected) {
      btnDeleteSelected.disabled = count === 0;
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

  if (btnExport) {
    btnExport.onclick = () => {
      chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
        const vocab = result.savedVocab || [];
        const grammar = result.savedGrammar || [];

        if (vocab.length === 0 && grammar.length === 0) {
          alert("Danh sách trống!"); return;
        }

        let csvContent = "\uFEFFType,Front,Back,Tags\n";

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

  // --- 5. REVIEW MODE LOGIC ---
  if (btnReview) {
    btnReview.onclick = () => {
      startReviewSession('all');
    };
  }

  if (btnReviewForgotten) {
    btnReviewForgotten.onclick = () => {
      startReviewSession('forgotten');
    };
  }

  function startReviewSession(mode) {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      const vocab = (result.savedVocab || []).map(i => ({ ...i, type: 'vocab' }));
      const grammar = (result.savedGrammar || []).map(i => ({ ...i, type: 'grammar' }));

      let combinedList = [...vocab, ...grammar];

      if (mode === 'forgotten') {
        combinedList = combinedList.filter(item => item.status === 'forgot');
      }

      if (combinedList.length === 0) {
        const msg = mode === 'forgotten'
          ? "Bạn không có từ nào trong danh sách 'Quên'!"
          : "Bạn chưa lưu từ vựng hay ngữ pháp nào để ôn tập!";
        alert(msg);
        return;
      }

      reviewQueue = combinedList.sort(() => Math.random() - 0.5);
      currentReviewIndex = 0;

      showReviewModal();
      renderReviewList(); // [NEW] Render the sidebar list
      loadReviewCard(0);
    });
  }

  // [NEW] Quiz Logic
  let currentQuizType = null; // 'meaning' or 'reading'

  function startQuiz(items, type, quizType) {
    // Filter: Only remembered items (not forgot)
    let quizItems = items.filter(item => item.status !== 'forgot');

    if (quizType === 'reading') {
      // Filter: Only items with Kanji (simple regex check)
      const kanjiRegex = /[\u4e00-\u9faf]/;
      quizItems = quizItems.filter(item => {
        const text = type === 'vocab' ? item.word : item.structure;
        return kanjiRegex.test(text);
      });
    }

    if (quizItems.length === 0) {
      alert(quizType === 'reading'
        ? "Không có từ Kanji nào đã nhớ trong ngày này!"
        : "Không có từ nào đã nhớ trong ngày này!");
      return;
    }

    currentQuizType = quizType;

    // Setup Review Queue
    const formattedItems = quizItems.map(item => ({ ...item, type: type }));
    reviewQueue = formattedItems.sort(() => Math.random() - 0.5);
    currentReviewIndex = 0;

    showReviewModal();
    renderReviewList();
    loadReviewCard(0);
  }

  // [NEW] Render Review List
  function renderReviewList() {
    const listContainer = document.getElementById('review-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    reviewQueue.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'review-list-item';
      if (index === currentReviewIndex) li.classList.add('active');
      if (item.status === 'forgot') li.classList.add('forgot');

      const title = item.type === 'vocab' ? item.word : item.structure;
      const statusText = item.status === 'forgot' ? '<span class="item-status" style="background:#FF5722;color:white">Quên</span>' : '';

      li.innerHTML = `
            <span class="item-text" title="${title}">${title}</span>
            ${statusText}
        `;

      li.onclick = () => {
        currentReviewIndex = index;
        loadReviewCard(index);
      };

      listContainer.appendChild(li);
    });
  }

  function showReviewModal() {
    if (reviewModal) reviewModal.classList.remove('hidden');
  }

  function hideReviewModal() {
    if (reviewModal) reviewModal.classList.add('hidden');
    currentQuizType = null; // Reset quiz type
    loadBothData(); // Reload list to show status updates
  }

  if (btnCloseReview) btnCloseReview.onclick = hideReviewModal;

  function loadReviewCard(index) {
    if (index >= reviewQueue.length) {
      alert("🎉 Chúc mừng! Bạn đã hoàn thành bài kiểm tra.");
      hideReviewModal();
      currentQuizType = null; // Reset
      return;
    }

    // [NEW] Update Active List Item
    const listItems = document.querySelectorAll('.review-list-item');
    listItems.forEach((li, idx) => {
      if (idx === index) {
        li.classList.add('active');
        li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        li.classList.remove('active');
      }
    });

    const item = reviewQueue[index];
    const frontEl = document.getElementById('card-front-content');
    const backEl = document.getElementById('card-back-content');

    if (flashcard) flashcard.classList.remove('is-flipped');

    // CONTENT LOGIC BASED ON QUIZ TYPE
    if (item.type === 'vocab') {
      let frontText = item.word;
      let backText = `
        <div style="font-size:24px; color:#81C784; margin-bottom:10px">${item.reading || ''}</div>
        <div style="font-size:18px;">${item.mean}</div>
      `;

      if (currentQuizType === 'reading') {
        // Reading Mode: Front = Kanji, Back = Reading (Highlighted) + Meaning
        frontText = item.word; // Kanji
        backText = `
            <div style="font-size:32px; color:#FF9800; font-weight:bold; margin-bottom:15px">${item.reading || ''}</div>
            <div style="font-size:18px;">${item.mean}</div>
          `;
      } else if (currentQuizType === 'meaning') {
        // Meaning Mode: Front = Word, Back = Meaning + Reading
        // (Default behavior, but explicit here)
      }

      frontEl.innerHTML = `<div style="font-size:40px;">${frontText}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Từ vựng)</div>`;

      backEl.innerHTML = backText;

    } else {
      // Grammar (Only Meaning Mode usually, but handle generic)
      frontEl.innerHTML = `<div style="font-size:32px;">${item.structure}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Ngữ pháp)</div>`;
      backEl.innerHTML = `<div style="font-size:16px; text-align:left;">${item.explain}</div>`;
    }

    if (reviewProgress) reviewProgress.textContent = `${index + 1} / ${reviewQueue.length}`;

    if (reviewAudioBtn) {
      reviewAudioBtn.onclick = (e) => {
        e.stopPropagation();
        const textToSpeak = item.type === 'vocab' ? item.word : item.structure;
        speakJapanese(textToSpeak);
      };
    }
  }

  if (flashcard) {
    flashcard.onclick = () => flashcard.classList.toggle('is-flipped');
  }

  document.addEventListener('keydown', (e) => {
    if (!reviewModal || reviewModal.classList.contains('hidden')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      flashcard.classList.toggle('is-flipped');
    }
    if (e.key === '1' || e.key === '2') {
      // 1: Forgot, 2: Remember
      const item = reviewQueue[currentReviewIndex];
      if (e.key === '1') updateItemStatus(item, 'forgot');
      if (e.key === '2') updateItemStatus(item, 'remember');

      // [NEW] Update list item immediately
      renderReviewList();

      handleNextCard();
    }
  });

  function handleNextCard() {
    currentReviewIndex++;
    // [NEW] Check bounds before loading
    if (currentReviewIndex < reviewQueue.length) {
      setTimeout(() => loadReviewCard(currentReviewIndex), 200);
    } else {
      setTimeout(() => loadReviewCard(currentReviewIndex), 200); // Will trigger finish alert
    }
  }

  // [NEW] Update Status Logic
  if (btnForgot) btnForgot.onclick = (e) => {
    e.stopPropagation();
    const item = reviewQueue[currentReviewIndex];
    updateItemStatus(item, 'forgot');
    renderReviewList(); // Update UI
    handleNextCard();
  };

  if (btnRemember) btnRemember.onclick = (e) => {
    e.stopPropagation();
    const item = reviewQueue[currentReviewIndex];
    updateItemStatus(item, 'remember');
    renderReviewList(); // Update UI
    handleNextCard();
  };

  function updateItemStatus(item, status) {
    chrome.storage.local.get(['savedVocab', 'savedGrammar'], (result) => {
      let vocabList = result.savedVocab || [];
      let grammarList = result.savedGrammar || [];

      if (item.type === 'vocab') {
        const index = vocabList.findIndex(v => v.word === item.word);
        if (index !== -1) {
          vocabList[index].status = status;
        }
      } else {
        const index = grammarList.findIndex(g => g.structure === item.structure);
        if (index !== -1) {
          grammarList[index].status = status;
        }
      }

      chrome.storage.local.set({ savedVocab: vocabList, savedGrammar: grammarList });
    });
  }

  function startReviewByDate(items, type) {
    const formattedItems = items.map(item => ({
      ...item,
      type: type
    }));

    if (formattedItems.length === 0) return;

    reviewQueue = formattedItems;
    currentReviewIndex = 0;

    showReviewModal();
    renderReviewList(); // [NEW] Render list for date review too
    loadReviewCard(0);
  }

  // --- 6. UTILS & SETTINGS ---
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

  function renderSettings() {
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

  function groupByDate(list) {
    const groups = {};

    list.forEach(item => {
      const dateStr = item.date ? item.date.split('T')[0] : 'unknown';
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(item);
    });

    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'unknown') return 1;
      if (b[0] === 'unknown') return -1;
      return new Date(b[0]) - new Date(a[0]);
    });
  }

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