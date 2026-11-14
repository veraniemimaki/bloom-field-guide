const STORE_KEY = 'bloom-field-notes-v1';
const contexts = [
  { id: 'wind-down', title: 'Wind down', sub: 'A softer end to the day', icon: '☾' },
  { id: 'reset', title: 'Take a small pause', sub: 'A moment to reset', icon: '✳' },
  { id: 'outside', title: 'Feel a little outdoors', sub: 'Bring nature a bit closer', icon: '⌁' }
];
const variants = [
  { id: 'wind', title: 'Soft wind', description: 'A low, steady breeze moves through the forest canopy.', icon: '〰', kind: 'wind' },
  { id: 'leaves', title: 'Rustling leaves', description: 'A light rustle moves through the tree canopy.', icon: '♧', kind: 'leaves' }
];
const feedback = [
  { id: 'better', label: 'Felt better', icon: '↑', score: 1 },
  { id: 'same', label: 'No difference', icon: '↔', score: 0 },
  { id: 'worse', label: 'Felt worse', icon: '↓', score: -1 }
];
// Fictional example data is kept separate from a person's saved field notes.
const sampleNotes = [
  { context: 'wind-down', variant: 'wind', response: 'better' },
  { context: 'wind-down', variant: 'leaves', response: 'same' },
  { context: 'wind-down', variant: 'wind', response: 'better' },
  { context: 'reset', variant: 'leaves', response: 'better' }
];

let notes = loadNotes();
let state = { screen: 'start', context: null, index: 0, session: [], previewSample: false };
let audioContext = null;
let soundNodes = [];
let soundTimer = null;
let playing = false;

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
function saveNotes() { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
function getChoice(list, id) { return list.find(item => item.id === id); }
function render() {
  const app = document.getElementById('app');
  if (state.screen === 'start') app.innerHTML = renderStart();
  if (state.screen === 'trial') app.innerHTML = renderTrial();
  if (state.screen === 'recipe') app.innerHTML = renderRecipe();
  bindScreen();
}
function renderStart() {
  return `<p class="step-label">A two-minute sensory experiment · 1 of 3</p>
    <h1>What would feel useful right now?</h1>
    <p class="lead">Choose a moment. We’ll explore two versions of the same forest scene, changing only the sound.</p>
    <button class="secondary-button sample-button" id="sample-journey-button" type="button">Preview a returning-user example <span aria-hidden="true">↗</span></button>
    <div class="choice-grid">${contexts.map(c => `<button class="choice-card ${state.context === c.id ? 'selected' : ''}" data-context="${c.id}" type="button"><span class="choice-icon">${c.icon}</span><span><span class="choice-title">${c.title}</span><span class="choice-sub">${c.sub}</span></span></button>`).join('')}</div>
    <div class="actions"><button class="primary-button" id="begin-button" type="button" ${state.context ? '' : 'disabled'}>Begin the experience <span aria-hidden="true">→</span></button><button class="text-button" id="skip-button" type="button">Not now</button></div>
    <p class="privacy-note">The example uses fictional responses and won’t be saved as your notes.</p>`;
}
function renderTrial() {
  const variant = variants[state.index];
  const step = state.index + 1;
  return `<p class="step-label">${getChoice(contexts, state.context).title} · ${step} of 2</p>
    <h1>Notice how this version feels.</h1>
    <p class="lead">Take a few seconds, or skip ahead whenever you like. There’s no right response.</p>
    <div class="trial-card"><div class="trial-head"><div><p class="eyebrow">SOUND ${step}</p><h2>${variant.title}</h2><p>${variant.description}</p></div><span class="variant-pill">${step === 1 ? 'Version A' : 'Version B'}</span></div>
      <div class="sound-controls"><button class="play-button" id="play-button" type="button" aria-label="Play sound">${playing ? 'Ⅱ' : '▶'}</button><div class="sound-meta"><strong>${variant.title} ambience</strong><span>Sound only · No voice</span></div><span class="sound-status" id="sound-status">${playing ? 'Playing' : 'Ready'}</span></div>
      <p class="feedback-label">How did it feel for you?</p><div class="feedback-grid">${feedback.map(f => `<button class="feedback-button" data-feedback="${f.id}" type="button"><span>${f.icon}</span>${f.label}</button>`).join('')}</div>
      <button class="quiet-link" id="skip-trial" type="button">Skip this version</button>
    </div>`;
}
function renderRecipe() {
  const ranked = rankVariants(state.context);
  const best = ranked[0];
  const other = ranked[1];
  const evidence = best.count === 0
    ? 'No notes yet. Try a short experience to start learning what you prefer.'
    : best.count === 1
    ? `You’ve tried ${best.title.toLowerCase()} once in this context. There isn’t a pattern yet.`
    : `You chose ${best.title.toLowerCase()} as “felt better” ${best.positive} of ${best.count} times in this context.`;
  const takeAlong = best.id === 'wind' ? 'If it suits you, pause and notice a breeze moving through nearby trees.' : 'If it suits you, notice the sound or movement of leaves nearby.';
  return `<p class="step-label">${state.previewSample ? 'Fictional example · sample history' : 'Your field note · saved on this device'}</p><h1>A reset you can make your own.</h1>
    <p class="lead">BLOOM keeps your response visible, so you can decide whether this recipe belongs in your field guide.</p>
    <div class="recipe-card"><div class="recipe-top"><div><p class="eyebrow">${getChoice(contexts, state.context).title.toUpperCase()}</p><h2>${best.title} in the forest</h2></div><span class="recipe-count">${best.count} ${best.count === 1 ? 'try' : 'tries'}</span></div>
      <div class="recipe-detail"><span class="mini-icon">${best.icon}</span><div><strong>${best.title}</strong><span>Forest scene · sound only</span></div></div>
      <div class="evidence"><strong>${state.previewSample ? 'What the sample notes say' : 'What your notes say'}</strong><br>${evidence}${state.previewSample ? '<br><span class="privacy-note">Fictional example only—not a real person’s history.</span>' : ''}</div>
      <div class="real-world"><strong>A real-world version (you choose)</strong><p>${takeAlong}</p></div>
      ${state.session.some(x => x.skipped) ? '<p class="privacy-note">Skipped versions weren’t counted as feedback.</p>' : ''}
      <div class="actions"><button class="primary-button" id="again-button" type="button">Try this again</button><button class="secondary-button" id="edit-button" type="button">Change context</button></div>
      <button class="quiet-link" id="new-session-button" type="button">Try the other sound next time: ${other.title.toLowerCase()}</button>
    </div>`;
}
function rankVariants(contextId) {
  const source = state.previewSample ? sampleNotes : notes;
  return variants.map(v => {
    const entries = source.filter(n => n.context === contextId && n.variant === v.id);
    return { ...v, count: entries.length, positive: entries.filter(n => n.response === 'better').length, score: entries.reduce((sum, n) => sum + (getChoice(feedback, n.response)?.score || 0), 0) };
  }).sort((a,b) => b.score - a.score || b.positive - a.positive || a.count - b.count);
}
function bindScreen() {
  document.querySelectorAll('[data-context]').forEach(button => button.addEventListener('click', () => { state.context = button.dataset.context; render(); }));
  document.getElementById('begin-button')?.addEventListener('click', () => { state.previewSample = false; state.screen = 'trial'; state.index = 0; state.session = []; render(); });
  document.getElementById('sample-journey-button')?.addEventListener('click', () => { state.previewSample = true; state.context = 'wind-down'; state.screen = 'recipe'; render(); });
  document.getElementById('skip-button')?.addEventListener('click', () => { state.screen = 'recipe'; state.context ||= contexts[0].id; render(); });
  document.getElementById('play-button')?.addEventListener('click', toggleSound);
  document.querySelectorAll('[data-feedback]').forEach(button => button.addEventListener('click', () => recordResponse(button.dataset.feedback)));
  document.getElementById('skip-trial')?.addEventListener('click', () => recordResponse(null));
  document.getElementById('again-button')?.addEventListener('click', () => { state.previewSample = false; state.screen = 'trial'; state.index = 0; state.session = []; render(); });
  document.getElementById('edit-button')?.addEventListener('click', () => { state.previewSample = false; state.screen = 'start'; state.context = null; render(); });
  document.getElementById('new-session-button')?.addEventListener('click', () => { state.previewSample = false; state.screen = 'start'; render(); });
}
function recordResponse(response) {
  stopSound();
  const variant = variants[state.index];
  const entry = { id: crypto.randomUUID?.() || String(Date.now()), at: new Date().toISOString(), context: state.context, variant: variant.id, response, skipped: response === null };
  state.session.push(entry);
  if (response) { notes.push(entry); saveNotes(); }
  if (state.index === 0) { state.index = 1; state.screen = 'trial'; }
  else state.screen = 'recipe';
  render();
}

async function toggleSound() {
  if (playing) { stopSound(); render(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { alert('Audio playback is not available in this browser. You can still continue with the demo.'); return; }
  audioContext ||= new Ctx();
  await audioContext.resume();
  const sound = variants[state.index].kind;
  playing = true;
  if (sound === 'wind') startWind(audioContext); else startLeaves(audioContext);
  render();
}
function track(node) { soundNodes.push(node); return node; }
function makeNoise(ctx) {
  const size = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<size;i++) data[i] = (Math.random()*2-1) * .34;
  const source = track(ctx.createBufferSource()); source.buffer = buffer; source.loop = true;
  source.start();
  return source;
}
function startWind(ctx) {
  const source = makeNoise(ctx);
  const filter = track(ctx.createBiquadFilter()); filter.type = 'lowpass'; filter.frequency.value = 430;
  const lfo = track(ctx.createOscillator()); lfo.frequency.value = .075;
  const depth = track(ctx.createGain()); depth.gain.value = 150;
  lfo.connect(depth); depth.connect(filter.frequency);
  const gain = track(ctx.createGain()); gain.gain.value = .17;
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination); lfo.start();
}
function startLeaves(ctx) {
  const source = makeNoise(ctx);
  const filter = track(ctx.createBiquadFilter()); filter.type = 'highpass'; filter.frequency.value = 780;
  const gain = track(ctx.createGain()); gain.gain.value = 0;
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  const rustle = () => {
    if (!playing) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(.002, now);
    gain.gain.linearRampToValueAtTime(.055, now + .18 + Math.random()*.18);
    gain.gain.linearRampToValueAtTime(.002, now + .8 + Math.random()*.5);
    soundTimer = setTimeout(rustle, 1000 + Math.random()*1100);
  };
  rustle();
}
function stopSound() {
  playing = false; clearTimeout(soundTimer);
  soundNodes.forEach(node => { try { node.stop?.(); } catch {} try { node.disconnect?.(); } catch {} });
  soundNodes = [];
}

document.getElementById('history-button').addEventListener('click', () => { renderHistory(); document.getElementById('history-dialog').showModal(); });
document.getElementById('about-button').addEventListener('click', () => document.getElementById('about-dialog').showModal());
document.getElementById('clear-button').addEventListener('click', () => { notes = []; saveNotes(); renderHistory(); });
function renderHistory() {
  const host = document.getElementById('history-content');
  if (!notes.length) { host.innerHTML = '<div class="empty-note">No saved field notes yet. Try a short experience to start one.</div>'; return; }
  const previousVariantNames = { water: 'Flowing water (previous demo)', birds: 'Birdsong (previous demo)' };
  host.innerHTML = [...notes].reverse().map(n => `<div class="history-row"><strong>${getChoice(variants,n.variant)?.title || previousVariantNames[n.variant] || n.variant} · ${getChoice(contexts,n.context)?.title || n.context}</strong><span>${getChoice(feedback,n.response)?.label || n.response} · ${new Date(n.at).toLocaleDateString()}</span></div>`).join('');
}

render();

