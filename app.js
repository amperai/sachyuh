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
  getStandings
} from './tournament.js';

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
const tabPlayers = document.getElementById('tabPlayers');
const tabStandings = document.getElementById('tabStandings');
const panelPlayers = document.getElementById('panelPlayers');
const panelStandings = document.getElementById('panelStandings');

const standingsBody = document.getElementById('standingsBody');
const standingsEmpty = document.getElementById('standingsEmpty');
const playerDetailTitle = document.getElementById('playerDetailTitle');
const playerDetailBody = document.getElementById('playerDetailBody');
const playerDetailEmpty = document.getElementById('playerDetailEmpty');
const playerDetailClear = document.getElementById('playerDetailClear');

const STORAGE_KEY = 'turnaj-koruna-registrations-v2';
const STORAGE_KEY_LEGACY = 'turnaj-koruna-registrations-v1';
const TOURNAMENT_KEY = 'turnaj-koruna-tournament-v2';
const REFEREE_KEY = 'turnaj-koruna-referee';
const REFEREE_PASSWORD = 'g';
const SHARED_STATE_URL = 'https://jsonblob.com/api/jsonBlob/019d7d08-fbe0-7507-afc9-288473e5bb1e';
const SHARED_SYNC_INTERVAL_MS = 5000;
const SHARED_SAVE_DEBOUNCE_MS = 500;
const SHARED_UPDATED_KEY = 'turnaj-koruna-shared-updated-at';

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
    placeholder: 'např. kubaczess',
    help: 'Načteme nejvyšší rating z chess.com (blitz, rapid, daily).'
  },
  lichess: {
    placeholder: 'např. oselposel',
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

let players = loadPlayers();
let tournament = loadTournament();
let isReferee = loadReferee();
let selectedPlayerId = null;
let viewRoundNumber = tournament?.round || 0;
let publicActiveTab = 'players';
let suppressSharedSave = false;
let pendingSharedSave = false;
let queuedSharedSave = false;
let sharedSaveTimer = null;
let sharedSyncReady = false;
let lastSharedUpdateAt = loadSharedUpdatedAt();

renderPlayers();
renderTournament();
updateProviderUI(getSelectedProvider());
updateRefereeUI();
initSharedSync();

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
      result = {
        provider: 'none',
        status: 'no_account',
        rating: 0,
        category: null,
        ratings: {}
      };
    }
  } catch (error) {
    result = {
      provider,
      status: 'error',
      rating: 0,
      category: null,
      ratings: {}
    };
  }

  const ratingOriginal = Number.isFinite(result.rating) ? result.rating : 0;
  const ratingFinal = convertToTournamentRating({
    provider,
    category: result.category,
    rating: ratingOriginal
  });

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

tabPlayers.addEventListener('click', () => setPublicTab('players'));
tabStandings.addEventListener('click', () => setPublicTab('standings'));

tournamentCreateBtn.addEventListener('click', () => {
  if (!isReferee) {
    setTournamentStatus('Přihlaste se jako rozhodčí pro vytvoření turnaje.');
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
  if (!isReferee || !tournament || !tournament.rounds.length) {
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

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleDrawer(false);
  }
});

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
  if (entry.status === 'no_rating') {
    return 'Účet byl nalezen, ale bez ratingu.';
  }
  if (entry.status === 'not_found') {
    return 'Hráč nebyl nalezen, registrován s ratingem 0.';
  }
  if (entry.status === 'no_account') {
    return 'Hráč byl registrován bez účtu.';
  }
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
    const status = document.createElement('span');
    const className = statusClassMap[player.status] || 'error';

    status.className = `status ${className}`;
    status.textContent = STATUS_LABELS[player.status] || player.status;
    statusCell.appendChild(status);
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
  if (tournamentAdminSection) {
    tournamentAdminSection.hidden = !isReferee;
  }

  pairingsBody.textContent = '';

  const hasTournament = Boolean(tournament);
  const hasRounds = hasTournament && tournament.rounds && tournament.rounds.length > 0;

  updateTournamentControls(hasTournament, hasRounds);

  if (!hasTournament || !hasRounds) {
    tournamentRoundLabel.textContent = '';
    pairingsEmpty.hidden = false;
    tournamentCreateBtn.disabled = !isReferee || players.length < 2;
    tournamentCreateBtn.textContent = 'Vytvořit 1. kolo';
    tournamentHint.textContent = isReferee
      ? 'Vyberte systém a vytvořte první kolo.'
      : 'Pro práci s turnajem je potřeba přihlášení rozhodčího.';
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

  if (!hasTournament || !hasRounds || !currentRound) {
    publicRoundLabel.textContent = '';
    publicPairingsEmpty.hidden = false;
  } else {
    publicRoundLabel.textContent = `Kolo ${currentRound.round}`;
    renderPairings(currentRound, publicPairingsBody, false);
    publicPairingsEmpty.hidden = currentRound.pairings.length > 0;
  }

  renderStandings();
  renderPlayerDetail();
  setPublicTab(publicActiveTab);
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
  tournamentCancelRoundBtn.disabled = !isReferee || !hasTournament || !hasRounds;
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
  publicActiveTab = tab === 'standings' ? 'standings' : 'players';
  if (tabPlayers) {
    tabPlayers.classList.toggle('active', publicActiveTab === 'players');
  }
  if (tabStandings) {
    tabStandings.classList.toggle('active', publicActiveTab === 'standings');
  }
  if (panelPlayers) {
    panelPlayers.hidden = publicActiveTab !== 'players';
  }
  if (panelStandings) {
    panelStandings.hidden = publicActiveTab !== 'standings';
  }
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

function createTournament() {
  const system = tournamentSystem.value;
  if (system === 'round-robin') {
    const rounds = createRoundRobinSchedule(players);
    tournament = {
      system,
      round: 1,
      rounds,
      createdAt: new Date().toISOString()
    };
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
      : 'Bez opakování soupeřů nelze vytvořit další kolo. Zaškrtněte „Povolit opakování soupeřů“.';
  }
  return 'Nelze vytvořit kolo s aktuálními pravidly.';
}

function getPlayerResults(playerId, rounds) {
  const results = [];

  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId === playerId) {
        results.push({
          round: round.round,
          opponent: 'volno',
          color: '-',
          result: '1'
        });
        return;
      }

      if (pairing.whiteId !== playerId && pairing.blackId !== playerId) {
        return;
      }

      const isWhite = pairing.whiteId === playerId;
      const opponentId = isWhite ? pairing.blackId : pairing.whiteId;
      const opponent = findPlayer(opponentId);
      const color = isWhite ? 'bílá' : 'černá';
      const result = formatPlayerResult(pairing.result, isWhite);

      results.push({
        round: round.round,
        opponent: opponent ? opponent.name : 'neznámý hráč',
        color,
        result
      });
    });
  });

  return results.sort((a, b) => a.round - b.round);
}

function formatPlayerResult(result, isWhite) {
  if (!result) {
    return 'čeká se';
  }
  if (result === '0.5-0.5') {
    return '0.5';
  }
  if (result === '1-0') {
    return isWhite ? '1' : '0';
  }
  if (result === '0-1') {
    return isWhite ? '0' : '1';
  }
  return result;
}

function isRoundComplete(round) {
  return round.pairings.every((pairing) => pairing.byeId || pairing.result);
}

function isTournamentFinished(current) {
  if (!current) {
    return false;
  }
  if (current.system === 'round-robin') {
    const finalRound = current.rounds.length;
    const currentRound = getCurrentRound(current);
    return current.round >= finalRound && currentRound && isRoundComplete(currentRound);
  }
  return false;
}

function invalidateTournament(message) {
  if (!tournament) {
    return;
  }

  tournament = null;
  viewRoundNumber = 0;
  saveTournament(tournament);
  selectedPlayerId = null;
  renderTournament();
  if (message) {
    setTournamentStatus(message);
  }
}

function updateRefereeUI() {
  refLoginForm.hidden = isReferee;
  refLogged.hidden = !isReferee;
  if (isReferee) {
    refStatus.textContent = '';
  }
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

function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function createCellWithNode(node) {
  const cell = document.createElement('td');
  if (node) {
    cell.appendChild(node);
  }
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
  button.textContent = player ? player.name : 'nezn?m? hr??';
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
  if (Number.isInteger(points)) {
    return String(points);
  }
  return points.toString();
}

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

  return {
    ...player,
    ratingOriginal,
    ratingFinal
  };
}

function loadPlayers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const legacy = raw === null ? window.localStorage.getItem(STORAGE_KEY_LEGACY) : null;
    const payload = raw ?? legacy;
    const data = payload ? JSON.parse(payload) : [];
    if (!Array.isArray(data)) {
      return [];
    }
    const normalized = data.map(normalizePlayer);
    if (legacy) {
      savePlayers(normalized);
    }
    return normalized;
  } catch (error) {
    return [];
  }
}

function savePlayers(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  scheduleSharedSave();
}

function loadTournament() {
  try {
    const raw = window.localStorage.getItem(TOURNAMENT_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    return null;
  }
}

function saveTournament(data) {
  if (!data) {
    window.localStorage.removeItem(TOURNAMENT_KEY);
    scheduleSharedSave();
    return;
  }
  window.localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(data));
  scheduleSharedSave();
}

function loadSharedUpdatedAt() {
  try {
    const raw = window.localStorage.getItem(SHARED_UPDATED_KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    return 0;
  }
}

function saveSharedUpdatedAt(value) {
  window.localStorage.setItem(SHARED_UPDATED_KEY, String(value));
}

function scheduleSharedSave() {
  if (!SHARED_STATE_URL || suppressSharedSave) {
    return;
  }
  if (!sharedSyncReady) {
    queuedSharedSave = true;
    return;
  }
  if (sharedSaveTimer) {
    window.clearTimeout(sharedSaveTimer);
  }
  pendingSharedSave = true;
  sharedSaveTimer = window.setTimeout(() => {
    pushSharedState();
  }, SHARED_SAVE_DEBOUNCE_MS);
}

async function pushSharedState() {
  if (!SHARED_STATE_URL || suppressSharedSave || !sharedSyncReady) {
    pendingSharedSave = false;
    return;
  }
  const updatedAt = Date.now();
  const payload = {
    players,
    tournament,
    updatedAt
  };
  try {
    const response = await fetch(SHARED_STATE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Shared save failed: ${response.status}`);
    }
    lastSharedUpdateAt = updatedAt;
    saveSharedUpdatedAt(updatedAt);
  } catch (error) {
    console.error('Shared state save failed.', error);
  } finally {
    pendingSharedSave = false;
  }
}

async function fetchSharedState() {
  if (!SHARED_STATE_URL) {
    return null;
  }
  try {
    const response = await fetch(SHARED_STATE_URL, { method: 'GET' });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const remoteUpdatedAt = Number.isFinite(data.updatedAt) ? data.updatedAt : 0;
    const isObject = data && typeof data === 'object';
    const hasPlayers = isObject && Object.prototype.hasOwnProperty.call(data, 'players');
    const hasTournament = isObject && Object.prototype.hasOwnProperty.call(data, 'tournament');
    const hasData = hasPlayers || hasTournament;

    if (pendingSharedSave) {
      return { hasData, remoteUpdatedAt, data };
    }
    if (remoteUpdatedAt && remoteUpdatedAt <= lastSharedUpdateAt) {
      return { hasData, remoteUpdatedAt, data };
    }
    if (!remoteUpdatedAt && lastSharedUpdateAt) {
      return { hasData, remoteUpdatedAt, data };
    }

    applySharedState(data);

    const nextUpdatedAt = remoteUpdatedAt || Date.now();
    lastSharedUpdateAt = nextUpdatedAt;
    saveSharedUpdatedAt(nextUpdatedAt);
    return { hasData, remoteUpdatedAt, data };
  } catch (error) {
    console.error('Shared state fetch failed.', error);
    return null;
  }
}

function applySharedState(data) {
  if (!data || typeof data !== 'object') {
    return;
  }
  const hasPlayers = Object.prototype.hasOwnProperty.call(data, 'players');
  const hasTournament = Object.prototype.hasOwnProperty.call(data, 'tournament');
  if (!hasPlayers && !hasTournament) {
    return;
  }

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
  savePlayers(players);
  saveTournament(tournament);
  suppressSharedSave = false;

  renderPlayers();
  renderTournament();
}

async function initSharedSync() {
  if (!SHARED_STATE_URL) {
    sharedSyncReady = true;
    return;
  }
  let snapshot = null;
  try {
    snapshot = await fetchSharedState();
  } finally {
    sharedSyncReady = true;
  }
  if (queuedSharedSave) {
    queuedSharedSave = false;
    scheduleSharedSave();
  } else if (snapshot && !snapshot.hasData && (players.length || tournament)) {
    scheduleSharedSave();
  }
  window.setInterval(fetchSharedState, SHARED_SYNC_INTERVAL_MS);
}

function findPlayer(id) {
  return players.find((player) => player.id === id);
}

function getCurrentRound(current) {
  if (!current) {
    return null;
  }
  return current.rounds[current.round - 1] || null;
}

function getRoundByNumber(roundNumber) {
  if (!tournament) {
    return null;
  }
  return tournament.rounds.find((round) => round.round === roundNumber) || null;
}
