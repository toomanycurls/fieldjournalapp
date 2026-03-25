import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const ui = {
  authCard: document.getElementById('authCard'),
  journalCard: document.getElementById('journalCard'),
  appSection: document.getElementById('appSection'),
  logoutBtn: document.getElementById('logoutBtn'),
  emailInput: document.getElementById('emailInput'),
  passwordInput: document.getElementById('passwordInput'),
  signInBtn: document.getElementById('signInBtn'),
  signUpBtn: document.getElementById('signUpBtn'),
  magicLinkBtn: document.getElementById('magicLinkBtn'),
  authMessage: document.getElementById('authMessage'),
  newJournalName: document.getElementById('newJournalName'),
  createJournalBtn: document.getElementById('createJournalBtn'),
  joinCodeInput: document.getElementById('joinCodeInput'),
  joinJournalBtn: document.getElementById('joinJournalBtn'),
  journalMessage: document.getElementById('journalMessage'),
  journalTitle: document.getElementById('journalTitle'),
  journalCode: document.getElementById('journalCode'),
  refreshBtn: document.getElementById('refreshBtn'),
  entryForm: document.getElementById('entryForm'),
  entryDate: document.getElementById('entryDate'),
  weight: document.getElementById('weight'),
  hips: document.getElementById('hips'),
  tummy: document.getElementById('tummy'),
  underBust: document.getElementById('underBust'),
  tummySuckingCount: document.getElementById('tummySuckingCount'),
  suckingType: document.getElementById('suckingType'),
  waterIntake: document.getElementById('waterIntake'),
  recordedBy: document.getElementById('recordedBy'),
  notes: document.getElementById('notes'),
  entryMessage: document.getElementById('entryMessage'),
  entriesList: document.getElementById('entriesList')
};

ui.entryDate.value = new Date().toISOString().slice(0, 10);

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  setStatus(ui.authMessage, 'Add your Supabase URL and anon key in config.js before using the app.', true);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentJournal = null;
let channel = null;

function setStatus(el, message = '', isError = false) {
  el.textContent = message;
  el.classList.toggle('error', Boolean(message && isError));
  el.classList.toggle('success', Boolean(message && !isError));
}

function resetStatuses() {
  [ui.authMessage, ui.journalMessage, ui.entryMessage].forEach(el => setStatus(el, ''));
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function showSection(section) {
  ui.authCard.classList.add('hidden');
  ui.journalCard.classList.add('hidden');
  ui.appSection.classList.add('hidden');
  ui.logoutBtn.classList.add('hidden');

  if (section === 'auth') {
    ui.authCard.classList.remove('hidden');
  }
  if (section === 'journal') {
    ui.journalCard.classList.remove('hidden');
    ui.logoutBtn.classList.remove('hidden');
  }
  if (section === 'app') {
    ui.appSection.classList.remove('hidden');
    ui.logoutBtn.classList.remove('hidden');
  }
}

async function fetchCurrentJournal() {
  const { data, error } = await supabase
    .from('journal_members')
    .select('journal_id, journals(id, name, invite_code)')
    .eq('user_id', currentUser.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.journals ?? null;
}

async function loadEntries() {
  if (!currentJournal) return;

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('journal_id', currentJournal.id)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    setStatus(ui.entryMessage, error.message, true);
    return;
  }

  renderEntries(data ?? []);
}

function metric(value, suffix = '') {
  return value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`;
}

function renderEntries(entries) {
  if (!entries.length) {
    ui.entriesList.innerHTML = '<div class="entry-card"><p class="muted">No entries yet. Your logbook is still a quiet little forest.</p></div>';
    return;
  }

  ui.entriesList.innerHTML = entries.map(entry => `
    <article class="entry-card">
      <div class="entry-top">
        <div>
          <h3>${new Date(entry.entry_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          <p class="muted">Recorded by ${entry.recorded_by || 'Unknown'} · Added ${new Date(entry.created_at).toLocaleString()}</p>
        </div>
        <div class="field-stamp">${entry.sucking_type || 'unspecified'}</div>
      </div>
      <div class="meta-grid">
        <div class="meta-box"><span>Weight</span><strong>${metric(entry.weight, '')}</strong></div>
        <div class="meta-box"><span>Hips</span><strong>${metric(entry.hips, ' in')}</strong></div>
        <div class="meta-box"><span>Tummy</span><strong>${metric(entry.tummy, ' in')}</strong></div>
        <div class="meta-box"><span>Under bust</span><strong>${metric(entry.under_bust, ' in')}</strong></div>
        <div class="meta-box"><span>Sucking-in count</span><strong>${metric(entry.tummy_sucking_count, '')}</strong></div>
        <div class="meta-box"><span>Water intake</span><strong>${metric(entry.water_intake, '')}</strong></div>
      </div>
      <div class="notes">${entry.notes ? escapeHtml(entry.notes) : '<span class="muted">No notes for this entry.</span>'}</div>
    </article>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br/>');
}

async function createJournal() {
  resetStatuses();
  const name = ui.newJournalName.value.trim() || 'Field Journal';
  const code = inviteCode();

  const { data: journal, error } = await supabase
  .rpc('join_journal_by_code', { code });

  if (journalError) {
    setStatus(ui.journalMessage, journalError.message, true);
    return;
  }

  const { error: memberError } = await supabase
    .from('journal_members')
    .insert({ journal_id: journal.id, user_id: currentUser.id, role: 'owner' });

  if (memberError) {
    setStatus(ui.journalMessage, memberError.message, true);
    return;
  }

  currentJournal = journal;
  await bootJournalView();
  setStatus(ui.journalMessage, 'Journal created. Share the invite code with the other device.');
}

async function joinJournal() {
  resetStatuses();
  const code = ui.joinCodeInput.value.trim().toUpperCase();
  if (!code) {
    setStatus(ui.journalMessage, 'Enter an invite code first.', true);
    return;
  }

  const { data: journal, error } = await supabase
    .from('journals')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (error || !journal) {
    setStatus(ui.journalMessage, 'Invite code not found.', true);
    return;
  }

  const { error: memberError } = await supabase
    .from('journal_members')
    .upsert({ journal_id: journal.id, user_id: currentUser.id, role: 'member' }, { onConflict: 'journal_id,user_id' });

  if (memberError) {
    setStatus(ui.journalMessage, memberError.message, true);
    return;
  }

  currentJournal = journal;
  await bootJournalView();
  setStatus(ui.journalMessage, 'Joined the journal.');
}

async function saveEntry(event) {
  event.preventDefault();
  resetStatuses();

  const payload = {
    journal_id: currentJournal.id,
    created_by: currentUser.id,
    entry_date: ui.entryDate.value,
    weight: toNumber(ui.weight.value),
    hips: toNumber(ui.hips.value),
    tummy: toNumber(ui.tummy.value),
    under_bust: toNumber(ui.underBust.value),
    tummy_sucking_count: toInteger(ui.tummySuckingCount.value),
    sucking_type: ui.suckingType.value || null,
    water_intake: toNumber(ui.waterIntake.value),
    notes: ui.notes.value.trim() || null,
    recorded_by: ui.recordedBy.value.trim() || null
  };

  const { error } = await supabase.from('entries').insert(payload);

  if (error) {
    setStatus(ui.entryMessage, error.message, true);
    return;
  }

  ui.entryForm.reset();
  ui.entryDate.value = new Date().toISOString().slice(0, 10);
  setStatus(ui.entryMessage, 'Entry saved.');
  await loadEntries();
}

function toNumber(value) {
  return value === '' ? null : Number(value);
}

function toInteger(value) {
  return value === '' ? null : parseInt(value, 10);
}

async function bootJournalView() {
  ui.journalTitle.textContent = currentJournal.name;
  ui.journalCode.textContent = currentJournal.invite_code;
  showSection('app');
  await loadEntries();
  subscribeToEntries();
}

function subscribeToEntries() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  if (!currentJournal) return;

  channel = supabase
    .channel(`journal-${currentJournal.id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'entries', filter: `journal_id=eq.${currentJournal.id}` },
      async () => {
        await loadEntries();
      }
    )
    .subscribe();
}

async function refreshApp() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;

  if (!currentUser) {
    currentJournal = null;
    renderEntries([]);
    showSection('auth');
    return;
  }

  try {
    currentJournal = await fetchCurrentJournal();
  } catch (error) {
    setStatus(ui.authMessage, error.message, true);
    showSection('auth');
    return;
  }

  if (!currentJournal) {
    showSection('journal');
    return;
  }

  await bootJournalView();
}

ui.signUpBtn.addEventListener('click', async () => {
  resetStatuses();
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return setStatus(ui.authMessage, error.message, true);
  setStatus(ui.authMessage, 'Account created. Check your email if confirmation is enabled, then sign in.');
});

ui.signInBtn.addEventListener('click', async () => {
  resetStatuses();
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setStatus(ui.authMessage, error.message, true);
  await refreshApp();
});

ui.magicLinkBtn.addEventListener('click', async () => {
  resetStatuses();
  const email = ui.emailInput.value.trim();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if (error) return setStatus(ui.authMessage, error.message, true);
  setStatus(ui.authMessage, 'Magic link sent.');
});

ui.logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  await refreshApp();
});

ui.createJournalBtn.addEventListener('click', createJournal);
ui.joinJournalBtn.addEventListener('click', joinJournal);
ui.entryForm.addEventListener('submit', saveEntry);
ui.refreshBtn.addEventListener('click', loadEntries);

supabase.auth.onAuthStateChange(async () => {
  await refreshApp();
});

await refreshApp();
