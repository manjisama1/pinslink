//-----Created by Manji on 2026-02-25 | v2.0-----//
const $ = id => document.getElementById(id);

const QUALITIES = [
  { value: 'originals', label: 'Original (best quality)', hint: 'Full-size file. Largest, but a few pins may not have one.' },
  { value: '1200x',     label: '1200 px',                 hint: 'Very high quality, not available on every pin.' },
  { value: '736x',      label: '736 px (recommended)',    hint: 'Sharp and reliable. Works on virtually every pin.' },
  { value: '564x',      label: '564 px',                  hint: 'Good quality, smaller files.' },
  { value: '474x',      label: '474 px',                  hint: 'Medium quality, small files.' },
  { value: '236x',      label: '236 px',                  hint: 'Thumbnail size.' },
  { value: '170x',      label: '170 px',                  hint: 'Smallest thumbnail.' }
];

const state = { ids: [], active: true, quality: '736x', job: null };
let statusTimer = null;
let wipeTimer = null;
let wipeArmed = false;

const say = (msg, ms = 2500) => {
  $('status').textContent = msg;
  clearTimeout(statusTimer);
  if (msg) statusTimer = setTimeout(() => ($('status').textContent = ''), ms);
};

const urlsFor = () => state.ids.map(p => `https://i.pinimg.com/${state.quality}/${p}`);

const render = () => {
  const running = !!state.job?.running;
  const has = state.ids.length > 0;

  $('count').textContent = state.ids.length.toLocaleString();
  $('pill').classList.toggle('on', state.active);
  $('pillText').textContent = state.active ? 'Collecting' : 'Paused';
  $('toggle').textContent = state.active ? 'Pause' : 'Resume';
  $('quality').value = state.quality;
  $('hint').textContent = QUALITIES.find(q => q.value === state.quality)?.hint || '';

  $('download').textContent = running ? 'Cancel download' : 'Download images';
  $('download').disabled = !has && !running;
  $('export').disabled = !has || running;
  $('copy').disabled = !has || running;
  $('wipe').disabled = !has || running;

  const job = state.job;
  const show = !!job && job.total > 0;
  $('progress').classList.toggle('show', show);
  if (show) {
    const pct = Math.round((job.done / job.total) * 100);
    $('barFill').style.width = pct + '%';
    let text = `${job.done} / ${job.total}`;
    if (!job.running) {
      text = job.cancelled ? `Cancelled at ${job.done} / ${job.total}` : `Done: ${job.total - job.failed} saved to Downloads/PinsLink`;
    }
    if (job.failed) text += ` · ${job.failed} failed`;
    if (job.lowered && !running) text += ` · ${job.lowered} used a lower size`;
    $('progressText').textContent = text;
  }
};

const load = () => {
  chrome.storage.local.get(['ids', 'active', 'quality', 'job'], res => {
    state.ids = res.ids || [];
    state.active = res.active ?? true;
    state.quality = res.quality || '736x';
    state.job = res.job || null;
    render();
  });
};

// Setup
QUALITIES.forEach(q => {
  const o = document.createElement('option');
  o.value = q.value;
  o.textContent = q.label;
  $('quality').appendChild(o);
});

$('quality').onchange = e => {
  state.quality = e.target.value;
  chrome.storage.local.set({ quality: state.quality });
  render();
};

$('download').onclick = () => {
  if (state.job?.running) {
    chrome.runtime.sendMessage({ type: 'cancel' });
    chrome.storage.local.set({ job: { ...state.job, running: false, cancelled: true } });
    return;
  }
  if (!state.ids.length) return;
  chrome.runtime.sendMessage({ type: 'download', quality: state.quality });
  say('Starting download…');
};

$('export').onclick = () => {
  const blob = new Blob([urlsFor().join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pinslink_${state.quality}_${Date.now()}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(`Exported ${state.ids.length} links`);
};

$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(urlsFor().join('\n'));
    say(`Copied ${state.ids.length} links`);
  } catch {
    say('Copy failed. Use Export instead.');
  }
};

$('toggle').onclick = () => chrome.storage.local.set({ active: !state.active });

$('wipe').onclick = () => {
  if (!wipeArmed) {
    wipeArmed = true;
    $('wipe').textContent = 'Click to confirm';
    $('wipe').classList.add('confirm');
    wipeTimer = setTimeout(resetWipe, 3000);
    return;
  }
  resetWipe();
  chrome.storage.local.set({ ids: [], job: null });
  say('Cleared');
};

function resetWipe() {
  clearTimeout(wipeTimer);
  wipeArmed = false;
  $('wipe').textContent = 'Clear';
  $('wipe').classList.remove('confirm');
}

chrome.storage.onChanged.addListener(load);
load();
