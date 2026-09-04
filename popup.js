const sectionSubtitlesTitle = document.getElementById('sectionSubtitlesTitle');
const selectPlaceholder = document.getElementById('selectPlaceholder');
const langSelect = document.getElementById('langSelect');
const copyWithTsBtn = document.getElementById('copyWithTimestamps');
const copyWithoutTsBtn = document.getElementById('copyWithoutTimestamps');

const sectionCoverTitle = document.getElementById('sectionCoverTitle');
const downloadCoverBtn = document.getElementById('downloadCover');
const copyCoverBtn = document.getElementById('copyCover');

const sectionInfoTitle = document.getElementById('sectionInfoTitle');
const copyAllInfoBtn = document.getElementById('copyAllInfo');
const footerLink = document.getElementById('popupFooter');
const statusMessage = document.getElementById('statusMessage');

const subtitleButtons = [copyWithTsBtn, copyWithoutTsBtn];
const videoButtons = [downloadCoverBtn, copyCoverBtn, copyAllInfoBtn];

const toastMessages = {
  noSubtitles: chrome.i18n.getMessage('toastNoSubtitles'),
  copyWithTs: chrome.i18n.getMessage('toastCopyWithTs'),
  copyWithoutTs: chrome.i18n.getMessage('toastCopyWithoutTs'),
  coverDownloaded: chrome.i18n.getMessage('toastCoverDownloaded'),
  coverCopied: chrome.i18n.getMessage('toastCoverCopied'),
  infoCopied: chrome.i18n.getMessage('toastInfoCopied'),
};
const formatError = detail => chrome.i18n.getMessage('toastError', [detail || '']);

function setStatus(message, variant = 'info') {
  if (!statusMessage) return;
  statusMessage.textContent = message || '';
  statusMessage.classList.toggle('error', variant === 'error');
  statusMessage.style.display = message ? 'block' : 'none';
}

function setButtonsEnabled(buttons, enabled) {
  buttons.forEach(button => {
    button.disabled = !enabled;
  });
}

function showUnavailableState(messageKey = 'openYouTubeVideo') {
  currentVideoData = null;
  langSelect.replaceChildren();
  const option = document.createElement('option');
  option.value = '';
  option.textContent = chrome.i18n.getMessage('noSubtitlesAvailable');
  langSelect.appendChild(option);
  langSelect.disabled = true;
  setButtonsEnabled(subtitleButtons, false);
  setButtonsEnabled(videoButtons, false);
  setStatus(chrome.i18n.getMessage(messageKey), 'error');
}

// Initialize UI text from i18n
sectionSubtitlesTitle.textContent = `💬 ${chrome.i18n.getMessage('sectionSubtitles')}`;
selectPlaceholder.textContent = chrome.i18n.getMessage('selectLanguagePlaceholder');
copyWithTsBtn.textContent = `🕒 ${chrome.i18n.getMessage('popupCopyWithTs')}`;
copyWithoutTsBtn.textContent = `📄 ${chrome.i18n.getMessage('popupCopyWithoutTs')}`;

sectionCoverTitle.textContent = `🖼 ${chrome.i18n.getMessage('sectionCover')}`;
downloadCoverBtn.textContent = `📥 ${chrome.i18n.getMessage('popupDownloadCover')}`;
copyCoverBtn.textContent = `📋 ${chrome.i18n.getMessage('popupCopyCover')}`;

sectionInfoTitle.textContent = `📑 ${chrome.i18n.getMessage('sectionInfo')}`;
copyAllInfoBtn.textContent = `✨ ${chrome.i18n.getMessage('popupCopyAllInfo')}`;

if (footerLink) {
  footerLink.textContent = chrome.i18n.getMessage('popupFooter');
  footerLink.href = 'https://zakharov.asia/?utm_source=SubCopy&utm_medium=extension&utm_campaign=footer';
}

let activeTabId = null;
let currentVideoData = null;

// Reliable clipboard helper with fallback
async function copyTextToClipboard(text, tabId) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      textarea.remove();
      if (success) return true;
    } catch (e2) {}
  }
  // If popup copying failed, copy inside the active tab
  if (tabId) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (str) => {
          const ta = document.createElement('textarea');
          ta.value = str;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          const copied = document.execCommand('copy');
          ta.remove();
          return copied;
        },
        args: [text]
      });
      return Boolean(result);
    } catch (e3) {}
  }
  return false;
}

// Toast notification helper in active tab
async function showToast(tabId, message, variant = 'info') {
  if (!tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, variantKey) => {
        const toastId = 'subcopy-toast';
        document.getElementById(toastId)?.remove();

        const palette = {
          success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#059669' },
          error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#dc2626' },
          info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#2563eb' },
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
          padding: '12px 18px',
          background: colors.bg,
          borderRadius: '8px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
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
  } catch (err) {
    console.warn('[SubCopy] showToast failed:', err);
  }
}

// Injected function in YouTube tab to extract full video metadata and tracks
async function extractYouTubeState() {
  function getVideoId() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  }

  const videoId = getVideoId();
  if (!videoId) return { error: 'noVideoId' };

  let playerResponse = null;
  let apiResponse = null;
  const player = document.getElementById('movie_player');
  if (player && typeof player.getPlayerResponse === 'function') {
    try {
      playerResponse = player.getPlayerResponse();
    } catch (e) {}
  }
  if (!playerResponse) {
    playerResponse = window.ytInitialPlayerResponse;
  }

  const pageTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  let apiKey = window.ytcfg?.get?.('INNERTUBE_API_KEY') || '';
  if (!apiKey) {
    const apiKeyMatch = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    apiKey = apiKeyMatch?.[1] || '';
  }

  // Use YouTube's page API only as a fallback when the active player does not
  // expose complete metadata or caption tracks.
  if (apiKey && (!playerResponse?.videoDetails || !pageTracks.length)) {
    try {
      const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
          videoId,
        }),
      });
      if (response.ok) apiResponse = await response.json();
    } catch (e) {}
  }

  const videoDetails = playerResponse?.videoDetails || apiResponse?.videoDetails || {};
  let captionTracks = pageTracks.length
    ? pageTracks
    : (apiResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []);

  // Last-resort fallback for page variants where neither player path is ready.
  if (!captionTracks.length) {
    for (const script of document.querySelectorAll('script')) {
      const text = script.textContent;
      if (text && text.includes('captionTracks')) {
        const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s) ||
                      text.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            const trs = parsed?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (trs?.length) {
              captionTracks = trs;
              break;
            }
          } catch (e) {}
        }
      }
    }
  }

  const description = videoDetails.shortDescription || '';

  // Extract chapters from description
  const chapters = [];
  const timeRegex = /(?:^|\n)(?:(\d{1,2}:)?(\d{1,2}:\d{2}))\s+[-—–]?\s*([^\n\r]+)/g;
  let m;
  while ((m = timeRegex.exec(description)) !== null) {
    chapters.push({
      time: m[1] ? `${m[1]}${m[2]}` : m[2],
      title: m[3].trim(),
    });
  }

  // Extract clean external links from description
  const urlRegex = /https?:\/\/[^\s]+/g;
  const rawLinks = description.match(urlRegex) || [];
  const links = Array.from(new Set(rawLinks.map(link => {
    try {
      const parsed = new URL(link);
      if (parsed.hostname.includes('youtube.com') && parsed.pathname === '/redirect') {
        const q = parsed.searchParams.get('q');
        if (q) return decodeURIComponent(q);
      }
      return link;
    } catch (e) {
      return link;
    }
  })));

  const cleanTracks = captionTracks.map((tr, index) => {
    const label = tr.name?.simpleText || tr.name?.runs?.[0]?.text || tr.languageCode || `Track ${index + 1}`;
    const isAuto = tr.kind === 'asr' || tr.vssId?.startsWith('a.');
    let cleanUrl = tr.baseUrl || '';
    if (cleanUrl) cleanUrl = cleanUrl.replace(/([?&])fmt=[^&]*/g, '$1').replace(/[?&]$/, '');
    return {
      baseUrl: cleanUrl,
      languageCode: tr.languageCode || '',
      name: label,
      isAuto: isAuto,
      kind: tr.kind || '',
    };
  });

  return {
    videoId,
    title: videoDetails.title || document.title.replace(/ - YouTube$/, ''),
    author: videoDetails.author || '',
    lengthSeconds: videoDetails.lengthSeconds || '0',
    viewCount: videoDetails.viewCount || '0',
    keywords: videoDetails.keywords || [],
    description,
    chapters,
    links,
    tracks: cleanTracks,
  };
}

// Populate languages and video data on popup load
async function initPopup() {
  setStatus(chrome.i18n.getMessage('loadingVideo'));
  langSelect.disabled = true;
  setButtonsEnabled(subtitleButtons, false);
  setButtonsEnabled(videoButtons, false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showUnavailableState();
      return;
    }
    activeTabId = tab.id;

    let tabUrl = null;
    try {
      tabUrl = new URL(tab.url || '');
    } catch (e) {}
    if (!tabUrl || !/(^|\.)youtube\.com$/.test(tabUrl.hostname)) {
      showUnavailableState();
      return;
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: extractYouTubeState,
      world: 'MAIN',
    });

    if (!result || result.error) {
      showUnavailableState('openYouTubeVideo');
      return;
    }

    currentVideoData = result;
    setButtonsEnabled(videoButtons, true);

    if (result.tracks && result.tracks.length > 0) {
      langSelect.replaceChildren();
      result.tracks.forEach((tr) => {
        const opt = document.createElement('option');
        opt.value = tr.baseUrl || '';
        opt.dataset.langCode = tr.languageCode || '';
        opt.textContent = `${tr.name}${tr.isAuto ? ' (auto)' : ''}`;
        langSelect.appendChild(opt);
      });

      // Default to first non-auto track or first track
      const defaultIndex = result.tracks.findIndex(t => !t.isAuto);
      langSelect.selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
      langSelect.disabled = false;
      setButtonsEnabled(subtitleButtons, true);
      setStatus('');
    } else {
      langSelect.replaceChildren();
      const option = document.createElement('option');
      option.value = '';
      option.textContent = chrome.i18n.getMessage('noSubtitlesAvailable');
      langSelect.appendChild(option);
      langSelect.disabled = true;
      setButtonsEnabled(subtitleButtons, false);
      setStatus(chrome.i18n.getMessage('toastNoSubtitles'));
    }
  } catch (err) {
    console.warn('[SubCopy] initPopup error:', err);
    showUnavailableState('unableToReadVideo');
  }
}

// Self-contained in-tab subtitle extraction function
async function extractSubtitlesInTab(targetUrl, targetLangCode, includeTs) {
  function getVideoId() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return shortsMatch[1];
    return null;
  }

  const videoId = getVideoId();

  const fmt = sec => {
    const s = Math.max(0, parseFloat(sec) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = Math.floor(s % 60);
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sc)}` : `${p(m)}:${p(sc)}`;
  };

  const decodeEntities = str => {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&nbsp;/g, ' ');
  };

  const cleanText = str => {
    if (!str) return '';
    return decodeEntities(str.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  };

  const parseTimeAttr = (attrVal, isMs = false) => {
    if (!attrVal) return 0;
    const str = String(attrVal).trim();
    if (str.includes(':')) {
      const parts = str.split(':').map(parseFloat);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    const num = parseFloat(str) || 0;
    return isMs ? num / 1000 : num;
  };

  // Universal Subtitle Parser: Handles XML (<text>), SRV3 (<p>), WebVTT, JSON3, TTML & Regex
  function parseSubtitleContent(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const text = raw.trim();
    if (!text || text.length === 0) return null;

    // 1. JSON3 format (e.g. from fmt=json3)
    if (text.startsWith('{') || text.startsWith(')]}\'')) {
      try {
        const jsonStr = text.replace(/^\)]}'\s*/, '');
        const data = JSON.parse(jsonStr);
        if (data.events && Array.isArray(data.events)) {
          const lines = [];
          for (const ev of data.events) {
            if (!ev.segs || !ev.segs.length) continue;
            const segText = ev.segs.map(s => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
            if (!segText || segText === '\n') continue;
            const t = cleanText(segText);
            if (!t) continue;
            if (includeTs) {
              const startSec = (ev.tStartMs || 0) / 1000;
              lines.push(`[${fmt(startSec)}] ${t}`);
            } else {
              lines.push(t);
            }
          }
          if (lines.length > 0) return lines.join('\n');
        }
      } catch (e) {}
    }

    // 2. WebVTT format
    if (text.startsWith('WEBVTT') || text.includes('-->')) {
      const vttRegex = /(?:(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3}))\s*-->\s*(?:(?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})[^\n\r]*\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n|\r?\n(?:(?:\d{1,2}:)?\d{2}:\d{2})|$))/g;
      const lines = [];
      let vm;
      while ((vm = vttRegex.exec(text)) !== null) {
        const h = vm[1] ? parseInt(vm[1], 10) : 0;
        const m = parseInt(vm[2], 10) || 0;
        const s = parseInt(vm[3], 10) || 0;
        const ms = parseInt(vm[4], 10) || 0;
        const startSec = h * 3600 + m * 60 + s + ms / 1000;
        const t = cleanText(vm[5]);
        if (t) {
          lines.push(includeTs ? `[${fmt(startSec)}] ${t}` : t);
        }
      }
      if (lines.length > 0) return lines.join('\n');
    }

    // 3. DOMParser (XML / HTML)
    try {
      const parser = new DOMParser();
      let doc = parser.parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) {
        doc = parser.parseFromString(text, 'text/html');
      }

      // 3a. Standard <text> tags (v1.1 standard method)
      const textNodes = Array.from(doc.querySelectorAll('text'));
      if (textNodes.length > 0) {
        const lines = textNodes.map(n => {
          const t = cleanText(n.textContent);
          if (!t) return null;
          if (includeTs) {
            const startAttr = n.getAttribute('start') || n.getAttribute('t') || n.getAttribute('begin') || '0';
            const isMs = !n.hasAttribute('start') && n.hasAttribute('t');
            const startSec = parseTimeAttr(startAttr, isMs);
            return `[${fmt(startSec)}] ${t}`;
          }
          return t;
        }).filter(Boolean);
        if (lines.length > 0) return lines.join('\n');
      }

      // 3b. Format 3 / TTML <p> tags
      const pNodes = Array.from(doc.querySelectorAll('p'));
      if (pNodes.length > 0) {
        const lines = pNodes.map(n => {
          const t = cleanText(n.textContent);
          if (!t) return null;
          if (includeTs) {
            const startAttr = n.getAttribute('t') || n.getAttribute('start') || n.getAttribute('begin') || '0';
            const isMs = n.hasAttribute('t') || (!n.hasAttribute('start') && !n.hasAttribute('begin'));
            const startSec = parseTimeAttr(startAttr, isMs);
            return `[${fmt(startSec)}] ${t}`;
          }
          return t;
        }).filter(Boolean);
        if (lines.length > 0) return lines.join('\n');
      }
    } catch (e) {}

    // 4. Regex fallback for <text ...>...</text>
    const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
    const textLines = [];
    let tm;
    while ((tm = textRegex.exec(text)) !== null) {
      const attrs = tm[1];
      const content = tm[2];
      const t = cleanText(content);
      if (!t) continue;
      if (includeTs) {
        const startMatch = attrs.match(/\bstart=["']([^"']+)["']/i) || attrs.match(/\bt=["']([^"']+)["']/i) || attrs.match(/\bbegin=["']([^"']+)["']/i);
        const isMs = !attrs.includes('start=') && attrs.includes('t=');
        const startSec = startMatch ? parseTimeAttr(startMatch[1], isMs) : 0;
        textLines.push(`[${fmt(startSec)}] ${t}`);
      } else {
        textLines.push(t);
      }
    }
    if (textLines.length > 0) return textLines.join('\n');

    // 5. Regex fallback for <p ...>...</p>
    const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    const pLines = [];
    let pm;
    while ((pm = pRegex.exec(text)) !== null) {
      const attrs = pm[1];
      const content = pm[2];
      const t = cleanText(content);
      if (!t) continue;
      if (includeTs) {
        const startMatch = attrs.match(/\bt=["']([^"']+)["']/i) || attrs.match(/\bstart=["']([^"']+)["']/i) || attrs.match(/\bbegin=["']([^"']+)["']/i);
        const isMs = attrs.includes('t=') || (!attrs.includes('start=') && !attrs.includes('begin='));
        const startSec = startMatch ? parseTimeAttr(startMatch[1], isMs) : 0;
        pLines.push(`[${fmt(startSec)}] ${t}`);
      } else {
        pLines.push(t);
      }
    }
    if (pLines.length > 0) return pLines.join('\n');

    return null;
  }

  async function tryFetchUrl(url) {
    if (!url) return null;
    const cleanUrl = url.replace(/([?&])fmt=[^&]*/g, '$1').replace(/[?&]$/, '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const variants = [
      cleanUrl,
      `${cleanUrl}${separator}fmt=json3`,
      `${cleanUrl}${separator}fmt=srv3`,
      `${cleanUrl}${separator}fmt=vtt`,
    ];

    for (const u of variants) {
      try {
        const res = await fetch(u);
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 0) {
            const parsed = parseSubtitleContent(text);
            if (parsed) return parsed;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  // Strategy 1: Fetch target URL directly
  if (targetUrl) {
    const res = await tryFetchUrl(targetUrl);
    if (res) return res;
  }

  const apiKeyMatch = document.documentElement.innerHTML.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : (window.ytcfg?.get?.('INNERTUBE_API_KEY') || '');

  // Strategy 2: Android Innertube API (proven v1.1 method)
  if (apiKey && videoId) {
    try {
      const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
          videoId: videoId,
        }),
      });
      const pr = await response.json();
      const tracks = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        let chosen = tracks.find(tr => targetLangCode && tr.languageCode === targetLangCode);
        if (!chosen) chosen = tracks.find(t => t.kind !== 'asr') || tracks[0];
        if (chosen?.baseUrl) {
          const res = await tryFetchUrl(chosen.baseUrl);
          if (res) return res;
        }
      }
    } catch (e) {}
  }

  // Strategy 3: DOM transcript panel
  const panel = document.querySelector('ytd-transcript-renderer') ||
    document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
  if (panel) {
    const segs = panel.querySelectorAll('ytd-transcript-segment-renderer');
    if (segs.length) {
      return Array.from(segs).map(seg => {
        const time = seg.querySelector('.segment-timestamp')?.textContent.trim() || '';
        const txt = seg.querySelector('.segment-text')?.textContent.trim() || '';
        return includeTs ? `[${time}] ${txt}` : txt;
      }).filter(Boolean).join('\n');
    }
  }

  return null;
}

// 1. Copy Subtitles (with or without timestamps)
async function onCopySubtitles(includeTimestamps) {
  let targetTabId = activeTabId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) targetTabId = tab.id;
    if (!targetTabId) return;

    const selectedUrl = langSelect.value;
    const selectedLangCode = langSelect.selectedOptions[0]?.dataset?.langCode || '';

    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: extractSubtitlesInTab,
      args: [selectedUrl, selectedLangCode, includeTimestamps]
    });

    if (!text) {
      if (targetTabId) await showToast(targetTabId, toastMessages.noSubtitles, 'error');
      return;
    }

    const copied = await copyTextToClipboard(text, targetTabId);
    if (!copied) throw new Error(chrome.i18n.getMessage('clipboardFailed'));
    const msg = includeTimestamps ? toastMessages.copyWithTs : toastMessages.copyWithoutTs;
    if (targetTabId) await showToast(targetTabId, msg, 'success');
  } catch (err) {
    console.error('[SubCopy] onCopySubtitles error:', err);
    if (targetTabId) await showToast(targetTabId, formatError(err.message), 'error');
  } finally {
    window.close();
  }
}

// Find highest resolution available for YouTube video thumbnail
async function getHighestQualityThumbnail(videoId) {
  const qualities = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  ];

  for (const url of qualities) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        });
        URL.revokeObjectURL(objectUrl);

        if (img.naturalWidth > 120) {
          return { blob, img, url, width: img.naturalWidth, height: img.naturalHeight };
        }
      }
    } catch (e) {}
  }
  throw new Error('Thumbnail not available');
}

// 2. Download the highest-resolution thumbnail YouTube provides
async function onDownloadCover() {
  let targetTabId = activeTabId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) targetTabId = tab.id;

    const videoId = currentVideoData?.videoId;
    if (!videoId) throw new Error('noVideoId');

    const { blob } = await getHighestQualityThumbnail(videoId);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `cover-${videoId}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    if (targetTabId) await showToast(targetTabId, toastMessages.coverDownloaded, 'success');
  } catch (err) {
    console.error('[SubCopy] onDownloadCover error:', err);
    if (targetTabId) await showToast(targetTabId, formatError(err.message), 'error');
  }
}

// 3. Copy Thumbnail Image to Clipboard (PNG Blob)
async function onCopyCover() {
  let targetTabId = activeTabId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) targetTabId = tab.id;

    const videoId = currentVideoData?.videoId;
    if (!videoId) throw new Error('noVideoId');

    const { img } = await getHighestQualityThumbnail(videoId);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('Canvas conversion failed');

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);

    if (targetTabId) await showToast(targetTabId, toastMessages.coverCopied, 'success');
  } catch (err) {
    console.error('[SubCopy] onCopyCover error:', err);
    if (targetTabId) await showToast(targetTabId, formatError(err.message), 'error');
  } finally {
    window.close();
  }
}

// 4. Copy All Video Info (Markdown report: Title, Metadata, Chapters, Tags, Links, Description)
async function onCopyAllInfo() {
  let targetTabId = activeTabId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) targetTabId = tab.id;

    if (!currentVideoData || !currentVideoData.videoId) throw new Error('noVideoId');
    const data = currentVideoData;

    const fmtTime = s => {
      const secNum = parseInt(s, 10) || 0;
      const h = Math.floor(secNum / 3600);
      const m = Math.floor((secNum % 3600) / 60);
      const sec = Math.floor(secNum % 60);
      const p = n => String(n).padStart(2, '0');
      return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
    };

    const views = Number(data.viewCount || 0).toLocaleString();
    const duration = fmtTime(data.lengthSeconds);

    let md = `# ${data.title}\n\n`;
    md += `**Channel:** ${data.author} | **Duration:** ${duration} | **Views:** ${views}\n`;
    md += `**URL:** https://www.youtube.com/watch?v=${data.videoId}\n\n`;

    if (data.chapters && data.chapters.length > 0) {
      md += `## 📌 Chapters\n`;
      data.chapters.forEach(ch => {
        md += `- ${ch.time} ${ch.title}\n`;
      });
      md += `\n`;
    }

    if (data.keywords && data.keywords.length > 0) {
      md += `## 🏷 Tags / Keywords\n`;
      md += `${data.keywords.join(', ')}\n\n`;
    }

    if (data.links && data.links.length > 0) {
      md += `## 🔗 Links from Description\n`;
      data.links.forEach(l => {
        md += `- ${l}\n`;
      });
      md += `\n`;
    }

    if (data.description) {
      md += `## 📄 Description\n`;
      md += `${data.description}\n`;
    }

    const copied = await copyTextToClipboard(md.trim(), targetTabId);
    if (!copied) throw new Error(chrome.i18n.getMessage('clipboardFailed'));
    if (targetTabId) await showToast(targetTabId, toastMessages.infoCopied, 'success');
  } catch (err) {
    console.error('[SubCopy] onCopyAllInfo error:', err);
    if (targetTabId) await showToast(targetTabId, formatError(err.message), 'error');
  } finally {
    window.close();
  }
}

// Event Listeners
copyWithTsBtn.addEventListener('click', () => onCopySubtitles(true));
copyWithoutTsBtn.addEventListener('click', () => onCopySubtitles(false));
downloadCoverBtn.addEventListener('click', onDownloadCover);
copyCoverBtn.addEventListener('click', onCopyCover);
copyAllInfoBtn.addEventListener('click', onCopyAllInfo);

// Initialize
initPopup();
