//-----Created by Manji on 2026-02-25 | v2.0-----//
const CHAIN = ['originals', '1200x', '736x', '564x', '474x', '236x', '170x'];
const EXTS = ['jpg', 'png', 'gif', 'webp', 'jpeg'];
const CONCURRENCY = 4;
const RE = /^https?:\/\/i\.pinimg\.com\/(?:170x|236x|474x|564x|736x|1200x|originals)\/([^?#\s]+)/i;

let cancelled = false;

// Upgrade data saved by v1.x (full URLs) to the new format (image path only).
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['pins', 'ids'], ({ pins, ids = [] }) => {
    if (!pins?.length) return;
    const set = new Set(ids);
    pins.forEach(u => { const m = RE.exec(u); if (m) set.add(m[1]); });
    chrome.storage.local.set({ ids: [...set] }, () => chrome.storage.local.remove('pins'));
  });
});

const exists = async url => {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
};

// Try the chosen quality first, then step down. For "originals" the file
// extension can differ from the preview (e.g. gif/png), so try those too.
const resolve = async (path, quality) => {
  const dot = path.lastIndexOf('.');
  const base = path.slice(0, dot);
  const ext = path.slice(dot + 1).toLowerCase();
  const start = Math.max(0, CHAIN.indexOf(quality));
  for (const q of CHAIN.slice(start)) {
    const exts = q === 'originals' ? [ext, ...EXTS.filter(e => e !== ext)] : [ext];
    for (const e of exts) {
      const url = `https://i.pinimg.com/${q}/${base}.${e}`;
      if (await exists(url)) return { url, q, e };
    }
  }
  return null;
};

const setJob = job => chrome.storage.local.set({ job });

const run = async quality => {
  cancelled = false;
  const { ids = [] } = await chrome.storage.local.get('ids');
  const job = { running: true, total: ids.length, done: 0, failed: 0, lowered: 0, quality };
  await setJob(job);

  let i = 0;
  const worker = async () => {
    while (!cancelled && i < ids.length) {
      const path = ids[i++];
      const hit = await resolve(path, quality);
      if (hit) {
        const name = path.split('/').pop().replace(/\.[^.]+$/, '');
        try {
          await chrome.downloads.download({
            url: hit.url,
            filename: `PinsLink/${name}.${hit.e}`,
            conflictAction: 'uniquify'
          });
          if (hit.q !== quality) job.lowered++;
        } catch {
          job.failed++;
        }
      } else {
        job.failed++;
      }
      job.done++;
      if (job.done % 3 === 0 || job.done === job.total) await setJob({ ...job });
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await setJob({ ...job, running: false, cancelled });
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg?.type === 'download') run(msg.quality);
  if (msg?.type === 'cancel') cancelled = true;
});
