/**
 * FILE: review-mode.js
 * MỤC ĐÍCH: Xử lý Flashcard và Quiz logic cho Manager page.
 * 
 * DEPENDENCIES:
 * - src/shared/constants.js
 * - src/shared/utils.js
 * - src/shared/toast.js
 * - src/manager/data-service.js
 */

/**
 * Review Mode Service
 * Quản lý chế độ ôn tập Flashcard và Quiz
 */
const ReviewModeService = {
    /** Queue các items đang review */
    reviewQueue: [],
    /** Index hiện tại trong queue */
    currentReviewIndex: 0,
    /** Loại quiz đang chạy */
    currentQuizType: null,

    /**
     * Bắt đầu session ôn tập
     * @param {'all'|'forgotten'} mode 
     */
    startReviewSession: async function (mode) {
        const data = await ManagerDataService.loadBothData();

        const vocab = data.vocab.map(i => ({ ...i, type: 'vocab' }));
        const grammar = data.grammar.map(i => ({ ...i, type: 'grammar' }));

        let combinedList = [...vocab, ...grammar];

        if (mode === 'forgotten') {
            combinedList = combinedList.filter(item => item.status === ITEM_STATUS.FORGOT);
        }

        if (combinedList.length === 0) {
            const msg = mode === 'forgotten'
                ? "Bạn không có từ nào trong danh sách 'Quên'!"
                : "Bạn chưa lưu từ vựng hay ngữ pháp nào để ôn tập!";
            showToast(msg, 'warning');
            return;
        }

        // Shuffle
        this.reviewQueue = combinedList.sort(() => Math.random() - 0.5);
        this.currentReviewIndex = 0;

        this._showReviewModal();
        this._renderReviewList();
        this._loadReviewCard(0);
    },

    /**
     * Bắt đầu ôn tập theo ngày
     * @param {Array} items 
     * @param {string} type 
     */
    startReviewByDate: function (items, type) {
        const formattedItems = items.map(item => ({ ...item, type: type }));

        if (formattedItems.length === 0) return;

        this.reviewQueue = formattedItems;
        this.currentReviewIndex = 0;

        this._showReviewModal();
        this._renderReviewList();
        this._loadReviewCard(0);
    },

    /**
     * Bắt đầu Quiz
     * @param {Array} items 
     * @param {string} type 
     * @param {'meaning'|'reading'} quizType 
     */
    startQuiz: function (items, type, quizType) {
        // Lọc: Chỉ lấy items đã nhớ
        let quizItems = items.filter(item => item.status !== ITEM_STATUS.FORGOT);

        if (quizType === 'reading') {
            // Chỉ lọc items có Kanji
            quizItems = quizItems.filter(item => {
                const text = type === 'vocab' ? item.word : item.structure;
                return hasKanji(text);
            });
        }

        if (quizItems.length === 0) {
            showToast(
                quizType === 'reading'
                    ? "Không có từ Kanji nào đã nhớ trong ngày này!"
                    : "Không có từ nào đã nhớ trong ngày này!",
                'warning'
            );
            return;
        }

        this.currentQuizType = quizType;

        const formattedItems = quizItems.map(item => ({ ...item, type: type }));
        this.reviewQueue = formattedItems.sort(() => Math.random() - 0.5);
        this.currentReviewIndex = 0;

        this._showReviewModal();
        this._renderReviewList();
        this._loadReviewCard(0);
    },

    /**
     * Xử lý khi bấm nút Quên
     */
    handleForgot: async function () {
        const item = this.reviewQueue[this.currentReviewIndex];
        await ManagerDataService.updateItemStatus(item, ITEM_STATUS.FORGOT);
        item.status = ITEM_STATUS.FORGOT; // Update local
        this._renderReviewList();
        this._handleNextCard();
    },

    /**
     * Xử lý khi bấm nút Nhớ
     */
    handleRemember: async function () {
        const item = this.reviewQueue[this.currentReviewIndex];
        await ManagerDataService.updateItemStatus(item, ITEM_STATUS.REMEMBERED);
        item.status = ITEM_STATUS.REMEMBERED; // Update local
        this._renderReviewList();
        this._handleNextCard();
    },

    /**
     * Đóng review modal
     */
    hideReviewModal: function () {
        const reviewModal = document.getElementById('review-modal');
        if (reviewModal) reviewModal.classList.add('hidden');
        this.currentQuizType = null;

        // Reload danh sách để hiển thị status mới
        if (typeof loadBothDataAndRender === 'function') {
            loadBothDataAndRender();
        }
    },

    // =============================================
    // PRIVATE METHODS
    // =============================================

    _showReviewModal: function () {
        const reviewModal = document.getElementById('review-modal');
        if (reviewModal) reviewModal.classList.remove('hidden');
    },

    _renderReviewList: function () {
        const listContainer = document.getElementById('review-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        this.reviewQueue.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'review-list-item';
            if (index === this.currentReviewIndex) li.classList.add('active');
            if (item.status === ITEM_STATUS.FORGOT) li.classList.add('forgot');

            const title = item.type === 'vocab' ? item.word : item.structure;
            const statusText = item.status === ITEM_STATUS.FORGOT
                ? '<span class="item-status" style="background:#FF5722;color:white">Quên</span>'
                : '';

            li.innerHTML = `
        <span class="item-text" title="${title}">${title}</span>
        ${statusText}
      `;

            li.onclick = () => {
                this.currentReviewIndex = index;
                this._loadReviewCard(index);
            };

            listContainer.appendChild(li);
        });
    },

    _loadReviewCard: function (index) {
        if (index >= this.reviewQueue.length) {
            showToast('🎉 Chúc mừng! Bạn đã hoàn thành bài kiểm tra.', 'success');
            this.hideReviewModal();
            return;
        }

        // Update active list item
        const listItems = document.querySelectorAll('.review-list-item');
        listItems.forEach((li, idx) => {
            if (idx === index) {
                li.classList.add('active');
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                li.classList.remove('active');
            }
        });

        const item = this.reviewQueue[index];
        const frontEl = document.getElementById('card-front-content');
        const backEl = document.getElementById('card-back-content');
        const flashcard = document.getElementById('flashcard');
        const reviewProgress = document.getElementById('review-progress');

        if (flashcard) flashcard.classList.remove('is-flipped');

        // Content based on quiz type
        if (item.type === 'vocab') {
            let frontText = item.word;
            let backText = `
        <div style="font-size:24px; color:#81C784; margin-bottom:10px">${item.reading || ''}</div>
        <div style="font-size:18px;">${item.mean}</div>
      `;

            if (this.currentQuizType === 'reading') {
                frontText = item.word;
                backText = `
          <div style="font-size:32px; color:#FF9800; font-weight:bold; margin-bottom:15px">${item.reading || ''}</div>
          <div style="font-size:18px;">${item.mean}</div>
        `;
            }

            frontEl.innerHTML = `<div style="font-size:40px;">${frontText}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Từ vựng)</div>`;
            backEl.innerHTML = backText;
        } else {
            frontEl.innerHTML = `<div style="font-size:32px;">${item.structure}</div><div style="font-size:14px;color:#888;margin-top:10px;">(Ngữ pháp)</div>`;
            backEl.innerHTML = `<div style="font-size:16px; text-align:left;">${item.explain}</div>`;
        }

        if (reviewProgress) {
            reviewProgress.textContent = `${index + 1} / ${this.reviewQueue.length}`;
        }

        // Audio button
        const reviewAudioBtn = document.getElementById('review-audio-btn');
        if (reviewAudioBtn) {
            reviewAudioBtn.onclick = (e) => {
                e.stopPropagation();
                const textToSpeak = item.type === 'vocab' ? item.word : item.structure;
                speakJapanese(textToSpeak);
            };
        }
    },

    _handleNextCard: function () {
        this.currentReviewIndex++;
        setTimeout(() => this._loadReviewCard(this.currentReviewIndex), 200);
    }
};
