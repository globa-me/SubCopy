window.__subCopyGetSubtitles = async function (includeTs) {
  // Attempt 1: fetch subtitles via the YouTube Innertube API
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

  // Attempt 2: fallback — parse the open "Transcript" panel if available
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

  // Try API first; fall back to the transcript panel on failure
  try {
    return await fetchByApi();
  } catch (err) {
    console.warn('[SubCopy] API fetch failed:', err.message);
    return fetchFromPanel();
  }
};
