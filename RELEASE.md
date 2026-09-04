# SubCopy release handoff

## Current release candidate

- Version: **1.2**
- Runtime source: `manifest.json`, `popup.html`, `popup.js`, `icons/`, `_locales/`
- Store listing copy: `docs/store-listing-v1.2.md`
- Public privacy policy source: `docs/privacy.html` and `docs/privacy-policy.md`
- Reproducible build: `./scripts/build-release.sh`
- Upload artifact: `SubCopy-v1.2.zip`

Do not upload the older root `SubCopy.zip` or `SubCopy-v1.3.zip`. The files under `promo_assets/` were concept artwork produced before the 1.2 audit and do not accurately represent the shipped popup; they must not be uploaded to Chrome Web Store.

## Chrome Web Store dashboard checklist

1. Upload `SubCopy-v1.2.zip`.
2. Use the descriptions from `docs/store-listing-v1.2.md`; do not claim 4K images, audio-track extraction, guaranteed VPN support, or guaranteed operation on every YouTube video.
3. After GitHub Pages deploys `docs/`, set the privacy-policy URL to `https://globa-me.github.io/SubCopy/privacy.html`.
4. In the privacy disclosures, declare that developer-controlled systems do not collect user data. The extension temporarily handles website content in the active YouTube tab and communicates directly with YouTube to retrieve the requested public resources.
5. Permission justifications:
   - `activeTab`: temporarily read the YouTube video selected by the user.
   - `scripting`: run the packaged caption and metadata extractor in that active tab.
   - `clipboardWrite`: copy subtitles, public video information, or a thumbnail after a user click.
6. Single purpose: help users copy public YouTube captions and closely related public video resources from the active video.
7. Use the validated English assets in `promo_assets/release-v1.2/`. Older concept images elsewhere in `promo_assets/` are not release assets.

## Manual smoke-test matrix

- [x] Regular YouTube video with manual captions: language list, timestamps, clean text, thumbnail download/copy, video-info Markdown.
- [x] Auto-generated caption track.
- [x] Additional language track (Spanish, Latin America).
- [x] Video without captions: subtitle buttons disabled; thumbnail and info actions remain available.
- [x] YouTube Short.
- [x] Non-YouTube page and restricted Chrome page: clear guidance and all action buttons disabled.
- [x] Eight locales load with no missing strings.

## 1.2 verification record

Tested on **August 25, 2026** with Chrome for Testing 151 on macOS.

- `dQw4w9WgXcQ`: six caption tracks loaded; manual and auto-generated English plus Spanish extraction passed; timestamped and clean clipboard output passed.
- Thumbnail download produced a valid 1280x720 JPEG. Thumbnail image clipboard copy produced PNG clipboard data.
- The video-info action copied title, channel, duration, views, URL, tags, links and full description as Markdown.
- `aqz-KE-bpKQ` opened as a Short with no caption tracks; thumbnail and info remained available while subtitle controls were disabled.
- `example.com` and `chrome://extensions/` displayed the guidance state with all controls disabled.
- The privacy page rendered at 1280px with no horizontal overflow or browser exceptions.
- Static checks passed for Manifest V3, JavaScript syntax, JSON/locales, icon dimensions, minimal permissions, listing short-description limits and ZIP integrity.

## Known external follow-up

The existing Google Doc privacy-policy link in the current Store listing is read-accessible but the connected Google Drive account lacked write scope during the 1.2 audit. Either reauthorize that connection and replace the document text with `docs/privacy-policy.md`, or change the Store privacy URL to the GitHub Pages policy above.
