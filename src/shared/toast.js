/**
 * FILE: toast.js
 * MỤC ĐÍCH: Toast Notification System dùng chung.
 * SỬ DỤNG: Gọi showToast(message, type) để hiển thị thông báo.
 */

/**
 * Toast styles và keyframes (inject một lần)
 */
const TOAST_STYLES = `
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
  }
  
  .toast {
    padding: 14px 20px;
    border-radius: 10px;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    animation: toastSlideIn 0.3s ease;
    max-width: 350px;
  }
  
  .toast.success { background: linear-gradient(135deg, #4CAF50, #45a049); }
  .toast.error { background: linear-gradient(135deg, #f44336, #d32f2f); }
  .toast.warning { background: linear-gradient(135deg, #ff9800, #f57c00); }
  .toast.info { background: linear-gradient(135deg, #2196F3, #1976D2); }
  
  .toast-icon { font-size: 18px; }
  
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(50px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes toastFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

/**
 * Inject toast styles vào document (chỉ chạy một lần)
 */
function injectToastStyles() {
    if (document.getElementById('toast-styles')) return;

    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = TOAST_STYLES;
    document.head.appendChild(style);
}

/**
 * Toast icons theo type
 */
const TOAST_ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
};

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung thông báo
 * @param {'success'|'error'|'warning'|'info'} type - Loại thông báo
 * @param {number} duration - Thời gian hiển thị (ms), mặc định 3000
 */
function showToast(message, type = 'info', duration = UI_CONFIG.TOAST_DURATION_MS) {
    // Inject styles nếu chưa có
    injectToastStyles();

    // Tạo hoặc lấy container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span>${message}</span>
  `;

    container.appendChild(toast);

    // Auto remove sau duration
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
            // Cleanup container nếu không còn toast
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, duration);
}
