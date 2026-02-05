# 🇯🇵 Gemini Japanese Translator

Extension hỗ trợ học tiếng Nhật với Gemini AI. Dịch văn bản, phân tích từ vựng và ngữ pháp chỉ với một phím tắt.

---

## Tính năng chính

- **Dịch nhanh** – Bôi đen văn bản, bấm `Alt+S` là xong
- **Phân tích chi tiết** – `Alt+A` để xem từ vựng, cách đọc, ngữ pháp
- **Sổ tay học tập** – Lưu từ mới, ôn tập bằng flashcard
- **Xuất CSV** – Export dữ liệu theo ngày để in hoặc import vào Anki

---

## Cài đặt

1. Clone repo về máy
2. Mở `chrome://extensions/` → Bật **Developer mode**
3. Bấm **Load unpacked** → Chọn thư mục `translate_extension`
4. Vào **Cài đặt API** → Dán API key từ [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Cách dùng

| Phím tắt | Chức năng |
|----------|-----------|
| `Alt+S` | Dịch sang tiếng Việt |
| `Alt+A` | Phân tích từ vựng + ngữ pháp |
| `Alt+R` | Reload extension |
| Click icon | Mở menu chính |

Hoặc click chuột phải vào văn bản đã bôi đen để chọn từ context menu.

---

## Cấu trúc thư mục

```
translate_extension/
├── src/
│   ├── shared/        # Constants, utils, storage wrapper
│   ├── background/    # Service worker, API calls
│   ├── content/       # Popup UI, history
│   └── manager/       # Sổ tay, export, review mode
├── manifest.json
├── popup.html
├── manager.html
└── manager.css
```

---

## Yêu cầu

- [Gemini API key](https://aistudio.google.com/app/apikey) (miễn phí)
- Chrome, Edge, hoặc browser Chromium-based

---

## Quyền truy cập

- `activeTab` – Đọc text trên trang hiện tại
- `contextMenus` – Thêm menu chuột phải
- `storage` – Lưu API key và dữ liệu học tập
- `scripting` – Inject popup vào trang web

---

## License

MIT