document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-open-manager');

  if (btn) {
    btn.onclick = () => {
      // Hàm chuẩn của Chrome để mở trang Options (Manager)
      // Nó thông minh hơn window.open: Nếu trang đã mở rồi, nó sẽ tự focus vào tab đó chứ không mở tab mới
      chrome.runtime.openOptionsPage();
    };
  }
});