# SubCopy

Copy a YouTube video's visible subtitles to the clipboard in one click — as clean text or with timestamps.

**Install:** [Chrome Web Store](https://chromewebstore.google.com/detail/subcopy/fimcpincagfeocllidclnchppdpeihai) · **Website:** [globa-me.github.io/SubCopy](https://globa-me.github.io/SubCopy/)

## Current release

Version **1.1** (published February 20, 2026) includes:

- Localized extension name, description and popup in 8 languages: English, Indonesian, Spanish, French, Russian, Arabic, Hindi and Chinese.
- Non-intrusive in-page notifications for successful copies and errors.
- A streamlined flow: the popup closes immediately after copying.
- Transcript extraction through YouTube's player API with a transcript-panel fallback.
- Two copy modes: with timestamps or plain text.

## Use SubCopy

1. Open a YouTube video with captions or a transcript.
2. Click the SubCopy extension icon.
3. Select **Copy with timestamps** or **Copy without timestamps**.
4. Paste the copied transcript wherever you need it.

## Development

This is a Manifest V3 Chrome extension with no build step:

- `manifest.json` — extension metadata and required permissions.
- `popup.html` / `popup.js` — popup interface and subtitle extraction.
- `_locales/` — Chrome i18n messages.
- `icons/` — extension and website icon assets.
- `docs/` — the static GitHub Pages website.
- `.github/workflows/deploy-pages.yml` — deploys `docs/` to GitHub Pages after changes reach `main`.

To test locally, load the `SubCopy` directory as an unpacked extension from `chrome://extensions` with Developer mode enabled.

## Privacy

SubCopy does not collect or use your data. It only reads captions from the YouTube page you actively open and writes the transcript to your clipboard when you choose to copy it.

## Authors

- Gennadiy Zakharov
- [Ivan Kononov](https://github.com/konon4)
