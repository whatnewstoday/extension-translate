/**
 * FILE: data-service.js
 * MỤC ĐÍCH: Quản lý load/save dữ liệu cho Manager page.
 * 
 * DEPENDENCIES:
 * - src/shared/constants.js
 * - src/shared/storage-service.js
 * - src/shared/utils.js
 */

/**
 * Manager Data Service
 * Quản lý việc load, save, delete từ vựng và ngữ pháp
 */
const ManagerDataService = {
    /**
     * Load cả vocab và grammar
     * @returns {Promise<{vocab: Array, grammar: Array}>}
     */
    loadBothData: async function () {
        const result = await StorageService.get([STORAGE_KEY.SAVED_VOCAB, STORAGE_KEY.SAVED_GRAMMAR]);
        return {
            vocab: result[STORAGE_KEY.SAVED_VOCAB] || [],
            grammar: result[STORAGE_KEY.SAVED_GRAMMAR] || []
        };
    },

    /**
     * Xóa nhiều items
     * @param {Array<{type: string, id: string}>} itemsToDelete 
     * @returns {Promise<void>}
     */
    deleteItems: async function (itemsToDelete) {
        const data = await this.loadBothData();
        let vocabList = data.vocab;
        let grammarList = data.grammar;

        const vocabIds = itemsToDelete.filter(i => i.type === 'vocab').map(i => i.id);
        const grammarIds = itemsToDelete.filter(i => i.type === 'grammar').map(i => i.id);

        if (vocabIds.length > 0) {
            vocabList = vocabList.filter(item => !vocabIds.includes(item.word));
        }
        if (grammarIds.length > 0) {
            grammarList = grammarList.filter(item => !grammarIds.includes(item.structure));
        }

        await StorageService.set({
            [STORAGE_KEY.SAVED_VOCAB]: vocabList,
            [STORAGE_KEY.SAVED_GRAMMAR]: grammarList
        });
    },

    /**
     * Cập nhật status của item (forgot/remember)
     * @param {Object} item - Item cần update
     * @param {string} status - 'forgot' hoặc 'remember'
     * @returns {Promise<void>}
     */
    updateItemStatus: async function (item, status) {
        const data = await this.loadBothData();
        let vocabList = data.vocab;
        let grammarList = data.grammar;

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

        await StorageService.set({
            [STORAGE_KEY.SAVED_VOCAB]: vocabList,
            [STORAGE_KEY.SAVED_GRAMMAR]: grammarList
        });
    }
};
