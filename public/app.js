const STORE_KEY = 'bloom-field-notes-v1';
const SUPPORT_STORE_KEY = 'bloom-support-options-v1';
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
let supportOptions = loadSupportOptions();
let state = { screen: 'start', context: null, index: 0, session: [], previewSample: false, firstVariant: null, sessionSignal: null, soundLevel: 'gentle', momentMatch: null, descriptionEntered: false, view: 'patient', signal: 'restless', suggestion: null, followUps: {}, communityTab: 'room', communityMessage: '', communityNotice: '', communityPosts: [
  { id: 'peer-1', author: 'Member 18 · sample', text: 'I keep a soft nature sound low while I make tea.', status: 'published', sample: true },
  { id: 'peer-2', author: 'Member 42 · sample', text: 'Looking out of my window for one minute is an easy pause.', status: 'published', sample: true },
  { id: 'review-1', author: 'Member 07 · sample', text: 'You should stop your prescribed treatment if it makes you tired.', status: 'pending', sample: true, flag: 'Possible direct treatment advice', flagLevel: 'review' }
] };
const demoSignals = {
  restless: { label: 'Restless night', detail: 'A self-reported demo check-in: sleep felt unsettled.', context: 'wind-down', variant: 'wind', reason: 'A quieter wind-down moment may be worth trying after a restless night.' },
  overloaded: { label: 'Too much going on', detail: 'A self-reported demo check-in: the moment feels busy or overstimulating.', context: 'reset', variant: 'leaves', reason: 'A brief pause with a lighter leaf sound may be worth trying when things feel busy.' },
  low: { label: 'Low energy', detail: 'A self-reported demo check-in: energy feels low today.', context: 'reset', variant: 'wind', reason: 'A short, gentle pause may be worth trying; you can choose another option.' },
  setting: { label: 'By a window or outdoors', detail: 'A self-reported demo check-in: you are near a window or outdoors.', context: 'outside', variant: 'leaves', reason: 'A light nature-inspired sound may fit this setting; you can choose another option.' }
};
let audioContext = null;
let soundNodes = [];
let soundTimer = null;
let playing = false;

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
function saveNotes() { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
function loadSupportOptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUPPORT_STORE_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function saveSupportOptions() { localStorage.setItem(SUPPORT_STORE_KEY, JSON.stringify(supportOptions)); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function getChoice(list, id) { return list.find(item => item.id === id); }
function render() {
  const app = document.getElementById('app');
  if (state.screen === 'start') app.innerHTML = renderStart();
  if (state.screen === 'trial') app.innerHTML = renderTrial();
  if (state.screen === 'recipe') app.innerHTML = renderRecipe();
  if (state.screen === 'guide') app.innerHTML = renderGuide();
  if (state.screen === 'clinician') app.innerHTML = renderClinician();
  if (state.screen === 'community') app.innerHTML = renderCommunity();
  document.getElementById('patient-view-button')?.classList.toggle('active', state.view === 'patient');
  document.getElementById('clinician-view-button')?.classList.toggle('active', state.view === 'clinician');
  document.getElementById('community-view-button')?.classList.toggle('active', state.view === 'community');
  bindScreen();
}
function renderStart() {
  const supportOption = state.context ? (supportOptions[state.context] || '') : '';
  return `<p class="step-label">A two-minute sensory experiment · 1 of 3</p>
    <h1>What would feel useful right now?</h1>
    <p class="lead">Choose a moment. We’ll explore two versions of the same forest scene, changing only the sound.</p>
    <section class="signal-panel" aria-labelledby="signal-heading">
      <div class="signal-heading"><div><p class="eyebrow">OPTIONAL · SELF-REPORTED CHECK-IN</p><h2 id="signal-heading">What is this moment like?</h2></div><span class="demo-tag">YOUR CHOICE</span></div>
      <p class="signal-copy"><strong>${escapeHtml(demoSignals[state.signal].detail)}</strong><br>Choose an example, describe the moment in your own words, or skip the check-in. No phone or wearable sensors are read.</p>
      <div class="signal-options">${Object.entries(demoSignals).map(([id, item]) => `<button class="signal-option ${state.signal === id ? 'selected' : ''}" data-signal="${id}" type="button" aria-pressed="${state.signal === id}">${item.label}</button>`).join('')}</div>
      <label class="moment-field" for="moment-description"><span>Or describe what feels noticeable <span>(optional)</span></span><textarea id="moment-description" maxlength="160" placeholder="For example: indoors, tired, and wanting something steady"></textarea><small>Read locally in this page only; not saved or sent. Avoid names or medical details.</small></label>
      <button class="secondary-button" id="suggest-button" type="button">Shape a sensory experiment</button>
      ${state.suggestion ? `<div class="suggestion-card"><p class="eyebrow">A STARTING POINT TO CONSIDER</p><p class="suggestion-edit-label">Moment</p><select id="suggestion-context" class="suggestion-select">${contexts.map(item => `<option value="${item.id}" ${item.id === state.suggestion.context ? 'selected' : ''}>${item.title}</option>`).join('')}</select><p class="suggestion-edit-label">Sound to try first</p><select id="suggestion-variant" class="suggestion-select">${variants.map(item => `<option value="${item.id}" ${item.id === state.suggestion.variant ? 'selected' : ''}>${item.title}</option>`).join('')}</select><p>${escapeHtml(state.suggestion.reason)}</p>${state.suggestion.variantEdited ? `<p class="edit-note">You changed the first sound to ${escapeHtml(getChoice(variants,state.suggestion.variant).title)}.</p>` : ''}<div class="suggestion-actions"><button class="primary-button" id="use-suggestion-button" type="button">Try this suggestion</button><button class="text-button" id="clear-suggestion-button" type="button">Clear suggestion</button></div></div>` : ''}
      <p class="privacy-note">Suggestions use transparent keyword rules and your saved ratings. They are exploratory, not a reading of your mental state or clinical recommendations.</p>
    </section>
    <div class="start-links"><button class="secondary-button sample-button" id="sample-journey-button" type="button">Preview a fictional returning-user example <span aria-hidden="true">↗</span></button>${hasPersonalGuide() ? '<button class="secondary-button sample-button" id="personal-guide-button" type="button">Open my field guide <span aria-hidden="true">→</span></button>' : ''}</div>
    <div class="choice-grid">${contexts.map(c => `<button class="choice-card ${state.context === c.id ? 'selected' : ''}" data-context="${c.id}" type="button"><span class="choice-icon">${c.icon}</span><span><span class="choice-title">${c.title}</span><span class="choice-sub">${c.sub}</span></span></button>`).join('')}</div>
    ${state.context ? `<label class="support-option-field" for="support-option"><span class="support-option-title">Your own real-world cue <span>(optional)</span></span><textarea id="support-option" maxlength="160" placeholder="${state.context === 'wind-down' ? 'For example: settle somewhere comfortable' : state.context === 'reset' ? 'For example: notice your feet on the floor' : 'For example: look outside from where you are'}">${escapeHtml(supportOption)}</textarea><span class="privacy-note">Saved only on this device. You can change or remove it anytime.</span></label>` : ''}
    <div class="actions"><button class="primary-button" id="begin-button" type="button" ${state.context ? '' : 'disabled'}>Begin the experience <span aria-hidden="true">→</span></button><button class="text-button" id="skip-button" type="button">Not now</button></div>
    <p class="privacy-note">The example uses fictional responses and won’t be saved as your notes.</p>`;
}
function renderTrial() {
  const variant = sessionVariants()[state.index];
  const step = state.index + 1;
  return `<p class="step-label">${getChoice(contexts, state.context).title} · ${step} of 2</p>
    <h1>Notice how this version feels.</h1>
    <p class="lead">Take a few seconds, or skip ahead whenever you like. There’s no right response.</p>
    <div class="trial-card"><div class="trial-head"><div><p class="eyebrow">SOUND ${step}</p><h2>${variant.title}</h2><p>${variant.description}</p></div><span class="variant-pill">${step === 1 ? 'Version A' : 'Version B'}</span></div>
      <div class="sound-controls"><button class="play-button" id="play-button" type="button" aria-label="Play sound">${playing ? 'Ⅱ' : '▶'}</button><div class="sound-meta"><strong>${variant.title} ambience</strong><span>Generated in this browser · level is shared across both sounds</span></div><label class="trial-volume-control" for="trial-sound-level"><span>Level</span><select id="trial-sound-level"><option value="soft" ${state.soundLevel === 'soft' ? 'selected' : ''}>Very soft</option><option value="gentle" ${state.soundLevel === 'gentle' ? 'selected' : ''}>Gentle</option><option value="fuller" ${state.soundLevel === 'fuller' ? 'selected' : ''}>A little fuller</option></select></label><span class="sound-status" id="sound-status">${playing ? 'Playing' : 'Ready'}</span></div>
      <p class="feedback-label">How did it feel for you?</p><div class="feedback-grid">${feedback.map(f => `<button class="feedback-button" data-feedback="${f.id}" type="button"><span>${f.icon}</span>${f.label}</button>`).join('')}</div>
      <button class="quiet-link" id="skip-trial" type="button">Skip this version</button>
    </div>`;
}
function sessionVariants() { return state.firstVariant ? [getChoice(variants, state.firstVariant), ...variants.filter(v => v.id !== state.firstVariant)] : variants; }
function hasPersonalGuide() { return notes.length > 0 || Object.values(supportOptions).some(value => String(value || '').trim()); }
function interpretMoment(text) {
  const words = String(text || '').toLowerCase();
  const rules = [
    { tag: 'restless', pattern: /restless|sleep|bedtime|wind.?down|tired|exhausted|evening/, context: 'wind-down', variant: 'wind', phrase: 'rest, tiredness, or evening' },
    { tag: 'overloaded', pattern: /busy|overwhelm|too much|crowd|noisy|noise|racing|tense|stressful/, context: 'reset', variant: 'leaves', phrase: 'a busy or overstimulating moment' },
    { tag: 'setting', pattern: /outside|outdoors|fresh air|window|trees?|nature|open air/, context: 'outside', variant: 'leaves', phrase: 'a window-side or outdoor setting' },
    { tag: 'low', pattern: /low energy|sluggish|drained|worn out/, context: 'reset', variant: 'wind', phrase: 'low energy' }
  ];
  return rules.find(rule => rule.pattern.test(words)) || null;
}
function rankForCheckin(contextId, checkinTag) {
  const entries = notes.filter(note => note.context === contextId && note.checkin === checkinTag);
  return variants.map(variant => {
    const matches = entries.filter(note => note.variant === variant.id);
    return { ...variant, count: matches.length, positive: matches.filter(note => note.response === 'better').length };
  }).sort((a, b) => b.positive - a.positive || b.count - a.count);
}
function buildSuggestion(signalId, contextId = demoSignals[signalId].context, momentMatch = null, descriptionEntered = false) {
  const signal = demoSignals[signalId];
  const context = getChoice(contexts, contextId);
  const taggedRank = momentMatch ? rankForCheckin(contextId, momentMatch.tag) : [];
  const taggedPreference = taggedRank.find(variant => variant.positive > 0);
  const contextPreference = rankVariants(contextId).find(variant => variant.positive > 0);
  const preferred = taggedPreference || contextPreference;
  const defaultVariant = momentMatch?.context === contextId
    ? getChoice(variants, momentMatch.variant)
    : contextId === signal.context ? getChoice(variants, signal.variant) : getChoice(variants, 'wind');
  const variant = preferred || defaultVariant;
  const historyReason = taggedPreference
    ? `In ${taggedPreference.positive} of ${taggedPreference.count} saved tries after similar check-ins, you marked ${taggedPreference.title.toLowerCase()} “felt better.”`
    : contextPreference
      ? `In ${contextPreference.positive} of ${contextPreference.count} saved ${context.title.toLowerCase()} tries, you marked ${contextPreference.title.toLowerCase()} “felt better.”`
      : 'There is not enough matching past feedback to identify a preference yet.';
  const inputReason = momentMatch
    ? `A local keyword rule matched words about ${momentMatch.phrase}, initially suggesting ${getChoice(contexts, momentMatch.context).title.toLowerCase()}.`
    : descriptionEntered
      ? `No matching keywords were found, so BLOOM used your “${signal.label.toLowerCase()}” check-in instead.`
      : `You chose the “${signal.label.toLowerCase()}” check-in.`;
  return {
    context: contextId,
    variant: variant.id,
    checkinTag: momentMatch?.tag || signalId,
    matchDescription: momentMatch?.phrase || '',
    reason: `${inputReason} ${historyReason} This is an exploratory starting point, not a prediction.`
  };
}
function classifyCommunityMessage(text) {
  const rules = [
    { pattern: /\b(kill myself|suicid|self[- ]?harm|hurt myself|end my life)\b/i, flag: 'Possible urgent distress language', flagLevel: 'urgent' },
    { pattern: /\b(stop|skip|change|increase|decrease)\b.{0,45}\b(medication|medicine|prescription|treatment|dose)\b/i, flag: 'Possible direct treatment advice', flagLevel: 'review' },
    { pattern: /\b(my address is|my phone number is|email me at)\b/i, flag: 'Possible personal information', flagLevel: 'review' }
  ];
  return rules.find(rule => rule.pattern.test(text)) || null;
}
function renderCommunity() {
  const published = state.communityPosts.filter(post => post.status === 'published');
  const pending = state.communityPosts.filter(post => post.status === 'pending');
  const decided = state.communityPosts.filter(post => post.humanDecision);
  const room = state.communityTab === 'room';
  const visiblePosts = room ? published : pending;
  const cards = visiblePosts.length
    ? visiblePosts.map(post => `<article class="community-post"><div class="community-post-top"><span>${escapeHtml(post.author)}</span>${post.flag ? `<span class="flag-label">${escapeHtml(post.flag)} · mock flag</span>` : post.sample ? '<span class="demo-tag">FICTIONAL SAMPLE</span>' : '<span class="post-label">Peer note</span>'}</div><p>${escapeHtml(post.text)}</p>${!room && post.flag ? `<p class="flag-rationale">Held from the peer room until a human makes the final demo decision.</p>` : ''}</article>`).join('')
    : room
      ? '<div class="empty-note">No peer notes in this demo room yet.</div>'
      : '<div class="empty-note">No comments are waiting for human review.</div>';
  const reviewCards = room ? '' : decided.map(post => `<article class="community-post reviewed-post"><div class="community-post-top"><span>${escapeHtml(post.author)}</span><span class="review-decision">${post.humanDecision === 'approved' ? 'Human approved' : 'Human did not approve'}</span></div><p>${escapeHtml(post.text)}</p></article>`).join('');
  return `<p class="step-label">Community concept · fictional local demo</p><h1>Small ideas, shared gently.</h1>
    <p class="lead">A peer space for sharing sensory ideas that made home feel a little easier. This is a single-browser prototype: posts are not shared with other visitors.</p>
    <div class="community-warning"><strong>Moderation preview only.</strong> Flagging uses demo keyword rules, not Gemini. No professional is alerted; the review screen is not access-controlled. Use fictional messages only.</div>
    <div class="community-tabs"><button class="secondary-button ${room ? 'selected' : ''}" id="community-room-tab" type="button">Peer room</button><button class="secondary-button ${!room ? 'selected' : ''}" id="community-review-tab" type="button">Human review preview · ${pending.length}</button></div>
    ${room ? `<section class="community-composer"><label for="community-message">Share a small sensory idea</label><textarea id="community-message" maxlength="280" placeholder="A sound, small ritual, or setting that you chose to try"></textarea><p class="privacy-note">Avoid names, treatment advice, or personal details. Your demo post stays in this page and clears when it reloads.</p><button class="primary-button" id="community-send-button" type="button">Post to demo room</button></section>` : `<div class="review-banner"><span class="demo-tag">MOCK AI FLAG</span><span>Flagged content stays hidden from the peer room until a human makes the final demo decision.</span></div>`}
    <div class="community-list">${cards}${reviewCards}</div>
    ${!room && pending.length ? `<div class="review-actions">${pending.map(post => `<div class="review-action-row"><span>Final decision for ${escapeHtml(post.author)}</span><button class="secondary-button" data-review="approve" data-post-id="${post.id}" type="button">Approve for demo room</button><button class="text-button" data-review="remove" data-post-id="${post.id}" type="button">Do not approve</button></div>`).join('')}</div>` : ''}
    ${state.communityNotice ? `<div class="community-notice" role="status">${escapeHtml(state.communityNotice)}</div>` : ''}
    <p class="privacy-note">A real version needs shared secure storage, a protected reviewer account, Gemini moderation, trained human coverage, and a clear escalation plan. This prototype provides none of those.</p>`;
}
function renderClinician() {
  const entries = [...notes].reverse();
  const summaryRows = entries.length
    ? entries.map(entry => {
        const context = getChoice(contexts, entry.context)?.title || entry.context;
        const variant = getChoice(variants, entry.variant)?.title || entry.variant;
        const response = getChoice(feedback, entry.response)?.label || entry.response;
        const checkin = entry.checkin && demoSignals[entry.checkin] ? ` · Check-in: ${demoSignals[entry.checkin].label}` : '';
        const level = entry.soundLevel ? ` · ${entry.soundLevel} volume` : '';
        return `<article class="summary-row"><div><strong>${escapeHtml(context)} · ${escapeHtml(variant)}</strong><span>${escapeHtml(response || 'No rating')}${escapeHtml(checkin)}${escapeHtml(level)}</span></div><time>${new Date(entry.at).toLocaleDateString()}</time></article>`;
      }).join('')
    : '<div class="empty-note">No rated experiences saved here yet. Try an experience and choose a response; your notes will appear here.</div>';
  return `<p class="step-label">Your notes · stored in this browser</p><h1>A summary you choose whether to share.</h1>
    <p class="lead">Review the check-ins and sound experiences you chose to record. Nothing is sent to a care team from this screen.</p>
    <div class="clinician-banner"><span class="demo-tag">YOUR FIELD NOTES</span><span>Not a clinical assessment · no risk or adherence score</span></div>
    <div class="summary-toolbar"><span>${entries.length} ${entries.length === 1 ? 'rated experience' : 'rated experiences'}</span><button class="primary-button" id="download-summary-button" type="button" ${entries.length ? '' : 'disabled'}>Download summary to share</button></div>
    <div class="summary-list">${summaryRows}</div>
    <p class="privacy-note">Downloading creates a text file on your device. BLOOM does not transmit it; you decide whether and with whom to share it.</p>`;
}
function renderGuide() {
  const cards = contexts.map(context => {
    const ranked = rankVariants(context.id);
    const preferred = ranked.find(variant => variant.positive > 0);
    const total = ranked.reduce((sum, variant) => sum + variant.count, 0);
    const cue = String(supportOptions[context.id] || '').trim();
    const evidence = preferred
      ? `You marked ${preferred.title.toLowerCase()} as “felt better” ${preferred.positive} of ${preferred.count} times in this moment.`
      : total
        ? 'No sound has been marked “felt better” yet. You can try again or change the options.'
        : 'No sound feedback saved for this moment yet.';
    return `<section class="guide-card"><div class="guide-card-top"><div><p class="eyebrow">${context.title.toUpperCase()}</p><h2>${preferred ? preferred.title + ' in the forest' : 'Still exploring'}</h2></div>${total ? `<span class="recipe-count">${total} ${total === 1 ? 'try' : 'tries'}</span>` : ''}</div>
      <p class="guide-evidence">${evidence}</p>
      ${cue ? `<div class="guide-cue"><strong>Your optional real-world cue</strong><p>${escapeHtml(cue)}</p></div>` : '<p class="guide-no-cue">No real-world cue saved for this moment.</p>'}
      <div class="guide-actions"><button class="primary-button" data-guide-try="${context.id}" type="button">Try this moment</button><button class="secondary-button" data-guide-edit="${context.id}" type="button">Edit real-world cue</button></div>
    </section>`;
  }).join('');
  return `<p class="step-label">Saved on this device · Your own notes</p><h1>Your field guide</h1>
    <p class="lead">A record of what you tried and what you chose to keep. It’s yours to update whenever you like.</p>
    <div class="guide-grid">${cards}</div>
    <div class="actions"><button class="secondary-button" id="guide-back-button" type="button">Back to moments</button></div>`;
}
function renderRecipe() {
  const ranked = rankVariants(state.context);
  const best = ranked.find(v => v.positive > 0) || ranked[0];
  const other = ranked.find(v => v.id !== best.id);
  const hasSupportiveSignal = ranked.some(v => v.positive > 0);
  const supportOption = !state.previewSample ? (supportOptions[state.context] || '').trim() : '';
  const evidence = hasSupportiveSignal
    ? best.count === 1
      ? `You’ve tried ${best.title.toLowerCase()} once in this context. There isn’t a pattern yet.`
      : `You marked ${best.title.toLowerCase()} as “felt better” ${best.positive} of ${best.count} times in this context.`
    : best.count === 0
      ? 'No notes yet. Try a short experience to start learning what you prefer.'
      : 'None of the saved responses in this context say that a sound felt better. BLOOM won’t choose a favorite without that signal.';
  const takeAlong = {
    'wind-down': 'If it suits you, settle somewhere comfortable or notice the light by a window.',
    reset: 'If it suits you, pause and notice your feet on the floor.',
    outside: 'If it suits you, look outside from where you are; stepping out is optional.'
  }[state.context];
  return `<p class="step-label">${state.previewSample ? 'Fictional example · sample history' : 'Your field note · saved on this device'}</p><h1>${hasSupportiveSignal ? 'A reset you can make your own.' : 'Nothing stood out as supportive yet.'}</h1>
    <p class="lead">${hasSupportiveSignal ? 'BLOOM keeps your response visible, so you can decide whether this recipe belongs in your field guide.' : 'That feedback is useful too. You don’t have to reuse something that didn’t feel supportive.'}</p>
    <div class="recipe-card">${hasSupportiveSignal ? `<div class="recipe-top"><div><p class="eyebrow">${getChoice(contexts, state.context).title.toUpperCase()}</p><h2>${best.title} in the forest</h2></div><span class="recipe-count">${best.count} ${best.count === 1 ? 'try' : 'tries'}</span></div>
      <div class="recipe-detail"><span class="mini-icon">${best.icon}</span><div><strong>${best.title}</strong><span>Forest scene · sound only</span></div></div>` : `<div class="recipe-top"><div><p class="eyebrow">${getChoice(contexts, state.context).title.toUpperCase()}</p><h2>No sound selected</h2></div></div>`}
      <div class="evidence"><strong>${state.previewSample ? 'What the sample notes say' : 'What your notes say'}</strong><br>${evidence}${state.previewSample ? '<br><span class="privacy-note">Fictional example only—not a real person’s history.</span>' : ''}</div>
      ${state.sessionSignal ? `<div class="real-world"><strong>Your check-in</strong><p>${escapeHtml(demoSignals[state.sessionSignal]?.label || '')} · self-reported</p></div>` : ''}
      ${supportOption ? `<div class="real-world"><strong>Your optional real-world cue</strong><p>${escapeHtml(supportOption)}</p></div>` : ''}
      ${hasSupportiveSignal ? `<div class="real-world"><strong>An optional cue for this moment</strong><p>${takeAlong}</p></div>` : ''}
      ${state.session.some(x => x.skipped) ? '<p class="privacy-note">Skipped versions weren’t counted as feedback.</p>' : ''}
      <div class="actions"><button class="primary-button" id="again-button" type="button">${hasSupportiveSignal ? 'Try this again' : 'Try these sounds again'}</button><button class="secondary-button" id="edit-button" type="button">Change context</button></div>
      ${hasSupportiveSignal ? `<button class="quiet-link" id="new-session-button" type="button">Try the other sound next time: ${other.title.toLowerCase()}</button>` : ''}
    </div>`;
}
function rankVariants(contextId) {
  const source = state.previewSample ? sampleNotes : notes;
  return variants.map(v => {
    const entries = source.filter(n => n.context === contextId && n.variant === v.id);
    return { ...v, count: entries.length, positive: entries.filter(n => n.response === 'better').length, score: entries.reduce((sum, n) => sum + (getChoice(feedback, n.response)?.score || 0), 0) };
  }).sort((a,b) => b.score - a.score || b.positive - a.positive || a.count - b.count);
}
function downloadCareSummary() {
  if (!notes.length) return;
  const lines = [
    'BLOOM — Home experience summary',
    `Created ${new Date().toLocaleString()}`,
    'Based on self-reported choices and ratings saved in this browser. Not a clinical assessment.',
    ''
  ];
  [...notes].reverse().forEach(entry => {
    const context = getChoice(contexts, entry.context)?.title || entry.context;
    const variant = getChoice(variants, entry.variant)?.title || entry.variant;
    const response = getChoice(feedback, entry.response)?.label || entry.response || 'No rating';
    const checkin = entry.checkin && demoSignals[entry.checkin] ? ` · Check-in: ${demoSignals[entry.checkin].label}` : '';
    const level = entry.soundLevel ? ` · ${entry.soundLevel} volume` : '';
    lines.push(`${new Date(entry.at).toLocaleDateString()} · ${context} · ${variant} · ${response}${checkin}${level}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'bloom-home-experience-summary.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}
function bindScreen() {
  document.getElementById('community-view-button')?.addEventListener('click', () => { stopSound(); state.view = 'community'; state.screen = 'community'; render(); });
  document.getElementById('community-room-tab')?.addEventListener('click', () => { state.communityTab = 'room'; state.communityNotice = ''; render(); });
  document.getElementById('community-review-tab')?.addEventListener('click', () => { state.communityTab = 'review'; state.communityNotice = ''; render(); });
  document.getElementById('community-send-button')?.addEventListener('click', () => {
    const field = document.getElementById('community-message');
    const text = String(field?.value || '').trim();
    if (!text) { state.communityNotice = 'Write a short sensory idea first.'; render(); return; }
    if (text.length > 280) { state.communityNotice = 'Keep the demo note under 280 characters.'; render(); return; }
    const flag = classifyCommunityMessage(text);
    const post = { id: `local-${Date.now()}`, author: 'You · demo', text, status: flag ? 'pending' : 'published', sample: false, flag: flag?.flag || null, flagLevel: flag?.flagLevel || null };
    state.communityPosts.push(post);
    state.communityTab = flag ? 'review' : 'room';
    state.communityNotice = flag
      ? `The simulated moderation check flagged this message: ${flag.flag}. It is hidden from the peer room while awaiting a human decision. No professional was notified by this demo.${flag.flagLevel === 'urgent' ? ' If you need immediate help, contact local emergency support or someone you trust.' : ''}`
      : 'Your demo note is visible in this browser only; it was not shared with other people.';
    render();
  });
  document.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', () => {
    const post = state.communityPosts.find(item => item.id === button.dataset.postId);
    if (!post) return;
    post.humanDecision = button.dataset.review === 'approve' ? 'approved' : 'not approved';
    post.status = post.humanDecision === 'approved' ? 'published' : 'removed';
    state.communityNotice = post.humanDecision === 'approved'
      ? 'Human reviewer approved this sample for the local demo room.'
      : 'Human reviewer did not approve this sample; it remains out of the demo room.';
    render();
  }));
  document.getElementById('patient-view-button')?.addEventListener('click', () => { state.view = 'patient'; state.screen = 'start'; render(); });
  document.getElementById('clinician-view-button')?.addEventListener('click', () => { stopSound(); state.view = 'clinician'; state.screen = 'clinician'; render(); });
  document.querySelectorAll('[data-signal]').forEach(button => button.addEventListener('click', () => { state.signal = button.dataset.signal; state.suggestion = null; state.momentMatch = null; state.descriptionEntered = false; render(); }));
  document.getElementById('trial-sound-level')?.addEventListener('change', event => { state.soundLevel = event.target.value; stopSound(); render(); });
  document.getElementById('suggest-button')?.addEventListener('click', () => {
    const description = document.getElementById('moment-description')?.value || '';
    state.descriptionEntered = Boolean(description.trim());
    state.momentMatch = interpretMoment(description);
    state.suggestion = buildSuggestion(state.signal, state.momentMatch?.context || undefined, state.momentMatch, state.descriptionEntered);
    render();
  });
  document.getElementById('suggestion-context')?.addEventListener('change', event => { state.suggestion = buildSuggestion(state.signal, event.target.value, state.momentMatch, state.descriptionEntered); render(); });
  document.getElementById('suggestion-variant')?.addEventListener('change', event => { state.suggestion.variant = event.target.value; state.suggestion.variantEdited = true; render(); });
  document.getElementById('use-suggestion-button')?.addEventListener('click', () => { state.context = state.suggestion.context; state.previewSample = false; state.sessionSignal = state.suggestion.checkinTag; state.screen = 'trial'; state.firstVariant = state.suggestion.variant; state.index = 0; state.session = []; state.view = 'patient'; render(); });
  document.getElementById('clear-suggestion-button')?.addEventListener('click', () => { state.suggestion = null; state.momentMatch = null; state.descriptionEntered = false; render(); });
  document.getElementById('download-summary-button')?.addEventListener('click', downloadCareSummary);
  document.querySelectorAll('[data-context]').forEach(button => button.addEventListener('click', () => { state.context = button.dataset.context; render(); }));
  document.getElementById('personal-guide-button')?.addEventListener('click', () => { state.screen = 'guide'; state.previewSample = false; render(); });
  document.getElementById('guide-back-button')?.addEventListener('click', () => { state.screen = 'start'; state.context = null; render(); });
  document.querySelectorAll('[data-guide-try]').forEach(button => button.addEventListener('click', () => {
    state.context = button.dataset.guideTry; state.previewSample = false; state.firstVariant = null; state.screen = 'trial'; state.index = 0; state.session = []; render();
  }));
  document.querySelectorAll('[data-guide-edit]').forEach(button => button.addEventListener('click', () => {
    state.context = button.dataset.guideEdit; state.previewSample = false; state.screen = 'start'; render();
  }));
  document.getElementById('support-option')?.addEventListener('input', event => {
    supportOptions[state.context] = event.target.value.slice(0, 160);
    saveSupportOptions();
  });
  document.getElementById('begin-button')?.addEventListener('click', () => { state.previewSample = false; state.sessionSignal = null; state.firstVariant = null; state.screen = 'trial'; state.index = 0; state.session = []; render(); });
  document.getElementById('sample-journey-button')?.addEventListener('click', () => { state.previewSample = true; state.context = 'wind-down'; state.screen = 'recipe'; render(); });
  document.getElementById('skip-button')?.addEventListener('click', () => { state.screen = 'recipe'; state.context ||= contexts[0].id; render(); });
  document.getElementById('play-button')?.addEventListener('click', toggleSound);
  document.querySelectorAll('[data-feedback]').forEach(button => button.addEventListener('click', () => recordResponse(button.dataset.feedback)));
  document.getElementById('skip-trial')?.addEventListener('click', () => recordResponse(null));
  document.getElementById('again-button')?.addEventListener('click', () => { state.previewSample = false; state.firstVariant = null; state.screen = 'trial'; state.index = 0; state.session = []; render(); });
  document.getElementById('edit-button')?.addEventListener('click', () => { state.previewSample = false; state.suggestion = null; state.sessionSignal = null; state.screen = 'start'; state.context = null; render(); });
  document.getElementById('new-session-button')?.addEventListener('click', () => { state.previewSample = false; state.suggestion = null; state.sessionSignal = null; state.screen = 'start'; render(); });
}
function recordResponse(response) {
  stopSound();
  const variant = sessionVariants()[state.index];
  const entry = { id: crypto.randomUUID?.() || String(Date.now()), at: new Date().toISOString(), context: state.context, variant: variant.id, response, checkin: state.sessionSignal, soundLevel: state.soundLevel, skipped: response === null };
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
  const sound = sessionVariants()[state.index].kind;
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
  const gain = track(ctx.createGain()); gain.gain.value = .17 * (state.soundLevel === 'soft' ? .42 : state.soundLevel === 'fuller' ? 1 : .68);
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
    const scale = state.soundLevel === 'soft' ? .42 : state.soundLevel === 'fuller' ? 1 : .68;
    gain.gain.setValueAtTime(.002 * scale, now);
    gain.gain.linearRampToValueAtTime(.055 * scale, now + .18 + Math.random()*.18);
    gain.gain.linearRampToValueAtTime(.002 * scale, now + .8 + Math.random()*.5);
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

