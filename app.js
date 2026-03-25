import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/*
  ============================================================
  FIELD JOURNAL APP
  Quick search markers for future edits:

  [CONFIG_CHECK]
  [UI_MAP]
  [STATE]
  [UTILS]
  [AUTH]
  [JOURNAL_CREATE]
  [JOURNAL_JOIN]
  [ENTRY_SAVE]
  [ENTRY_RENDER]
  [REALTIME]
  [APP_BOOT]
  ============================================================
*/

// [UI_MAP]
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
  recordedBy: document.getElementById('recordedBy'), // currently not persisted in schema
  notes: document.getElementById('notes'),
  entryMessage: document.getElementById('entryMessage'),
  entriesList: document.getElementById('entriesList')
};

if (ui.entryDate) {
  ui.entryDate.value = new Date().toISOString().slice(0, 10);
}

// [CONFIG_CHECK]
if (
  SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
  SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY'
) {
  setStatus(
    ui.authMessage,
    'Add your Supabase URL and anon key in config.js before using the app.',
    true
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// [STATE]
let currentUser = null;
let currentJournal = null;
let channel = null;

// [UTILS]
function setStatus(el, message = '', isError = false) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', Boolean(message && isError));
  el.classList.toggle('success', Boolean(message && !isError));
}

function resetStatuses() {
  [ui.authMessage, ui.journalMessage, ui.entryMessage].forEach((el) =>
    setStatus(el, '')
  );
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function showSection(section) {
  ui.authCard?.classList.add('hidden');
  ui.journalCard?.classList.add('hidden');
  ui.appSection?.classList.add('hidden');
  ui.logoutBtn?.classList.add('hidden');

  if (section === 'auth') {
    ui.authCard?.classList.remove('hidden');
  }

  if (section === 'journal') {
    ui.journalCard?.classList.remove('hidden');
    ui.logoutBtn?.classList.remove('hidden');
  }

  if (section === 'app') {
    ui.appSection?.classList.remove('hidden');
    ui.logoutBtn?.classList.remove('hidden');
  }
}

function toNumber(value) {
  return value === '' || value === null || value === undefined
    ? null
    : Number(value);
}

function toInteger(value) {
  return value === '' || value === null || value === undefined
    ? null
    : parseInt(value, 10);
}

function metric(value, suffix = '') {
  return value === null || value === undefined || value === ''
    ? '—'
    : `${value}${suffix}`;
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

// [AUTH]
async function getCurrentSessionUser() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.user ?? null;
}

async function signUp() {
  resetStatuses();

  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    setStatus(ui.authMessage, error.message, true);
    return;
  }

  setStatus(
    ui.authMessage,
    'Account created. Check your email if confirmation is enabled, then sign in.'
  );
}

async function signIn() {
  resetStatuses();

  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(ui.authMessage, error.message, true);
    return;
  }

  await refreshApp();
}

async function sendMagicLink() {
  resetStatuses();

  const email = ui.emailInput.value.trim();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    setStatus(ui.authMessage, error.message, true);
    return;
  }

  setStatus(ui.authMessage, 'Magic link sent.');
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  currentJournal = null;

  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }

  renderEntries([]);
  showSection('auth');
}

// [JOURNAL_LOOKUP]
async function fetchCurrentJournal() {
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from('journal_members')
    .select('journal_id, journals(id, name, invite_code, created_by)')
    .eq('user_id', currentUser.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.journals ?? null;
}

// [JOURNAL_CREATE]
async function createJournal() {
  resetStatuses();

  if (!currentUser) {
    setStatus(ui.journalMessage, 'You need to be signed in first.', true);
    return;
  }

  const name = ui.newJournalName.value.trim() || 'Field Journal';
  const code = inviteCode();

  const { data: journal, error: journalError } = await supabase
    .from('journals')
    .insert({
      name,
      invite_code: code,
      created_by: currentUser.id
    })
    .select()
    .single();

  if (journalError) {
    setStatus(ui.journalMessage, journalError.message, true);
    return;
  }

  const { error: memberError } = await supabase
    .from('journal_members')
    .insert({
      journal_id: journal.id,
      user_id: currentUser.id
    });

  if (memberError) {
    setStatus(ui.journalMessage, memberError.message, true);
    return;
  }

  currentJournal = journal;
  await bootJournalView();
  setStatus(
    ui.journalMessage,
    'Journal created. Share the invite code with the other device.'
  );
}

// [JOURNAL_JOIN]
async function joinJournal() {
  resetStatuses();

  if (!currentUser) {
    setStatus(ui.journalMessage, 'You need to be signed in first.', true);
    return;
  }

  const code = ui.joinCodeInput.value.trim().toUpperCase();

  if (!code) {
    setStatus(ui.journalMessage, 'Enter an invite code first.', true);
    return;
  }

  const { data: journal, error } = await supabase.rpc('join_journal_by_code', {
    code
  });

  if (error || !journal) {
    setStatus(
      ui.journalMessage,
      error?.message || 'Invite code not found.',
      true
    );
    return;
  }

  currentJournal = journal;
  await bootJournalView();
  setStatus(ui.journalMessage, 'Joined the journal.');
}

// [ENTRY_SAVE]
async function saveEntry(event) {
  event.preventDefault();
  resetStatuses();

  if (!currentJournal || !currentUser) {
    setStatus(ui.entryMessage, 'No journal is connected yet.', true);
    return;
  }

  const recordedByValue = ui.recordedBy?.value?.trim() || null;
  const noteText = ui.notes.value.trim() || null;

  // Since the updated schema does not include recorded_by,
  // we gently append it into notes if the user entered something there.
  const combinedNotes =
    recordedByValue && noteText
      ? `[Recorded by: ${recordedByValue}]\n\n${noteText}`
      : recordedByValue && !noteText
        ? `[Recorded by: ${recordedByValue}]`
        : noteText;

  const payload = {
    journal_id: currentJournal.id,
    created_by: currentUser.id,
    entry_date: ui.entryDate.value,
    weight: toNumber(ui.weight.value),
    hips: toNumber(ui.hips.value),
    tummy: toNumber(ui.tummy.value),
    under_bust: toNumber(ui.underBust.value),
    tummy_sucking_count: toInteger(ui.tummySuckingCount.value),
    tummy_sucking_source: ui.suckingType.value || null,
    water_intake:
      ui.waterIntake.value === '' ? null : String(ui.waterIntake.value).trim(),
    notes: combinedNotes
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

// [ENTRY_LOAD]
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

// [ENTRY_RENDER]
function renderEntries(entries) {
  if (!ui.entriesList) return;

  if (!entries.length) {
    ui.entriesList.innerHTML = `
      <div class="entry-card">
        <p class="muted">No entries yet. Your logbook is still a quiet little forest.</p>
      </div>
    `;
    return;
  }

  ui.entriesList.innerHTML = entries
    .map((entry) => {
      const entryDate = new Date(
        `${entry.entry_date}T12:00:00`
      ).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const createdAt = new Date(entry.created_at).toLocaleString();

      return `
        <article class="entry-card">
          <div class="entry-top">
            <div>
              <h3>${entryDate}</h3>
              <p class="muted">Added ${createdAt}</p>
            </div>
            <div class="field-stamp">${entry.tummy_sucking_source || 'unspecified'}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box"><span>Weight</span><strong>${metric(entry.weight)}</strong></div>
            <div class="meta-box"><span>Hips</span><strong>${metric(entry.hips, ' in')}</strong></div>
            <div class="meta-box"><span>Tummy</span><strong>${metric(entry.tummy, ' in')}</strong></div>
            <div class="meta-box"><span>Under bust</span><strong>${metric(entry.under_bust, ' in')}</strong></div>
            <div class="meta-box"><span>Sucking-in count</span><strong>${metric(entry.tummy_sucking_count)}</strong></div>
            <div class="meta-box"><span>Water intake</span><strong>${metric(entry.water_intake)}</strong></div>
          </div>

          <div class="notes">
            ${entry.notes ? escapeHtml(entry.notes) : '<span class="muted">No notes for this entry.</span>'}
          </div>
        </article>
      `;
    })
    .join('');
}

// [REALTIME]
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
      {
        event: '*',
        schema: 'public',
        table: 'entries',
        filter: `journal_id=eq.${currentJournal.id}`
      },
      async () => {
        await loadEntries();
      }
    )
    .subscribe();
}

// [APP_BOOT]
async function bootJournalView() {
  if (!currentJournal) return;

  ui.journalTitle.textContent = currentJournal.name;
  ui.journalCode.textContent = currentJournal.invite_code;

  showSection('app');
  await loadEntries();
  subscribeToEntries();
}

async function refreshApp() {
  try {
    currentUser = await getCurrentSessionUser();
  } catch (error) {
    setStatus(ui.authMessage, error.message, true);
    showSection('auth');
    return;
  }

  if (!currentUser) {
    currentJournal = null;

    if (channel) {
      await supabase.removeChannel(channel);
      channel = null;
    }

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

// [EVENT_BINDING]
ui.signUpBtn?.addEventListener('click', signUp);
ui.signInBtn?.addEventListener('click', signIn);
ui.magicLinkBtn?.addEventListener('click', sendMagicLink);
ui.logoutBtn?.addEventListener('click', signOut);
ui.createJournalBtn?.addEventListener('click', createJournal);
ui.joinJournalBtn?.addEventListener('click', joinJournal);
ui.entryForm?.addEventListener('submit', saveEntry);
ui.refreshBtn?.addEventListener('click', loadEntries);

supabase.auth.onAuthStateChange(async () => {
  await refreshApp();
});

await refreshApp();
