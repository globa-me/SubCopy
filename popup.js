async function onCopy(includeTimestamps) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject the content script that defines window.__subCopyGetSubtitles
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });

    // Call the injected function, passing the timestamps flag
    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (includeTs) => window.__subCopyGetSubtitles(includeTs),
      args: [includeTimestamps],
    });

    if (!text) {
      alert('No subtitles found. Please enable CC or open transcript.');
      return;
    }

    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  } catch (err) {
    console.error('[SubCopy] onCopy error:', err);
    alert('Error: ' + err.message);
  }
}

document.getElementById('copyWithTimestamps')
  .addEventListener('click', () => {
    console.log('[SubCopy] click WITH timestamps');
    onCopy(true);
  });
document.getElementById('copyWithoutTimestamps')
  .addEventListener('click', () => {
    console.log('[SubCopy] click WITHOUT timestamps');
    onCopy(false);
  });
