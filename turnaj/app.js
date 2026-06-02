import {
  CATEGORY_LABELS,
  PROVIDER_LABELS,
  STATUS_LABELS,
  convertToTournamentRating,
  fetchChessComRating,
  fetchLichessRating
} from './ratings.js';
import {
  createRoundRobinSchedule,
  generateSwissPairings,
  getSwissRoundLimit,
  getStandings
} from './tournament.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form = document.getElementById('registration-form');
const nameInput = document.getElementById('playerName');
const handleInput = document.getElementById('accountHandle');
const providerInputs = Array.from(document.querySelectorAll('input[name="provider"]'));
const statusEl = document.getElementById('formStatus');
const accountHelp = document.getElementById('accountHelp');
const playersHeader = document.getElementById('playersHeader');
const playersBody = document.getElementById('playersBody');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('btnClear');
const submitBtn = document.getElementById('submitBtn');

const menuToggle = document.getElementById('menuToggle');
const menuClose = document.getElementById('menuClose');
const menuDrawer = document.getElementById('menuDrawer');
const menuBackdrop = document.getElementById('menuBackdrop');
const refLoginForm = document.getElementById('refLoginForm');
const refPassword = document.getElementById('refPassword');
const refStatus = document.getElementById('refStatus');
const refLogged = document.getElementById('refLogged');
const refLogout = document.getElementById('refLogout');

const tournamentHint = document.getElementById('tournamentHint');
const tournamentRoundLabel = document.getElementById('tournamentRoundLabel');
const tournamentStatus = document.getElementById('tournamentStatus');
const tournamentSystem = document.getElementById('tournamentSystem');
const tournamentCreateBtn = document.getElementById('btnCreateTournament');
const tournamentCancelBtn = document.getElementById('btnCancelTournament');
const tournamentCancelRoundBtn = document.getElementById('btnCancelRound');
const tournamentExportRoundBtn = document.getElementById('btnExportRound');
const tournamentExportTournamentBtn = document.getElementById('btnExportTournament');

const allowRematch = document.getElementById('allowRematch');
const allowRematchWrap = document.getElementById('allowRematchWrap');
const roundSelect = document.getElementById('roundSelect');
const roundSelectWrap = document.getElementById('roundSelectWrap');
const pairingsBody = document.getElementById('pairingsBody');
const pairingsEmpty = document.getElementById('pairingsEmpty');
const tournamentAdminSection = document.getElementById('turnaj-admin');
const publicRoundLabel = document.getElementById('publicRoundLabel');
const publicPairingsBody = document.getElementById('publicPairingsBody');
const publicPairingsEmpty = document.getElementById('publicPairingsEmpty');
const publicPairingsWrap = document.getElementById('publicPairingsWrap');
const publicPlayersWrap = document.getElementById('publicPlayersWrap');
const publicResultsSelect = document.getElementById('publicResultsSelect');
const publicResultsSelectWrap = document.getElementById('publicResultsSelectWrap');
const publicResultsBody = document.getElementById('publicResultsBody');
const publicResultsEmpty = document.getElementById('publicResultsEmpty');
const publicResultsLabel = document.getElementById('publicResultsLabel');
const tabStandings = document.getElementById('tabStandings');
const tabPairings = document.getElementById('tabPairings');
const tabResults = document.getElementById('tabResults');
const tabAdmin = document.getElementById('tabAdmin');
const panelPairings = document.getElementById('panelPairings');
const panelStandings = document.getElementById('panelStandings');
const panelResults = document.getElementById('panelResults');
const mainView = document.getElementById('mainView');
const registrationView = document.getElementById('registrationView');
const registrationSuccess = document.getElementById('registrationSuccess');
const standingsBody = document.getElementById('standingsBody');
const standingsEmpty = document.getElementById('standingsEmpty');
const playerDetailTitle = document.getElementById('playerDetailTitle');
const playerDetailBody = document.getElementById('playerDetailBody');
const playerDetailEmpty = document.getElementById('playerDetailEmpty');
const playerDetailClear = document.getElementById('playerDetailClear');

// Tournament selector & management
const tournamentSelectEl = document.getElementById('tournamentSelect');
const tournamentMgmtList = document.getElementById('tournamentMgmtList');
const addTournamentForm = document.getElementById('addTournamentForm');
const newTournamentNameInput = document.getElementById('newTournamentName');
const tournamentMgmtStatus = document.getElementById('tournamentMgmtStatus');
const tournamentPageTitle = document.getElementById('tournamentPageTitle');
const registrationTitle = document.getElementById('registrationTitle');
const pageFooter = document.getElementById('pageFooter');

// ── Constants ─────────────────────────────────────────────────────────────────
const REFEREE_KEY = 'sachyuh-referee';
const REFEREE_PASSWORD = 'g0';
const ACTIVE_TOURNAMENT_KEY = 'sachyuh-active-tournament';
const SHARED_STATE_API = window.location.protocol === 'file:' ? '' : (window.SACHYUH_SHARED_STATE_API || '/api/shared-state');
const TOURNAMENTS_API = window.location.protocol === 'file:' ? '' : '/api/tournaments';
const SHARED_SYNC_INTERVAL_MS = 5000;
const SHARED_SAVE_DEBOUNCE_MS = 500;

const DEFAULT_TOURNAMENTS = [
  { id: 'koruna-26', name: 'Koruna 26' },
  { id: 'pucalik-26', name: 'U Pučalíka 26' },
  { id: 'kovariku-26', name: 'U Kovaříků 26' },
  { id: 'osel-26', name: 'Zašívárna U Osla 26' },
];

const RESULT_OPTIONS = [
  { value: '', label: '-' },
  { value: '1-0', label: '1 : 0' },
  { value: '0.5-0.5', label: '0.5 : 0.5' },
  { value: '0-1', label: '0 : 1' }
];

const RESULT_LABELS = {
  '1-0': '1 : 0',
  '0-1': '0 : 1',
  '0.5-0.5': '0.5 : 0.5',
  bye: 'volno'
};

const providerHelp = {
  'chess.com': {
    placeholder: 'např. Magnus64',
    help: 'Načteme nejvyšší rating z chess.com (blitz, rapid, daily).'
  },
  lichess: {
    placeholder: 'např. Magnus64',
    help: 'Načteme nejvyšší rating z lichess.org (blitz, rapid, korespondence).'
  },
  none: {
    placeholder: '',
    help: 'Nemáte účet? Rating bude 0.'
  }
};

const statusClassMap = {
  ok: 'ok',
  no_rating: 'no-rating',
  not_found: 'not-found',
  no_account: 'no-account',
  error: 'error'
};

// ── Per-tournament storage key helpers ───────────────────────────────────────
function getStorageKey() { return `sachyuh-reg-${activeTournamentId}-v1`; }
function getTournamentKey() { return `sachyuh-tour-${activeTournamentId}-v1`; }
function getLocalUpdatedKey() { return `sachyuh-local-at-${activeTournamentId}`; }
function getSharedUpdatedKey() { return `sachyuh-shared-at-${activeTournamentId}`; }

// ── State ─────────────────────────────────────────────────────────────────────
let activeTournamentId = null;
let tournamentList = [];
let localUpdatedAt = 0;
let players = [];
let tournament = null;
let isReferee = false;
let selectedPlayerId = null;
let viewRoundNumber = 0;
let publicActiveTab = 'pairings';
let publicResultsRound = 0;
let registrationSuccessTimer = null;
let suppressSharedSave = false;
let pendingSharedSave = false;
let queuedSharedSave = false;
let sharedSaveTimer = null;
let sharedSyncReady = false;
let lastSharedUpdateAt = 0;
let sharedSyncIntervalId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  isReferee = loadReferee();

  tournamentList = await fetchTournamentList();

  const savedId = window.localStorage.getItem(ACTIVE_TOURNAMENT_KEY);
  if (savedId && tournamentList.some((t) => t.id === savedId)) {
    activeTournamentId = savedId;
  } else if (tournamentList.length > 0) {
    activeTournamentId = tournamentList[0].id;
    window.localStorage.setItem(ACTIVE_TOURNAMENT_KEY, activeTournamentId);
  }

  if (activeTournamentId) {
    localUpdatedAt = loadLocalUpdatedAt();
    lastSharedUpdateAt = loadSharedUpdatedAt();
    players = loadPlayers();
    tournament = loadTournament();
    if (!localUpdatedAt && (players.length || tournament)) {
      localUpdatedAt = Date.now();
      saveLocalUpdatedAt(localUpdatedAt);
    }
    viewRoundNumber = tournament?.round || 0;
  }

  renderTournamentSelector();
  renderPlayers();
  renderTournament();
  updateProviderUI(getSelectedProvider());
  updateRefereeUI();
  updatePageTitles();
  updatePageView();
  window.addEventListener('hashchange', updatePageView);

  if (activeTournamentId) {
    initSharedSync();
  }
}

init();

// ── Tournament list ───────────────────────────────────────────────────────────
async function fetchTournamentList() {
  if (!TOURNAMENTS_API) {
    return DEFAULT_TOURNAMENTS;
  }
  try {
    const res = await fetch(TOURNAMENTS_API, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      return DEFAULT_TOURNAMENTS;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return DEFAULT_TOURNAMENTS;
  } catch {
    return DEFAULT_TOURNAMENTS;
  }
}

function renderTournamentSelector() {
  if (!tournamentSelectEl) {
    return;
  }
  tournamentSelectEl.textContent = '';
  tournamentList.forEach((t) => {
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = t.name;
    if (t.id === activeTournamentId) {
      option.selected = true;
    }
    tournamentSelectEl.appendChild(option);
  });
}

tournamentSelectEl?.addEventListener('change', async () => {
  const newId = tournamentSelectEl.value;
  if (newId && newId !== activeTournamentId) {
    await switchTournament(newId);
  }
});

async function switchTournament(newId) {
  if (newId === activeTournamentId) {
    return;
  }

  if (pendingSharedSave && SHARED_STATE_API && sharedSyncReady) {
    await pushSharedState();
  }

  if (sharedSyncIntervalId) {
    window.clearInterval(sharedSyncIntervalId);
    sharedSyncIntervalId = null;
  }

  activeTournamentId = newId;
  window.localStorage.setItem(ACTIVE_TOURNAMENT_KEY, newId);

  sharedSyncReady = false;
  pendingSharedSave = false;
  queuedSharedSave = false;
  if (sharedSaveTimer) {
    window.clearTimeout(sharedSaveTimer);
    sharedSaveTimer = null;
  }

  localUpdatedAt = loadLocalUpdatedAt();
  lastSharedUpdateAt = loadSharedUpdatedAt();
  players = loadPlayers();
  tournament = loadTournament();
  if (!localUpdatedAt && (players.length || tournament)) {
    localUpdatedAt = Date.now();
    saveLocalUpdatedAt(localUpdatedAt);
  }
  viewRoundNumber = tournament?.round || 0;
  selectedPlayerId = null;
  publicActiveTab = 'pairings';
  publicResultsRound = 0;

  renderTournamentSelector();
  renderPlayers();
  renderTournament();
  updatePageTitles();

  if (activeTournamentId) {
    initSharedSync();
  }
}

function updatePageTitles() {
  const t = tournamentList.find((x) => x.id === activeTournamentId);
  const name = t ? t.name : 'Šachové turnaje';
  if (tournamentPageTitle) {
    tournamentPageTitle.textContent = name;
  }
  if (registrationTitle) {
    registrationTitle.textContent = `Registrace – ${name}`;
  }
  if (pageFooter) {
    pageFooter.textContent = name;
  }
  document.title = `${name} – sachyuh.cz`;
}

// ── Tournament management (admin) ─────────────────────────────────────────────
function renderTournamentMgmt() {
  if (!tournamentMgmtList) {
    return;
  }
  tournamentMgmtList.textContent = '';

  if (!isReferee) {
    return;
  }

  tournamentList.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'tournament-mgmt-row';

    const nameInputEl = document.createElement('input');
    nameInputEl.type = 'text';
    nameInputEl.className = 'tmgmt-name-input';
    nameInputEl.value = t.name;
    nameInputEl.maxLength = 80;
    row.appendChild(nameInputEl);

    if (t.id === activeTournamentId) {
      const activeBadge = document.createElement('span');
      activeBadge.className = 'tmgmt-active';
      activeBadge.textContent = 'aktivní';
      row.appendChild(activeBadge);
    }

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'btn btn-small';
    renameBtn.textContent = 'Přejmenovat';
    renameBtn.addEventListener('click', async () => {
      const newName = nameInputEl.value.trim();
      if (!newName) {
        setTournamentMgmtStatus('Název nesmí být prázdný.');
        return;
      }
      await renameTournament(t.id, newName);
    });
    row.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.textContent = 'Smazat';
    deleteBtn.disabled = tournamentList.length <= 1;
    deleteBtn.title = tournamentList.length <= 1 ? 'Nelze smazat jediný turnaj.' : '';
    deleteBtn.addEventListener('click', async () => {
      if (tournamentList.length <= 1) {
        setTournamentMgmtStatus('Nelze smazat jediný turnaj.');
        return;
      }
      const confirmed = window.confirm(`Opravdu smazat turnaj „${t.name}"? Smažou se i všechna data.`);
      if (!confirmed) {
        return;
      }
      await deleteTournament(t.id);
    });
    row.appendChild(deleteBtn);

    tournamentMgmtList.appendChild(row);
  });
}

async function renameTournament(id, newName) {
  if (!TOURNAMENTS_API) {
    tournamentList = tournamentList.map((t) => t.id === id ? { ...t, name: newName } : t);
    renderTournamentSelector();
    renderTournamentMgmt();
    updatePageTitles();
    setTournamentMgmtStatus('Přejmenováno (pouze lokálně – offline režim).');
    return;
  }
  try {
    const res = await fetch(`${TOURNAMENTS_API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tournamentList = tournamentList.map((t) => t.id === id ? { ...t, name: newName } : t);
    renderTournamentSelector();
    renderTournamentMgmt();
    updatePageTitles();
    setTournamentMgmtStatus('Turnaj byl přejmenován.');
  } catch {
    setTournamentMgmtStatus('Chyba při přejmenování turnaje.');
  }
}

async function deleteTournament(id) {
  if (!TOURNAMENTS_API) {
    setTournamentMgmtStatus('Smazání není dostupné v offline režimu.');
    return;
  }
  try {
    const res = await fetch(`${TOURNAMENTS_API}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tournamentList = tournamentList.filter((t) => t.id !== id);
    if (id === activeTournamentId && tournamentList.length > 0) {
      await switchTournament(tournamentList[0].id);
    } else {
      renderTournamentSelector();
      renderTournamentMgmt();
    }
    setTournamentMgmtStatus('Turnaj byl smazán.');
  } catch {
    setTournamentMgmtStatus('Chyba při mazání turnaje.');
  }
}

async function createNewTournament(name) {
  if (!TOURNAMENTS_API) {
    const id = `t-${Date.now()}`;
    tournamentList.push({ id, name });
    renderTournamentSelector();
    renderTournamentMgmt();
    setTournamentMgmtStatus('Turnaj přidán (pouze lokálně – offline režim).');
    await switchTournament(id);
    return;
  }
  try {
    const res = await fetch(TOURNAMENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const newId = data.id;
    tournamentList.push({ id: newId, name });
    setTournamentMgmtStatus(`Turnaj „${name}" byl přidán.`);
    await switchTournament(newId);
  } catch {
    setTournamentMgmtStatus('Chyba při přidávání turnaje.');
  }
}

function setTournamentMgmtStatus(msg) {
  if (tournamentMgmtStatus) {
    tournamentMgmtStatus.textContent = msg;
  }
}

addTournamentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = newTournamentNameInput?.value.trim();
  if (!name) {
    setTournamentMgmtStatus('Zadejte název turnaje.');
    return;
  }
  if (newTournamentNameInput) {
    newTournamentNameInput.value = '';
  }
  await createNewTournament(name);
});

// ── Event handlers ────────────────────────────────────────────────────────────
providerInputs.forEach((input) => {
  input.addEventListener('change', () => updateProviderUI(getSelectedProvider()));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const provider = getSelectedProvider();
  const username = handleInput.value.trim();

  if (!name) {
    setStatus('Zadejte jméno hráče.');
    nameInput.focus();
    return;
  }

  if (provider !== 'none' && !username) {
    setStatus('Zadejte uživatelské jméno k účtu.');
    handleInput.focus();
    return;
  }

  setLoading(true);

  let result;
  try {
    if (provider === 'chess.com') {
      result = await fetchChessComRating(username);
    } else if (provider === 'lichess') {
      result = await fetchLichessRating(username);
    } else {
      result = { provider: 'none', status: 'no_account', rating: 0, category: null, ratings: {} };
    }
  } catch {
    result = { provider, status: 'error', rating: 0, category: null, ratings: {} };
  }

  const ratingOriginal = Number.isFinite(result.rating) ? result.rating : 0;
  const ratingFinal = convertToTournamentRating({ provider, category: result.category, rating: ratingOriginal });

  const entry = {
    id: createId(),
    name,
    provider,
    username: provider === 'none' ? '' : username,
    ratingOriginal,
    ratingFinal,
    category: result.category,
    status: result.status,
    createdAt: new Date().toISOString()
  };

  players = [entry, ...players];
  savePlayers(players);
  renderPlayers();
  setStatus(buildStatusMessage(entry));
  invalidateTournament('Seznam hráčů se změnil, turnaj byl zrušen.');

  nameInput.value = '';
  if (provider !== 'none') {
    handleInput.value = '';
  }

  setLoading(false);
  window.location.hash = '#turnaj';
  updatePageView();
  showRegistrationSuccess();
});

clearBtn.addEventListener('click', () => {
  if (!players.length) {
    return;
  }
  const confirmed = window.confirm('Opravdu chcete smazat seznam registrovaných hráčů?');
  if (!confirmed) {
    return;
  }
  players = [];
  savePlayers(players);
  renderPlayers();
  setStatus('Seznam byl vymazán.');
  invalidateTournament('Turnaj byl zrušen.');
});

menuToggle.addEventListener('click', () => toggleDrawer(true));
menuClose.addEventListener('click', () => toggleDrawer(false));
menuBackdrop.addEventListener('click', () => toggleDrawer(false));

refLoginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const password = refPassword.value.trim();

  if (password !== REFEREE_PASSWORD) {
    refStatus.textContent = 'Nesprávné heslo.';
    return;
  }

  refPassword.value = '';
  refStatus.textContent = '';
  setReferee(true);
  toggleDrawer(false);
});

refLogout.addEventListener('click', () => {
  setReferee(false);
  refStatus.textContent = '';
});

playerDetailClear.addEventListener('click', () => {
  selectedPlayerId = null;
  renderPlayerDetail();
});

roundSelect.addEventListener('change', () => {
  viewRoundNumber = Number.parseInt(roundSelect.value, 10) || 0;
  renderTournament();
});

tabStandings.addEventListener('click', () => setPublicTab('standings'));
tabPairings.addEventListener('click', () => setPublicTab('pairings'));
tabResults.addEventListener('click', () => setPublicTab('results'));
tabAdmin.addEventListener('click', () => setPublicTab('admin'));

if (publicResultsSelect) {
  publicResultsSelect.addEventListener('change', () => {
    publicResultsRound = Number.parseInt(publicResultsSelect.value, 10) || 0;
    renderPublicView();
  });
}

tournamentCreateBtn.addEventListener('click', () => {
  if (!isReferee) {
    setTournamentStatus('Přihlaste se jako správce pro vytvoření turnaje.');
    return;
  }
  if (players.length < 2) {
    setTournamentStatus('Pro nasazení je potřeba alespoň 2 hráče.');
    return;
  }
  if (!tournament) {
    createTournament();
    return;
  }
  const currentRound = getCurrentRound(tournament);
  if (!currentRound) {
    createNextRound();
    return;
  }
  if (!isRoundComplete(currentRound)) {
    setTournamentStatus('Nejdříve zadejte všechny výsledky tohoto kola.');
    return;
  }
  if (isTournamentFinished(tournament)) {
    setTournamentStatus('Turnaj je dokončen.');
    return;
  }
  createNextRound();
});

tournamentCancelBtn.addEventListener('click', () => {
  if (!isReferee || !tournament) {
    return;
  }
  const confirmed = window.confirm('Opravdu chcete zrušit turnaj?');
  if (!confirmed) {
    return;
  }
  tournament = null;
  viewRoundNumber = 0;
  saveTournament(tournament);
  renderTournament();
  setTournamentStatus('Turnaj byl zrušen.');
});

tournamentCancelRoundBtn.addEventListener('click', () => {
  if (!isReferee) {
    setTournamentStatus('Přihlaste se jako správce pro zrušení kola.');
    return;
  }
  if (!tournament) {
    setTournamentStatus('Turnaj není založen.');
    return;
  }
  if (!tournament.rounds.length) {
    setTournamentStatus('Žádné kolo ke zrušení.');
    return;
  }
  const confirmed = window.confirm('Opravdu chcete zrušit aktuální kolo?');
  if (!confirmed) {
    return;
  }
  if (tournament.system === 'swiss') {
    tournament.rounds.pop();
    if (tournament.rounds.length === 0) {
      tournament.round = 0;
    } else {
      tournament.round = tournament.rounds[tournament.rounds.length - 1].round;
    }
    viewRoundNumber = tournament.round;
    setTournamentStatus('Aktuální kolo bylo zrušeno.');
  } else {
    const currentRound = getCurrentRound(tournament);
    if (currentRound) {
      currentRound.pairings.forEach((pairing) => {
        if (!pairing.byeId) {
          pairing.result = null;
        }
      });
    }
    viewRoundNumber = tournament.round;
    setTournamentStatus('Výsledky aktuálního kola byly vymazány.');
  }
  saveTournament(tournament);
  renderTournament();
});

if (tournamentExportRoundBtn) {
  tournamentExportRoundBtn.addEventListener('click', () => {
    if (!isReferee) {
      setTournamentStatus('Přihlaste se jako správce pro export.');
      return;
    }
    if (!tournament || !tournament.rounds || tournament.rounds.length === 0) {
      setTournamentStatus('Není co exportovat.');
      return;
    }
    const round = getRoundByNumber(viewRoundNumber) || getCurrentRound(tournament);
    if (!round) {
      setTournamentStatus('Vyberte kolo k exportu.');
      return;
    }
    exportRoundPdf(round);
  });
}

if (tournamentExportTournamentBtn) {
  tournamentExportTournamentBtn.addEventListener('click', () => {
    if (!isReferee) {
      setTournamentStatus('Přihlaste se jako správce pro export.');
      return;
    }
    if (!tournament) {
      setTournamentStatus('Turnaj není založen.');
      return;
    }
    exportTournamentPdf();
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleDrawer(false);
  }
});

// ── Render functions ──────────────────────────────────────────────────────────
function getSelectedProvider() {
  return providerInputs.find((input) => input.checked)?.value || 'chess.com';
}

function updateProviderUI(provider) {
  const config = providerHelp[provider] || providerHelp['chess.com'];
  const requiresHandle = provider !== 'none';
  handleInput.disabled = !requiresHandle;
  handleInput.placeholder = config.placeholder;
  accountHelp.textContent = config.help;
  if (!requiresHandle) {
    handleInput.value = '';
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Hledám rating...' : 'Ověřit a registrovat';
}

function setTournamentStatus(message) {
  tournamentStatus.textContent = message;
}

function buildStatusMessage(entry) {
  if (entry.status === 'ok') {
    const category = entry.category ? CATEGORY_LABELS[entry.category] : '';
    const original = entry.ratingOriginal ? ` ${entry.ratingOriginal}${category ? ` (${category})` : ''}` : '';
    return `Rating${original} byl načten. Přepočtený rating: ${entry.ratingFinal}.`;
  }
  if (entry.status === 'no_rating') return 'Účet byl nalezen, ale bez ratingu.';
  if (entry.status === 'not_found') return 'Hráč nebyl nalezen, registrován s ratingem 0.';
  if (entry.status === 'no_account') return 'Hráč byl registrován bez účtu.';
  return 'Nepodařilo se načíst rating. Zkuste to prosím později.';
}

function renderPlayersHeader() {
  playersHeader.textContent = '';
  const labels = isReferee
    ? ['Jméno', 'Rating', 'Původní rating', 'Kategorie', 'Účet', 'Stav', 'Akce']
    : ['Jméno', 'Rating'];
  for (const label of labels) {
    const th = document.createElement('th');
    th.textContent = label;
    playersHeader.appendChild(th);
  }
}

function renderPlayers() {
  renderPlayersHeader();
  playersBody.textContent = '';
  emptyState.hidden = players.length > 0;
  clearBtn.hidden = !isReferee;
  clearBtn.disabled = players.length === 0;

  for (const player of players) {
    const row = document.createElement('tr');
    if (!isReferee) {
      row.appendChild(createCell(player.name));
      row.appendChild(createCell(String(player.ratingFinal ?? 0)));
      playersBody.appendChild(row);
      continue;
    }

    const nameInputEl = document.createElement('input');
    nameInputEl.type = 'text';
    nameInputEl.className = 'table-input';
    nameInputEl.value = player.name;

    const nameCell = document.createElement('td');
    nameCell.appendChild(nameInputEl);
    row.appendChild(nameCell);

    const ratingInputEl = document.createElement('input');
    ratingInputEl.type = 'number';
    ratingInputEl.className = 'table-input';
    ratingInputEl.min = '0';
    ratingInputEl.step = '1';
    ratingInputEl.value = String(player.ratingFinal ?? 0);

    const ratingCell = document.createElement('td');
    ratingCell.appendChild(ratingInputEl);
    row.appendChild(ratingCell);

    row.appendChild(createCell(player.ratingOriginal ? String(player.ratingOriginal) : '-'));
    row.appendChild(createCell(player.category ? CATEGORY_LABELS[player.category] : '-'));

    const accountLabel = player.provider === 'none'
      ? PROVIDER_LABELS.none
      : `${PROVIDER_LABELS[player.provider] || player.provider}${player.username ? ` / ${player.username}` : ''}`;
    row.appendChild(createCell(accountLabel));

    const statusCell = document.createElement('td');
    const statusSpan = document.createElement('span');
    const className = statusClassMap[player.status] || 'error';
    statusSpan.className = `status ${className}`;
    statusSpan.textContent = STATUS_LABELS[player.status] || player.status;
    statusCell.appendChild(statusSpan);
    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'table-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-small';
    saveBtn.textContent = 'Uložit';
    saveBtn.addEventListener('click', () => {
      const nextName = nameInputEl.value.trim();
      const nextRating = Number.parseInt(ratingInputEl.value, 10);
      if (!nextName) {
        setStatus('Jméno nesmí být prázdné.');
        return;
      }
      if (!Number.isFinite(nextRating) || nextRating < 0) {
        setStatus('Rating musí být nezáporné číslo.');
        return;
      }
      players = players.map((item) => item.id === player.id
        ? { ...item, name: nextName, ratingFinal: nextRating }
        : item);
      savePlayers(players);
      renderPlayers();
      invalidateTournament('Seznam hráčů se změnil, turnaj byl zrušen.');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.textContent = 'Smazat';
    deleteBtn.addEventListener('click', () => {
      const confirmed = window.confirm(`Opravdu chcete smazat hráče ${player.name}?`);
      if (!confirmed) {
        return;
      }
      players = players.filter((item) => item.id !== player.id);
      savePlayers(players);
      renderPlayers();
      invalidateTournament('Seznam hráčů se změnil, turnaj byl zrušen.');
    });

    actions.appendChild(saveBtn);
    actions.appendChild(deleteBtn);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    playersBody.appendChild(row);
  }
}

function renderTournament() {
  renderTournamentAdmin();
  renderPublicView();
}

function renderTournamentAdmin() {
  if (tabAdmin) {
    tabAdmin.hidden = !isReferee;
  }
  if (!isReferee && publicActiveTab === 'admin') {
    publicActiveTab = 'pairings';
  }
  pairingsBody.textContent = '';

  const hasTournament = Boolean(tournament);
  const hasRounds = hasTournament && tournament.rounds && tournament.rounds.length > 0;

  updateTournamentControls(hasTournament, hasRounds);
  renderTournamentMgmt();

  if (!hasTournament || !hasRounds) {
    tournamentRoundLabel.textContent = '';
    pairingsEmpty.hidden = false;
    tournamentCreateBtn.disabled = !isReferee || players.length < 2;
    tournamentCreateBtn.textContent = 'Vytvořit 1. kolo';
    tournamentHint.textContent = isReferee
      ? 'Vyberte systém a vytvořte první kolo.'
      : 'Pro práci s turnajem je potřeba přihlášení správce.';
    return;
  }

  const currentRound = getCurrentRound(tournament);
  const roundComplete = currentRound ? isRoundComplete(currentRound) : false;
  const tournamentFinished = isTournamentFinished(tournament);

  if (!isReferee) {
    viewRoundNumber = tournament.round;
  } else if (!viewRoundNumber || !getRoundByNumber(viewRoundNumber)) {
    viewRoundNumber = tournament.round;
  }

  updateRoundSelect();

  const viewRound = getRoundByNumber(viewRoundNumber) || currentRound;
  tournamentRoundLabel.textContent = viewRound ? `Kolo ${viewRound.round}` : '';
  pairingsEmpty.hidden = viewRound && viewRound.pairings.length > 0;

  if (tournamentFinished) {
    tournamentCreateBtn.disabled = true;
    tournamentCreateBtn.textContent = 'Turnaj dokončen';
  } else {
    tournamentCreateBtn.textContent = 'Vytvořit další kolo';
    tournamentCreateBtn.disabled = !isReferee || !roundComplete;
  }

  tournamentHint.textContent = tournament.system === 'swiss'
    ? 'Systém: švýcarský.'
    : 'Systém: každý s každým.';

  if (viewRound) {
    renderPairings(viewRound, pairingsBody, true);
  }
}

function renderPublicView() {
  if (!publicPairingsBody) {
    return;
  }
  publicPairingsBody.textContent = '';

  const hasTournament = Boolean(tournament);
  const hasRounds = hasTournament && tournament.rounds && tournament.rounds.length > 0;
  const currentRound = hasRounds ? getCurrentRound(tournament) : null;

  if (currentRound) {
    if (publicPairingsWrap) publicPairingsWrap.hidden = false;
    if (publicPlayersWrap) publicPlayersWrap.hidden = true;
    publicRoundLabel.textContent = `Kolo ${currentRound.round}`;
    renderPairings(currentRound, publicPairingsBody, false);
    publicPairingsEmpty.hidden = currentRound.pairings.length > 0;
  } else {
    publicRoundLabel.textContent = '';
    publicPairingsEmpty.hidden = true;
    if (publicPairingsWrap) publicPairingsWrap.hidden = true;
    if (publicPlayersWrap) publicPlayersWrap.hidden = false;
  }

  renderResultsPanel();
  renderStandings();
  renderPlayerDetail();
  setPublicTab(publicActiveTab);
}

function renderResultsPanel() {
  if (!publicResultsBody) {
    return;
  }
  publicResultsBody.textContent = '';

  const rounds = tournament && tournament.rounds ? tournament.rounds : [];
  const completedRounds = rounds.filter((round) => isRoundComplete(round));

  if (completedRounds.length === 0) {
    publicResultsEmpty.hidden = false;
    if (publicResultsSelectWrap) publicResultsSelectWrap.hidden = true;
    if (publicResultsLabel) publicResultsLabel.textContent = '';
    return;
  }

  publicResultsEmpty.hidden = true;
  if (publicResultsSelectWrap) publicResultsSelectWrap.hidden = false;

  if (publicResultsSelect) {
    publicResultsSelect.textContent = '';
    completedRounds.forEach((round) => {
      const option = document.createElement('option');
      option.value = String(round.round);
      option.textContent = `Kolo ${round.round}`;
      publicResultsSelect.appendChild(option);
    });
  }

  if (!publicResultsRound || !completedRounds.some((round) => round.round === publicResultsRound)) {
    publicResultsRound = completedRounds[completedRounds.length - 1].round;
  }

  if (publicResultsSelect) {
    publicResultsSelect.value = String(publicResultsRound);
  }

  const selectedRound = completedRounds.find((round) => round.round === publicResultsRound);
  if (publicResultsLabel) {
    publicResultsLabel.textContent = selectedRound ? `Kolo ${selectedRound.round}` : '';
  }
  if (selectedRound) {
    renderPairings(selectedRound, publicResultsBody, false);
  }
}

function updateTournamentControls(hasTournament, hasRounds) {
  const systemValue = hasTournament ? tournament.system : tournamentSystem.value;
  const isSwiss = systemValue === 'swiss';
  const showRematch = isReferee && isSwiss;
  allowRematchWrap.hidden = !showRematch;
  allowRematch.disabled = !showRematch;

  const showRoundSelect = isReferee && hasTournament && hasRounds;
  roundSelectWrap.hidden = !showRoundSelect;
  roundSelect.disabled = !showRoundSelect;

  tournamentSystem.disabled = hasTournament || !isReferee;
  tournamentCancelBtn.disabled = !isReferee || !hasTournament;

  if (tournamentCancelRoundBtn) {
    const canCancelRound = isReferee && hasTournament && hasRounds;
    tournamentCancelRoundBtn.disabled = false;
    tournamentCancelRoundBtn.setAttribute('aria-disabled', canCancelRound ? 'false' : 'true');
    tournamentCancelRoundBtn.classList.toggle('is-disabled', !canCancelRound);
    if (!canCancelRound) {
      const reason = !isReferee
        ? 'Přihlaste se jako správce.'
        : !hasTournament
          ? 'Turnaj není založen.'
          : 'Žádné kolo ke zrušení.';
      tournamentCancelRoundBtn.title = reason;
    } else {
      tournamentCancelRoundBtn.removeAttribute('title');
    }
  }
  if (tournamentExportRoundBtn) {
    tournamentExportRoundBtn.disabled = !isReferee || !hasTournament || !hasRounds;
  }
  if (tournamentExportTournamentBtn) {
    tournamentExportTournamentBtn.disabled = !isReferee || !hasTournament;
  }
}

function updateRoundSelect() {
  if (!tournament) {
    return;
  }
  roundSelect.textContent = '';
  tournament.rounds.forEach((round) => {
    const option = document.createElement('option');
    option.value = String(round.round);
    option.textContent = `Kolo ${round.round}`;
    roundSelect.appendChild(option);
  });
  if (!viewRoundNumber || !getRoundByNumber(viewRoundNumber)) {
    viewRoundNumber = tournament.round;
  }
  roundSelect.value = String(viewRoundNumber);
}

function setPublicTab(tab) {
  const allowedTabs = new Set(['standings', 'pairings', 'results', 'admin']);
  let nextTab = allowedTabs.has(tab) ? tab : 'pairings';
  if (nextTab === 'admin' && !isReferee) {
    nextTab = 'pairings';
  }
  publicActiveTab = nextTab;

  if (tabStandings) tabStandings.classList.toggle('active', publicActiveTab === 'standings');
  if (tabPairings) tabPairings.classList.toggle('active', publicActiveTab === 'pairings');
  if (tabResults) tabResults.classList.toggle('active', publicActiveTab === 'results');
  if (tabAdmin) tabAdmin.classList.toggle('active', publicActiveTab === 'admin');
  if (panelStandings) panelStandings.hidden = publicActiveTab !== 'standings';
  if (panelPairings) panelPairings.hidden = publicActiveTab !== 'pairings';
  if (panelResults) panelResults.hidden = publicActiveTab !== 'results';
  if (tournamentAdminSection) tournamentAdminSection.hidden = publicActiveTab !== 'admin' || !isReferee;
}

function renderPairings(round, body, editable) {
  body.textContent = '';
  round.pairings.forEach((pairing, index) => {
    const row = document.createElement('tr');
    row.appendChild(createCell(String(index + 1)));

    if (pairing.byeId) {
      const player = findPlayer(pairing.byeId);
      row.appendChild(createCellWithNode(createPlayerButton(player)));
      row.appendChild(createCell('volno'));
      row.appendChild(createCellWithNode(createResultTag(RESULT_LABELS.bye)));
      body.appendChild(row);
      return;
    }

    const white = findPlayer(pairing.whiteId);
    const black = findPlayer(pairing.blackId);
    row.appendChild(createCellWithNode(createPlayerButton(white)));
    row.appendChild(createCellWithNode(createPlayerButton(black)));

    const resultCell = document.createElement('td');
    if (editable) {
      const select = document.createElement('select');
      select.className = 'result-select';
      RESULT_OPTIONS.forEach((option) => {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        select.appendChild(item);
      });
      select.value = pairing.result || '';
      select.addEventListener('change', () => {
        pairing.result = select.value || null;
        saveTournament(tournament);
        renderTournament();
      });
      resultCell.appendChild(select);
    } else {
      const label = pairing.result ? RESULT_LABELS[pairing.result] || pairing.result : 'čeká se';
      resultCell.appendChild(createResultTag(label));
    }
    row.appendChild(resultCell);
    body.appendChild(row);
  });
}

function renderStandings() {
  standingsBody.textContent = '';
  if (!tournament || players.length === 0) {
    standingsEmpty.hidden = false;
    return;
  }
  const standings = getStandings(players, tournament.rounds);
  standingsEmpty.hidden = standings.length === 0;
  standings.forEach((player, index) => {
    const row = document.createElement('tr');
    row.appendChild(createCell(String(index + 1)));
    row.appendChild(createCellWithNode(createPlayerButton(player)));
    row.appendChild(createCell(formatPoints(player.points)));
    row.appendChild(createCell(String(player.ratingFinal ?? 0)));
    standingsBody.appendChild(row);
  });
}

function renderPlayerDetail() {
  playerDetailBody.textContent = '';
  if (!tournament || !selectedPlayerId) {
    playerDetailTitle.textContent = 'Detail hráče';
    playerDetailEmpty.hidden = false;
    playerDetailClear.hidden = true;
    return;
  }
  const player = findPlayer(selectedPlayerId);
  if (!player) {
    selectedPlayerId = null;
    renderPlayerDetail();
    return;
  }
  const results = getPlayerResults(selectedPlayerId, tournament.rounds);
  playerDetailTitle.textContent = `Detail hráče: ${player.name}`;
  playerDetailEmpty.hidden = results.length > 0;
  playerDetailClear.hidden = false;
  results.forEach((entry) => {
    const row = document.createElement('tr');
    row.appendChild(createCell(String(entry.round)));
    row.appendChild(createCell(entry.opponent));
    row.appendChild(createCell(entry.color));
    row.appendChild(createCell(entry.result));
    playerDetailBody.appendChild(row);
  });
}

// ── Tournament logic ──────────────────────────────────────────────────────────
function createTournament() {
  const system = tournamentSystem.value;
  if (system === 'round-robin') {
    const rounds = createRoundRobinSchedule(players);
    tournament = { system, round: 1, rounds, createdAt: new Date().toISOString() };
  } else {
    const result = generateSwissPairings(players, [], { allowRematch: allowRematch.checked });
    if (!result.success) {
      setTournamentStatus(getSwissFailureMessage(result, allowRematch.checked));
      return;
    }
    tournament = {
      system,
      round: 1,
      rounds: [{ round: 1, pairings: result.pairings }],
      createdAt: new Date().toISOString()
    };
  }
  viewRoundNumber = tournament.round;
  saveTournament(tournament);
  renderTournament();
  setTournamentStatus('Nasazení pro 1. kolo bylo vytvořeno.');
}

function createNextRound() {
  if (!tournament) {
    return;
  }
  if (tournament.system === 'round-robin') {
    if (tournament.round >= tournament.rounds.length) {
      return;
    }
    tournament.round += 1;
    viewRoundNumber = tournament.round;
    saveTournament(tournament);
    renderTournament();
    setTournamentStatus(`Nasazení pro ${tournament.round}. kolo bylo vytvořeno.`);
    return;
  }
  const roundLimit = getSwissRoundLimit(players.length);
  if (roundLimit > 0 && tournament.round >= roundLimit) {
    setTournamentStatus(
      `Nelze vytvorit dalsi kolo: maximalni pocet kol pro svycarsky system je ${roundLimit}.`
    );
    return;
  }
  const result = generateSwissPairings(players, tournament.rounds, { allowRematch: allowRematch.checked });
  if (!result.success) {
    setTournamentStatus(getSwissFailureMessage(result, allowRematch.checked));
    return;
  }
  const nextRoundNumber = tournament.rounds.length ? tournament.round + 1 : 1;
  tournament.rounds.push({ round: nextRoundNumber, pairings: result.pairings });
  tournament.round = nextRoundNumber;
  viewRoundNumber = tournament.round;
  saveTournament(tournament);
  renderTournament();
  const suffix = result.hasRematch ? ' (obsahuje opakování soupeřů)' : '';
  setTournamentStatus(`Nasazení pro ${tournament.round}. kolo bylo vytvořeno${suffix}.`);
}

function getSwissFailureMessage(result, allowRepeat) {
  if (result.reason === 'odd_group') {
    return 'Nelze vytvořit kolo: některá skupina zůstala lichá (pravděpodobně už všichni měli volno).';
  }
  if (result.reason === 'no_match') {
    return allowRepeat
      ? 'Nelze vytvořit kolo s aktuálními pravidly (barvy/opakování soupeřů).'
      : 'Bez opakování soupeřů nelze vytvořit další kolo. Zaškrtněte „Povolit opakování soupeřů".';
  }
  return 'Nelze vytvořit kolo s aktuálními pravidly.';
}

function getPlayerResults(playerId, rounds) {
  const results = [];
  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId === playerId) {
        results.push({ round: round.round, opponent: 'volno', color: '-', result: '1' });
        return;
      }
      if (pairing.whiteId !== playerId && pairing.blackId !== playerId) {
        return;
      }
      const isWhite = pairing.whiteId === playerId;
      const opponentId = isWhite ? pairing.blackId : pairing.whiteId;
      const opponent = findPlayer(opponentId);
      results.push({
        round: round.round,
        opponent: opponent ? opponent.name : 'neznámý hráč',
        color: isWhite ? 'bílá' : 'černá',
        result: formatPlayerResult(pairing.result, isWhite)
      });
    });
  });
  return results.sort((a, b) => a.round - b.round);
}

function formatPlayerResult(result, isWhite) {
  if (!result) return 'čeká se';
  if (result === '0.5-0.5') return '0.5';
  if (result === '1-0') return isWhite ? '1' : '0';
  if (result === '0-1') return isWhite ? '0' : '1';
  return result;
}

function isRoundComplete(round) {
  return round.pairings.every((pairing) => pairing.byeId || pairing.result);
}

function isTournamentFinished(current) {
  if (!current) return false;
  if (current.system === 'round-robin') {
    const finalRound = current.rounds.length;
    const currentRound = getCurrentRound(current);
    return current.round >= finalRound && currentRound && isRoundComplete(currentRound);
  }
  if (current.system === 'swiss') {
    const roundLimit = getSwissRoundLimit(players.length);
    const currentRound = getCurrentRound(current);
    return roundLimit > 0 && current.round >= roundLimit && currentRound && isRoundComplete(currentRound);
  }
  return false;
}

function invalidateTournament(message) {
  if (!tournament) return;
  tournament = null;
  viewRoundNumber = 0;
  saveTournament(tournament);
  selectedPlayerId = null;
  renderTournament();
  if (message) setTournamentStatus(message);
}

// ── PDF export ────────────────────────────────────────────────────────────────
function getPdfDoc() {
  if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') return null;
  return new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
}

function formatExportDate(date) {
  return date.toLocaleDateString('cs-CZ');
}

function getActiveTournamentName() {
  const t = tournamentList.find((x) => x.id === activeTournamentId);
  return t ? t.name : activeTournamentId || 'Turnaj';
}

function getPairingResultLabel(pairing) {
  if (pairing.byeId) return RESULT_LABELS.bye;
  if (pairing.result) return RESULT_LABELS[pairing.result] || pairing.result;
  return 'čeká se';
}

function getPlayerNameById(id) {
  const player = findPlayer(id);
  return player ? player.name : 'neznámý hráč';
}

function buildRoundRows(round) {
  return round.pairings.map((pairing, index) => {
    if (pairing.byeId) {
      return [String(index + 1), getPlayerNameById(pairing.byeId), 'volno', RESULT_LABELS.bye];
    }
    return [
      String(index + 1),
      getPlayerNameById(pairing.whiteId),
      getPlayerNameById(pairing.blackId),
      getPairingResultLabel(pairing)
    ];
  });
}

function buildStandingsRows(standings) {
  return standings.map((player, index) => ([
    String(index + 1),
    player.name,
    formatPoints(player.points),
    String(player.ratingFinal ?? 0)
  ]));
}

function ensurePdfSpace(doc, startY, needed) {
  const height = doc.internal.pageSize.getHeight();
  if (startY + needed > height - 40) {
    doc.addPage();
    return 40;
  }
  return startY;
}

function addPdfSectionTitle(doc, text, startY) {
  const nextY = ensurePdfSpace(doc, startY, 28);
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text(text, 40, nextY);
  return nextY + 16;
}

function addPdfTable(doc, head, body, startY) {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable({
      head: [head],
      body,
      startY,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [197, 139, 42], textColor: 255 }
    });
    if (doc.lastAutoTable) return doc.lastAutoTable.finalY + 16;
    return startY + 16;
  }
  let y = startY;
  const lineHeight = 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.text(head.join(' | '), 40, y);
  y += lineHeight;
  body.forEach((row) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 40;
    }
    doc.text(row.join(' | '), 40, y);
    y += lineHeight;
  });
  return y + 8;
}

function exportRoundPdf(round) {
  const doc = getPdfDoc();
  if (!doc) {
    setTournamentStatus('Export do PDF není dostupný (chybí knihovna).');
    return;
  }
  const tName = getActiveTournamentName();
  doc.setFontSize(18);
  doc.text(`${tName} - Kolo ${round.round}`, 40, 52);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Datum exportu: ${formatExportDate(new Date())}`, 40, 70);
  doc.setTextColor(0);
  const rows = buildRoundRows(round);
  addPdfTable(doc, ['#', 'Bílý', 'Černý', 'Výsledek'], rows, 90);
  doc.save(`${activeTournamentId}-kolo-${round.round}.pdf`);
  setTournamentStatus('PDF bylo exportováno.');
}

function exportTournamentPdf() {
  if (!tournament) {
    setTournamentStatus('Turnaj není založen.');
    return;
  }
  const doc = getPdfDoc();
  if (!doc) {
    setTournamentStatus('Export do PDF není dostupný (chybí knihovna).');
    return;
  }
  const tName = getActiveTournamentName();
  const systemLabel = tournament.system === 'swiss' ? 'Švýcarský systém' : 'Každý s každým';
  doc.setFontSize(18);
  doc.text(`${tName} - Výsledky`, 40, 52);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Systém: ${systemLabel}`, 40, 70);
  doc.text(`Datum exportu: ${formatExportDate(new Date())}`, 40, 86);
  doc.setTextColor(0);

  let y = 110;
  const standings = getStandings(players, tournament.rounds);
  y = addPdfSectionTitle(doc, 'Pořadí hráčů', y);
  y = addPdfTable(doc, ['#', 'Hráč', 'Body', 'Rating'], buildStandingsRows(standings), y);
  tournament.rounds.forEach((round) => {
    y = addPdfSectionTitle(doc, `Kolo ${round.round}`, y);
    y = addPdfTable(doc, ['#', 'Bílý', 'Černý', 'Výsledek'], buildRoundRows(round), y);
  });
  doc.save(`${activeTournamentId}-vysledky.pdf`);
  setTournamentStatus('PDF bylo exportováno.');
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function updateRefereeUI() {
  refLoginForm.hidden = isReferee;
  refLogged.hidden = !isReferee;
  if (isReferee) refStatus.textContent = '';
}

function setReferee(value) {
  isReferee = value;
  if (isReferee) {
    sessionStorage.setItem(REFEREE_KEY, '1');
  } else {
    sessionStorage.removeItem(REFEREE_KEY);
  }
  updateRefereeUI();
  renderPlayers();
  renderTournament();
}

function loadReferee() {
  return sessionStorage.getItem(REFEREE_KEY) === '1';
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function toggleDrawer(open) {
  if (open) {
    menuDrawer.classList.add('open');
    menuDrawer.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuBackdrop.hidden = false;
    document.body.classList.add('drawer-open');
  } else {
    menuDrawer.classList.remove('open');
    menuDrawer.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuBackdrop.hidden = true;
    document.body.classList.remove('drawer-open');
  }
}

function updatePageView() {
  if (!mainView || !registrationView) return;
  const isRegistration = window.location.hash === '#registrace';
  mainView.hidden = isRegistration;
  registrationView.hidden = !isRegistration;
  if (registrationSuccess && isRegistration) {
    registrationSuccess.hidden = true;
  }
}

function showRegistrationSuccess() {
  if (!registrationSuccess) return;
  registrationSuccess.textContent = 'Registrace proběhla úspěšně.';
  registrationSuccess.hidden = false;
  if (registrationSuccessTimer) window.clearTimeout(registrationSuccessTimer);
  registrationSuccessTimer = window.setTimeout(() => {
    registrationSuccess.hidden = true;
  }, 6000);
}

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function createCellWithNode(node) {
  const cell = document.createElement('td');
  if (node) cell.appendChild(node);
  return cell;
}

function createResultTag(text) {
  const tag = document.createElement('span');
  tag.className = 'result-tag';
  tag.textContent = text;
  return tag;
}

function createPlayerButton(player) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'player-link';
  button.textContent = player ? player.name : 'neznámý hráč';
  if (player) {
    button.addEventListener('click', () => {
      selectedPlayerId = player.id;
      setPublicTab('standings');
      renderPlayerDetail();
    });
  }
  return button;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPoints(points) {
  if (Number.isInteger(points)) return String(points);
  return points.toString();
}

// ── Player normalization ──────────────────────────────────────────────────────
function normalizePlayer(player) {
  const ratingOriginal = Number.isFinite(player.ratingOriginal)
    ? player.ratingOriginal
    : Number.isFinite(player.rating)
      ? player.rating
      : 0;
  const ratingFinal = Number.isFinite(player.ratingFinal)
    ? player.ratingFinal
    : convertToTournamentRating({
      provider: player.provider,
      category: player.category,
      rating: ratingOriginal
    }) || ratingOriginal;
  return { ...player, ratingOriginal, ratingFinal };
}

// ── Persistence ───────────────────────────────────────────────────────────────
function loadPlayers() {
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.map(normalizePlayer);
  } catch {
    return [];
  }
}

function savePlayers(data, options = {}) {
  window.localStorage.setItem(getStorageKey(), JSON.stringify(data));
  if (!options.skipLocalUpdate) {
    markLocalUpdate();
    scheduleSharedSave();
  }
}

function loadTournament() {
  try {
    const raw = window.localStorage.getItem(getTournamentKey());
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function saveTournament(data, options = {}) {
  if (!data) {
    window.localStorage.removeItem(getTournamentKey());
    if (!options.skipLocalUpdate) {
      markLocalUpdate();
      scheduleSharedSave();
    }
    return;
  }
  window.localStorage.setItem(getTournamentKey(), JSON.stringify(data));
  if (!options.skipLocalUpdate) {
    markLocalUpdate();
    scheduleSharedSave();
  }
}

function markLocalUpdate() {
  const now = Date.now();
  const baseline = Math.max(
    Number.isFinite(lastSharedUpdateAt) ? lastSharedUpdateAt : 0,
    Number.isFinite(localUpdatedAt) ? localUpdatedAt : 0
  );
  localUpdatedAt = Math.max(now, baseline + 1);
  saveLocalUpdatedAt(localUpdatedAt);
  return localUpdatedAt;
}

function loadLocalUpdatedAt() {
  try {
    const raw = window.localStorage.getItem(getLocalUpdatedKey());
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveLocalUpdatedAt(value) {
  window.localStorage.setItem(getLocalUpdatedKey(), String(value));
}

function loadSharedUpdatedAt() {
  try {
    const raw = window.localStorage.getItem(getSharedUpdatedKey());
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveSharedUpdatedAt(value) {
  window.localStorage.setItem(getSharedUpdatedKey(), String(value));
}

// ── Shared sync ───────────────────────────────────────────────────────────────
function scheduleSharedSave() {
  if (!SHARED_STATE_API || suppressSharedSave) return;
  if (!sharedSyncReady) {
    queuedSharedSave = true;
    return;
  }
  if (sharedSaveTimer) window.clearTimeout(sharedSaveTimer);
  pendingSharedSave = true;
  sharedSaveTimer = window.setTimeout(() => {
    pushSharedState();
  }, SHARED_SAVE_DEBOUNCE_MS);
}

async function pushSharedState() {
  if (!SHARED_STATE_API || suppressSharedSave || !sharedSyncReady) {
    pendingSharedSave = false;
    return;
  }
  const updatedAt = localUpdatedAt || Date.now();
  const payload = { players, tournament, updatedAt };
  try {
    const response = await fetch(SHARED_STATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeTournamentId, payload })
    });
    if (!response.ok) throw new Error(`Shared save failed: ${response.status}`);
    lastSharedUpdateAt = updatedAt;
    saveSharedUpdatedAt(updatedAt);
  } catch (error) {
    console.error('Shared state save failed.', error);
  } finally {
    pendingSharedSave = false;
  }
}

async function fetchSharedState() {
  if (!SHARED_STATE_API) return null;
  try {
    const response = await fetch(
      `${SHARED_STATE_API}?id=${encodeURIComponent(activeTournamentId)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) return null;

    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const payload = row && row.payload && typeof row.payload === 'object' ? row.payload : null;
    const remoteUpdatedAt = payload && Number.isFinite(payload.updatedAt) ? payload.updatedAt : 0;
    const isObject = payload && typeof payload === 'object';
    const hasPlayers = isObject && Object.prototype.hasOwnProperty.call(payload, 'players');
    const hasTournament = isObject && Object.prototype.hasOwnProperty.call(payload, 'tournament');
    const hasData = hasPlayers || hasTournament;
    const localHasData = players.length > 0 || Boolean(tournament);
    const remotePlayers = Array.isArray(payload?.players) ? payload.players.length : 0;
    const remoteHasMeaningfulData = remotePlayers > 0 || Boolean(payload?.tournament);

    if (pendingSharedSave) return { hasData, remoteUpdatedAt, data: payload };
    if (!localHasData && remoteHasMeaningfulData) {
      applySharedState(payload, remoteUpdatedAt);
      const nextUpdatedAt = remoteUpdatedAt || Date.now();
      lastSharedUpdateAt = nextUpdatedAt;
      saveSharedUpdatedAt(nextUpdatedAt);
      return { hasData, remoteUpdatedAt, data: payload };
    }
    if (localHasData && localUpdatedAt && remoteUpdatedAt && localUpdatedAt > remoteUpdatedAt) {
      return { hasData, remoteUpdatedAt, data: payload };
    }
    if (localHasData && localUpdatedAt && !remoteUpdatedAt && !remoteHasMeaningfulData) {
      return { hasData, remoteUpdatedAt, data: payload };
    }
    if (remoteUpdatedAt && remoteUpdatedAt <= lastSharedUpdateAt) {
      return { hasData, remoteUpdatedAt, data: payload };
    }
    if (!remoteUpdatedAt && lastSharedUpdateAt) {
      return { hasData, remoteUpdatedAt, data: payload };
    }
    applySharedState(payload, remoteUpdatedAt);
    const nextUpdatedAt = remoteUpdatedAt || Date.now();
    lastSharedUpdateAt = nextUpdatedAt;
    saveSharedUpdatedAt(nextUpdatedAt);
    return { hasData, remoteUpdatedAt, data: payload };
  } catch (error) {
    console.error('Shared state fetch failed.', error);
    return null;
  }
}

function applySharedState(data, remoteUpdatedAt) {
  if (!data || typeof data !== 'object') return;
  const hasPlayers = Object.prototype.hasOwnProperty.call(data, 'players');
  const hasTournament = Object.prototype.hasOwnProperty.call(data, 'tournament');
  if (!hasPlayers && !hasTournament) return;

  const nextPlayers = hasPlayers
    ? (Array.isArray(data.players) ? data.players.map(normalizePlayer) : [])
    : players;
  const nextTournament = hasTournament
    ? (data.tournament && typeof data.tournament === 'object' ? data.tournament : null)
    : tournament;

  suppressSharedSave = true;
  players = nextPlayers;
  tournament = nextTournament;
  viewRoundNumber = tournament?.round || 0;
  selectedPlayerId = null;
  savePlayers(players, { skipLocalUpdate: true });
  saveTournament(tournament, { skipLocalUpdate: true });
  if (Number.isFinite(remoteUpdatedAt) && remoteUpdatedAt > 0) {
    localUpdatedAt = remoteUpdatedAt;
    saveLocalUpdatedAt(localUpdatedAt);
  }
  suppressSharedSave = false;

  renderPlayers();
  renderTournament();
}

async function initSharedSync() {
  if (!SHARED_STATE_API) {
    sharedSyncReady = true;
    return;
  }
  let snapshot = null;
  const localHasData = players.length > 0 || Boolean(tournament);
  try {
    snapshot = await fetchSharedState();
  } finally {
    sharedSyncReady = true;
  }
  if (queuedSharedSave) {
    queuedSharedSave = false;
    scheduleSharedSave();
  } else if (snapshot && !snapshot.hasData && localHasData) {
    scheduleSharedSave();
  } else if (snapshot && localHasData && localUpdatedAt && snapshot.remoteUpdatedAt) {
    if (localUpdatedAt > snapshot.remoteUpdatedAt) {
      scheduleSharedSave();
    }
  }
  if (sharedSyncIntervalId) {
    window.clearInterval(sharedSyncIntervalId);
  }
  sharedSyncIntervalId = window.setInterval(fetchSharedState, SHARED_SYNC_INTERVAL_MS);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function findPlayer(id) {
  return players.find((player) => player.id === id);
}

function getCurrentRound(current) {
  if (!current) return null;
  return current.rounds[current.round - 1] || null;
}

function getRoundByNumber(roundNumber) {
  if (!tournament) return null;
  return tournament.rounds.find((round) => round.round === roundNumber) || null;
}
