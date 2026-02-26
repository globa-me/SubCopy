const copyWithTsBtn = document.getElementById('copyWithTimestamps');
const copyWithoutTsBtn = document.getElementById('copyWithoutTimestamps');
const footerLink = document.getElementById('popupFooter');

const toastMessages = {
  noSubtitles: chrome.i18n.getMessage('toastNoSubtitles'),
  copyWithTs: chrome.i18n.getMessage('toastCopyWithTs'),
  copyWithoutTs: chrome.i18n.getMessage('toastCopyWithoutTs'),
};
const formatError = detail => chrome.i18n.getMessage('toastError', [detail || '']);

copyWithTsBtn
  .addEventListener('click', () => {
    console.log('[SubCopy] click WITH timestamps');
    onCopy(true);
  });
copyWithoutTsBtn.addEventListener('click', () => {
  console.log('[SubCopy] click WITHOUT timestamps');
  onCopy(false);
});

copyWithTsBtn.textContent = chrome.i18n.getMessage('popupCopyWithTs');
copyWithoutTsBtn.textContent = chrome.i18n.getMessage('popupCopyWithoutTs');
if (footerLink) {
  footerLink.textContent = chrome.i18n.getMessage('popupFooter');
  footerLink.href = 'https://zakharov.asia/?utm_source=SubCopy&utm_medium=extension&utm_campaign=footer';
}

async function showToast(tabId, message, variant = 'info') {
  if (!tabId) return;
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, variantKey) => {
      const toastId = 'subcopy-toast';
      document.getElementById(toastId)?.remove();

      const palette = {
        success: { bg: 'rgba(76, 175, 80, 0.95)', border: '#2e7d32' },
        error: { bg: 'rgba(244, 67, 54, 0.95)', border: '#c62828' },
        info: { bg: 'rgba(33, 150, 243, 0.95)', border: '#0d89d8' },
      };
      const colors = palette[variantKey] || palette.info;

      const toast = document.createElement('div');
      toast.id = toastId;
      toast.textContent = msg;
      Object.assign(toast.style, {
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: '2147483647',
        padding: '12px 16px',
        background: colors.bg,
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
        border: `1px solid ${colors.border}`,
        opacity: '0',
        transform: 'translateY(-8px)',
        transition: 'transform 160ms ease-out, opacity 160ms ease-out',
      });

      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        toast.style.transition = 'transform 180ms ease-in, opacity 180ms ease-in';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      }, 3000);
    },
    args: [message, variant]
  });
}

async function onCopy(includeTimestamps) {
  let activeTab;
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      // Инжектируем «самодостаточную» функцию
      func: async (includeTs) => {
        // 1) Попытка через YouTube Innertube API
        async function fetchByApi() {
          const urlParams = new URLSearchParams(window.location.search);
          const videoId = urlParams.get('v');
          if (!videoId) throw new Error('noVideoId');

          const html = document.documentElement.innerHTML;
          const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
          if (!apiKeyMatch) throw new Error('noApiKey');
          const apiKey = apiKeyMatch[1];

          const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
          const body = {
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: "20.10.38",
              },
            },
            videoId: videoId,
          };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const playerResponse = await response.json();

          const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (!tracks?.length) throw new Error('noTracks');

          const tr = tracks.find(t => t.kind !== 'asr') || tracks[0];
          let baseUrl = tr.baseUrl.replace(/&fmt=\w+$/, ""); // Ensure XML format

          const xml = await fetch(baseUrl).then(r => r.text());
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          const nodes = Array.from(doc.getElementsByTagName('text'));

          const fmt = s => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = Math.floor(s % 60);
            const p = n => String(n).padStart(2, '0');
            return `${p(h)}:${p(m)}:${p(sec)}`;
          };

          return nodes.map(n => {
            const decodeHtml = html => {
              const txt = document.createElement('textarea');
              txt.innerHTML = html;
              return txt.value;
            };
            
            const t = decodeHtml(n.textContent.replace(/\s+/g, ' ').trim());
            if (includeTs) {
              const start = parseFloat(n.getAttribute('start'));
              return `[${fmt(start)}] ${t}`;
            }
            return t;
          }).join('\n');
        }

        // 2) Фолбэк — если у юзера открыта панель «Transcript»
        function fetchFromPanel() {
          const panel = document.querySelector('ytd-transcript-renderer');
          if (!panel) throw new Error('noPanel');
          const segs = panel.querySelectorAll('ytd-transcript-segment-renderer');
          if (!segs.length) throw new Error('emptyPanel');

          return Array.from(segs).map(seg => {
            const time = seg.querySelector('.segment-timestamp')?.textContent.trim() || '';
            const txt = seg.querySelector('.segment-text')?.textContent.trim() || '';
            return includeTs ? `[${time}] ${txt}` : txt;
          }).join('\n');
        }

        // 3) Собираем: сначала API, если упало — парсим панель
        try {
          return await fetchByApi();
        } catch (err) {
          console.warn('[SubCopy] API fetch failed:', err.message);
          return fetchFromPanel();
        }
      },
      args: [includeTimestamps]
    });

    if (!text) {
      await showToast(activeTab.id, toastMessages.noSubtitles, 'error');
      return;
    }

    await navigator.clipboard.writeText(text);
    const msg = includeTimestamps
      ? toastMessages.copyWithTs
      : toastMessages.copyWithoutTs;
    await showToast(activeTab.id, msg, 'success');
  } catch (err) {
    console.error('[SubCopy] onCopy error:', err);
    if (activeTab?.id) {
      await showToast(activeTab.id, formatError(err.message), 'error');
    }
  } finally {
    window.close();
  }
}
