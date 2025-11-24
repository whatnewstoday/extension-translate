// ==========================================
// 1. CSS STYLING (Giao diện Flexbox, Resize, Scroll)
// ==========================================
const style = document.createElement('style');
style.innerHTML = `
  #gemini-translator-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999; /* Z-index cao nhất để không bị che */
    background: #20232b;
    color: #ffffff;
    border: 1px solid #4a4d52;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-family: 'Segoe UI', sans-serif;
    user-select: none;
    
    /* Layout Flexbox & Kích thước */
    display: none; /* Mặc định ẩn */
    flex-direction: column;
    width: 450px;
    max-width: 90vw;
    max-height: 80vh;
    min-height: 150px;
    
    /* Resize & Scroll fix */
    resize: both;
    overflow: hidden;
  }

  #gemini-translator-popup.active {
    display: flex;
  }

  /* Header (Tay nắm kéo thả) */
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

  /* Nút đóng (X) */
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

  /* Vùng nội dung */
  #gemini-content-area {
    padding: 15px;
    overflow-y: auto; /* Scroll dọc */
    overscroll-behavior: contain; /* CHẶN CUỘN LAN RA BODY */
    flex-grow: 1;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
  }

  /* Scrollbar đẹp */
  #gemini-content-area::-webkit-scrollbar { width: 8px; }
  #gemini-content-area::-webkit-scrollbar-track { background: #20232b; }
  #gemini-content-area::-webkit-scrollbar-thumb { background: #4a4d52; border-radius: 4px; }

  /* Định dạng nội dung HTML trả về */
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

  /* Header Controls (Gom nhóm nút đóng và nút manager) */
  .header-controls {
    display: flex;
    align-items: center;
    gap: 10px; /* Khoảng cách giữa 2 nút */
  }

  /* Style chung cho các nút trên header */
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

  /* Hiệu ứng hover cho nút Đóng */
  #close-gemini-popup:hover {
    color: #ff5252;
    background: rgba(255,255,255,0.1);
  }

  /* Hiệu ứng hover cho nút Sổ tay */
  #open-manager-btn:hover {
    color: #4CAF50; /* Màu xanh lá */
    background: rgba(255,255,255,0.1);
    transform: scale(1.1); /* Phóng to nhẹ */
  }
`;
document.head.appendChild(style);

// ==========================================
// 2. TẠO POPUP VÀ BIẾN TOÀN CỤC
// ==========================================
let popup = document.getElementById('gemini-translator-popup');

// Nếu chưa có thì tạo mới
if (!popup) {
  popup = document.createElement('div');
  popup.id = 'gemini-translator-popup';

  // Cập nhật HTML: Thêm div bao quanh 2 nút
  popup.innerHTML = `
        <h4>
            <span>Gemini Japanese AI</span>
            <div class="header-controls">
                 <button id="open-manager-btn" class="header-btn" title="Mở sổ tay từ vựng">📖</button>
                 <button id="close-gemini-popup" class="header-btn" title="Đóng">&times;</button>
            </div>
        </h4>
        <div id="gemini-content-area"></div>
    `;
  document.body.appendChild(popup);

  // --- SỰ KIỆN NÚT SỔ TAY (MỚI) ---
  // Cần stopPropagation để tránh kích hoạt sự kiện kéo thả (Drag) của header
  const managerBtn = popup.querySelector('#open-manager-btn');
  managerBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  managerBtn.onclick = (e) => {
    e.stopPropagation(); // Ngăn kéo thả
    chrome.runtime.sendMessage({ action: "openOptionsPage" });
    // Tùy chọn: Đóng popup sau khi mở trang quản lý
    popup.classList.remove('active');
  };
}

// Lấy các element con quan trọng
const closeBtn = document.getElementById('close-gemini-popup');
const headerHandler = popup.querySelector('h4');
const contentArea = document.getElementById('gemini-content-area');

// ==========================================
// 3. XỬ LÝ SỰ KIỆN (Logic quan trọng)
// ==========================================

// --- A. ĐÓNG POPUP (Nút X) ---
// Dùng onclick trực tiếp để đảm bảo priority cao nhất
closeBtn.onclick = (e) => {
  // Ngăn chặn sự kiện nổi bọt lên Header (để tránh kích hoạt Drag)
  e.stopPropagation();
  popup.classList.remove('active');
};

// --- B. KÉO THẢ (DRAG) ---
let isDragging = false;
let offsetX, offsetY;

headerHandler.addEventListener('mousedown', (e) => {
  // FIX QUAN TRỌNG: Nếu click vào nút đóng (hoặc con của nút đóng), thì KHÔNG kéo
  if (e.target.closest('#close-gemini-popup')) return;

  isDragging = true;
  const rect = popup.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  // Reset transform để tính toán theo pixel chuẩn
  popup.style.transform = 'none';
  popup.style.margin = '0';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    e.preventDefault(); // Chống bôi đen text khi kéo
    popup.style.left = `${e.clientX - offsetX}px`;
    popup.style.top = `${e.clientY - offsetY}px`;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// --- C. CLICK RA NGOÀI ĐỂ ĐÓNG ---
document.addEventListener('mousedown', (e) => {
  // Chỉ đóng nếu popup đang mở VÀ click không nằm trong popup
  if (popup.classList.contains('active') && !popup.contains(e.target)) {
    popup.classList.remove('active');
  }
});

// ==========================================
// 4. LẮNG NGHE TIN NHẮN TỪ BACKGROUND
// ==========================================
chrome.runtime.onMessage.addListener((request) => {
  const contentArea = document.getElementById('gemini-content-area');

  switch (request.action) {
    case "showLoading":
      // Reset scroll về đầu trang khi load nội dung mới
      contentArea.scrollTop = 0;
      contentArea.innerHTML = `
                <div style="text-align:center; padding: 20px;">
                    <div class="spinner"></div> Đang phân tích...
                </div>
            `;
      popup.classList.add('active');
      break;

    case "displayResult":
      //reset nội dung cũ
      contentArea.innerHTML = '';
      //gọi hàm render dữ liệu json
      renderAnalysisUI(contentArea, request.data);
      break;

    case "displayError":
      contentArea.innerHTML = `<p style="color:#ff5252;">Lỗi: ${request.message}</p>`;
      break;
  }
});

//Hàm hiển thị kết quả phân tích dưới dạng UI
function renderAnalysisUI(container, data) {
  // 1. Dịch thường
  if (data.translatedText) {
    container.innerHTML = `<p><strong>Kết quả:</strong></p><p>${data.translatedText}</p>`;
    return;
  }

  // 2. Phân tích tiếng Nhật

  // --- Phần Ý nghĩa ---
  const meaningEl = document.createElement('div');
  meaningEl.innerHTML = `<b>Ý nghĩa:</b> ${data.meaning} <hr>`;
  container.appendChild(meaningEl);

  // --- Phần Từ vựng ---
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

      // Nút Lưu Từ Vựng
      const saveBtn = createSaveButton();
      saveBtn.onclick = () => saveVocabulary(word, saveBtn);

      li.appendChild(textSpan);
      li.appendChild(saveBtn);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  // --- Phần Ngữ pháp (CẬP NHẬT MỚI) ---
  if (data.grammar && data.grammar.length > 0) {
    const grammarTitle = document.createElement('div');
    grammarTitle.innerHTML = `<hr><b>Ngữ pháp & Cấu trúc:</b>`;
    container.appendChild(grammarTitle);

    const ulGrammar = document.createElement('ul');
    data.grammar.forEach(gram => {
      const li = document.createElement('li');
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "start"; // Căn lề trên để đẹp hơn nếu text dài
      li.style.marginBottom = "8px";

      // Nội dung ngữ pháp
      const textSpan = document.createElement('span');
      textSpan.style.flex = "1"; // Để text chiếm hết chỗ, đẩy nút sang phải
      textSpan.style.marginRight = "10px";
      textSpan.innerHTML = `<b style="color:#FFB74D">${gram.structure}</b>: ${gram.explain}`;

      // Nút Lưu Ngữ Pháp (MỚI)
      const saveBtn = createSaveButton();
      saveBtn.onclick = () => saveGrammar(gram, saveBtn);

      li.appendChild(textSpan);
      li.appendChild(saveBtn);
      ulGrammar.appendChild(li);
    });
    container.appendChild(ulGrammar);
  }
}

// --- Hàm tạo nút Save (Helper) ---
function createSaveButton() {
  const btn = document.createElement('button');
  btn.innerHTML = "💾";
  btn.title = "Lưu lại";
  btn.style.cssText = "background:none; border:1px solid #555; color:#fff; cursor:pointer; padding:2px 6px; border-radius:4px; font-size:12px; height: 24px; min-width: 28px;";
  return btn;
}

// --- Logic Lưu Từ Vựng ---
function saveVocabulary(wordObj, btnElement) {
  console.log("Đang lưu từ vựng:", wordObj); // DEBUG: Xem object có dữ liệu không

  chrome.storage.local.get(['savedVocab'], (result) => {
    let currentList = result.savedVocab || [];

    // Kiểm tra xem wordObj có đúng cấu trúc không
    if (!wordObj || !wordObj.word) {
      console.error("Lỗi: Dữ liệu từ vựng bị thiếu!", wordObj);
      alert("Không thể lưu từ này do lỗi dữ liệu.");
      return;
    }

    const exists = currentList.some(item => item.word === wordObj.word);

    if (!exists) {
      const newEntry = { ...wordObj, date: new Date().toISOString() };
      currentList.push(newEntry);

      chrome.storage.local.set({ savedVocab: currentList }, () => {
        console.log("Lưu thành công! Tổng số từ:", currentList.length);
        updateBtnStatus(btnElement);
      });
    } else {
      console.log("Từ đã tồn tại");
      alert("Từ này đã có trong sổ tay!");
    }
  });
}

function saveGrammar(gramObj, btnElement) {
  console.log("Đang lưu ngữ pháp:", gramObj); // DEBUG

  chrome.storage.local.get(['savedGrammar'], (result) => {
    let currentList = result.savedGrammar || [];

    if (!gramObj || !gramObj.structure) {
      console.error("Lỗi: Dữ liệu ngữ pháp bị thiếu!", gramObj);
      return;
    }

    const exists = currentList.some(item => item.structure === gramObj.structure);

    if (!exists) {
      const newEntry = { ...gramObj, date: new Date().toISOString() };
      currentList.push(newEntry);

      chrome.storage.local.set({ savedGrammar: currentList }, () => {
        console.log("Lưu ngữ pháp thành công!");
        updateBtnStatus(btnElement);
      });
    } else {
      alert("Ngữ pháp này đã lưu rồi!");
    }
  });

  // --- Hàm đổi trạng thái nút sau khi lưu ---
  function updateBtnStatus(btn) {
    btn.innerHTML = "✅";
    btn.style.borderColor = "#4CAF50";
    btn.style.color = "#4CAF50";
    btn.disabled = true;
  }
}