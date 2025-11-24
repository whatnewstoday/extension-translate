# Gemini Translator

A browser extension that translates highlighted text using Google's Gemini AI.

## Features

- Instant Translation: Highlight any text and translate it with a keyboard shortcut
- Context Menu Integration: Right-click on selected text to translate
- Gemini AI Powered: Leverages Google's advanced Gemini language model for accurate translations

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd translate_extension
   ```

2. Open your browser's extension management page:
   - Chrome: Navigate to `chrome://extensions/`
   - Edge: Navigate to `edge://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked" and select the `translate_extension` folder

### Keyboard Shortcut
1. Highlight the text you want to translate
2. Press `Ctrl+Shift+Y` (Windows/Linux) or `Command+Shift+Y` (Mac)
3. The translation will appear in a popup

### Context Menu
1. Highlight the text you want to translate
2. Right-click and select "Translate with Gemini"
3. View the translation result

## Configuration

### First Time Setup

!IMPORTANT: Before using the extension, you must configure your Gemini API key:

1. Right-click the extension icon and select "Options" (or click the extension icon and go to " Cài đặt API")
2. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Enter your API key in the settings page
4. Click " Lưu API Key" to save
5. Optionally click " Test API" to verify the key works

Note: Your API key is stored securely in your browser's local storage and is never exposed in the source code.

## Requirements

- Google Gemini API key (get one at [Google AI Studio](https://makersuite.google.com/app/apikey))
- Chrome, Edge, or any Chromium-based browser (Manifest V3 compatible)

## File Structure

```
translate_extension/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── content.js          # Content script for page interaction
├── popup.html          # Extension popup interface
├── popup.js            # Popup logic
├── manager.html        # Options/settings page
├── manager.js          # Settings page logic
└── manager.css         # Settings page styles
```

## Permissions

This extension requires the following permissions:
- `activeTab`: To access the current tab's content
- `contextMenus`: To add translation option to right-click menu
- `scripting`: To inject translation functionality into web pages
- `storage`: To save user preferences and API keys
- `host_permissions`: To communicate with Gemini API

## Privacy

Your API key and settings are stored locally in your browser. No data is sent to any servers except Google's Gemini API for translation purposes.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

If you encounter any issues or have suggestions, please open an issue on GitHub.
