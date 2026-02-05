/**
 * FILE: export-service.js
 * MỤC ĐÍCH: Xử lý export CSV cho Manager page.
 * 
 * DEPENDENCIES:
 * - src/shared/constants.js
 * - src/shared/storage-service.js
 * - src/shared/toast.js
 */

/**
 * Export Service
 * Xử lý xuất dữ liệu ra file CSV
 */
const ExportService = {
    /**
     * Export toàn bộ từ vựng và ngữ pháp
     */
    exportAll: async function () {
        const data = await ManagerDataService.loadBothData();
        const vocab = data.vocab;
        const grammar = data.grammar;

        if (vocab.length === 0 && grammar.length === 0) {
            showToast('Danh sách trống!', 'warning');
            return;
        }

        // Tab delimiter cho Excel
        let csvContent = 'Type\tFront\tBack\tTags\n';

        vocab.forEach(item => {
            const front = (item.word || '').replace(/\t/g, ' ');
            const back = ((item.reading || '') + '<br>' + (item.mean || '')).replace(/\t/g, ' ');
            csvContent += `Vocab\t${front}\t${back}\tGemini_Vocab\n`;
        });

        grammar.forEach(item => {
            const front = (item.structure || '').replace(/\t/g, ' ');
            const back = (item.explain || '').replace(/\t/g, ' ');
            csvContent += `Grammar\t${front}\t${back}\tGemini_Grammar\n`;
        });

        this._downloadCsv(csvContent, 'Gemini_Japanese_Export.csv');
    },

    /**
     * Export theo ngày
     * @param {Array} items - Danh sách items
     * @param {string} type - 'vocab' hoặc 'grammar'
     * @param {string} dateKey - Ngày dạng yyyy-mm-dd
     */
    exportByDate: function (items, type, dateKey) {
        if (items.length === 0) {
            showToast('Không có dữ liệu để tải!', 'warning');
            return;
        }

        let csvContent = 'STT\tTừ/Cấu trúc\tCách đọc\tNghĩa\n';

        items.forEach((item, index) => {
            if (type === 'vocab') {
                const word = (item.word || '').replace(/\t/g, ' ');
                const reading = (item.reading || '').replace(/\t/g, ' ');
                const mean = (item.mean || '').replace(/\t/g, ' ');
                csvContent += `${index + 1}\t${word}\t${reading}\t${mean}\n`;
            } else {
                const structure = (item.structure || '').replace(/\t/g, ' ');
                const explain = (item.explain || '').replace(/\t/g, ' ');
                csvContent += `${index + 1}\t${structure}\t\t${explain}\n`;
            }
        });

        const dateForFile = dateKey === 'unknown' ? 'unknown' : dateKey.replace(/-/g, '');
        const typeLabel = type === 'vocab' ? 'Vocab' : 'Grammar';
        const filename = `Japanese_${typeLabel}_${dateForFile}.csv`;

        this._downloadCsv(csvContent, filename);
        showToast(`Đã tải ${items.length} mục của ngày ${dateKey}!`, 'success');
    },

    /**
     * Export cả từ vựng và ngữ pháp theo ngày (combined)
     * @param {string} dateKey - Ngày dạng yyyy-mm-dd
     */
    exportByDateCombined: async function (dateKey) {
        const data = await ManagerDataService.loadBothData();

        // Filter theo ngày
        const vocabItems = data.vocab.filter(item => {
            const itemDate = item.date ? item.date.split('T')[0] : 'unknown';
            return itemDate === dateKey;
        });

        const grammarItems = data.grammar.filter(item => {
            const itemDate = item.date ? item.date.split('T')[0] : 'unknown';
            return itemDate === dateKey;
        });

        if (vocabItems.length === 0 && grammarItems.length === 0) {
            showToast(`Không có dữ liệu ngày ${dateKey}!`, 'warning');
            return { vocabCount: 0, grammarCount: 0 };
        }

        // CSV format dễ in: STT | Loại | Từ/Cấu trúc | Cách đọc | Nghĩa/Giải thích
        let csvContent = 'STT\tLoại\tTừ/Cấu trúc\tCách đọc\tNghĩa/Giải thích\n';
        let stt = 1;

        // Thêm từ vựng
        vocabItems.forEach(item => {
            const word = (item.word || '').replace(/\t/g, ' ');
            const reading = (item.reading || '').replace(/\t/g, ' ');
            const mean = (item.mean || '').replace(/\t/g, ' ');
            csvContent += `${stt++}\tTừ vựng\t${word}\t${reading}\t${mean}\n`;
        });

        // Thêm ngữ pháp
        grammarItems.forEach(item => {
            const structure = (item.structure || '').replace(/\t/g, ' ');
            const explain = (item.explain || '').replace(/\t/g, ' ');
            csvContent += `${stt++}\tNgữ pháp\t${structure}\t-\t${explain}\n`;
        });

        const dateForFile = dateKey === 'unknown' ? 'unknown' : dateKey.replace(/-/g, '');
        const filename = `Japanese_${dateForFile}.csv`;

        this._downloadCsv(csvContent, filename);
        showToast(`Đã tải ${vocabItems.length} từ vựng + ${grammarItems.length} ngữ pháp!`, 'success');

        return { vocabCount: vocabItems.length, grammarCount: grammarItems.length };
    },

    /**
     * Lấy thông tin số lượng theo ngày
     * @param {string} dateKey - Ngày dạng yyyy-mm-dd
     * @returns {Promise<{vocabCount: number, grammarCount: number}>}
     */
    getDateInfo: async function (dateKey) {
        const data = await ManagerDataService.loadBothData();

        const vocabCount = data.vocab.filter(item => {
            const itemDate = item.date ? item.date.split('T')[0] : 'unknown';
            return itemDate === dateKey;
        }).length;

        const grammarCount = data.grammar.filter(item => {
            const itemDate = item.date ? item.date.split('T')[0] : 'unknown';
            return itemDate === dateKey;
        }).length;

        return { vocabCount, grammarCount };
    },

    /**
     * Download CSV với UTF-16 LE encoding (Excel compatible)
     * @private
     * @param {string} content - Nội dung CSV
     * @param {string} filename - Tên file
     */
    _downloadCsv: function (content, filename) {
        // Convert to UTF-16 LE with BOM
        const utf16leBytes = new Uint8Array(2 + content.length * 2);
        utf16leBytes[0] = 0xFF; // UTF-16 LE BOM
        utf16leBytes[1] = 0xFE;

        for (let i = 0; i < content.length; i++) {
            const code = content.charCodeAt(i);
            utf16leBytes[2 + i * 2] = code & 0xFF;
            utf16leBytes[2 + i * 2 + 1] = code >> 8;
        }

        const blob = new Blob([utf16leBytes], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
};
