# SubCopy

SubCopy is a Chrome extension that copies visible YouTube subtitles to the clipboard in one click.

## What Changed in 1.1 (vs 1.0)

- Added full i18n support via `_locales` and localized manifest fields (`name`, `description`).
- Added localized popup labels and footer text.
- Replaced popup `alert()` dialogs with in-page toast notifications (success/error/info).
- Moved subtitle extraction logic into a self-contained injected function in `popup.js` (removed separate `content.js` file).
- Moved popup styles inline in `popup.html` (removed separate `popup.css` file).
- Updated extension version from `1.0` to `1.1`.

## Usage

1. Open a YouTube video with subtitles.
2. Click the SubCopy extension icon.
3. Choose:
- `Copy with timestamps`
- `Copy without timestamps`

The copied text is written to your clipboard.

## Authors

- Gennadiy Zakharov
- [Ivan Kononov](https://github.com/konon4)
