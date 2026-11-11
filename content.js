//-----Created by Manji on 2026-02-25 | v2.0-----//
// Collects only the unique image path (e.g. "ab/cd/ef/hash.jpg") and ignores
// the size folder, so quality can be chosen later at export / download time.
(() => {
  const RE = /^https?:\/\/i\.pinimg\.com\/(?:170x|236x|474x|564x|736x|1200x|originals)\/([^?#\s]+\.(?:jpe?g|png|gif|webp))/i;

  let active = true;
  let timer = null;
  const pending = new Set();

  const keyOf = src => {
    const m = RE.exec(src || '');
    return m ? m[1] : null;
  };

  const flush = () => {
    timer = null;
    if (!pending.size || !chrome.runtime?.id) return;
    const batch = [...pending];
    pending.clear();
    chrome.storage.local.get('ids', ({ ids = [] }) => {
      const set = new Set(ids);
      const before = set.size;
      batch.forEach(k => set.add(k));
      if (set.size !== before) chrome.storage.local.set({ ids: [...set] });
    });
  };

  const scan = () => {
    if (!active) return;
    for (const img of document.images) {
      const sources = [img.currentSrc, img.src];
      const srcset = img.getAttribute('srcset');
      if (srcset) srcset.split(',').forEach(p => sources.push(p.trim().split(/\s+/)[0]));
      for (const s of sources) {
        const k = keyOf(s);
        if (k) pending.add(k);
      }
    }
    if (pending.size && !timer) timer = setTimeout(flush, 500);
  };

  let scanTimer = null;
  const scheduleScan = () => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = null; scan(); }, 250);
  };

  chrome.storage.local.get('active', res => {
    active = res.active ?? true;
    scan();
  });

  chrome.storage.onChanged.addListener(changes => {
    if (changes.active) {
      active = changes.active.newValue ?? true;
      if (active) scan();
    }
  });

  new MutationObserver(scheduleScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset']
  });
})();
