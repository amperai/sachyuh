import {
  CATEGORY_LABELS,
  PROVIDER_LABELS,
  STATUS_LABELS,
  convertToTournamentRating,
  fetchChessComRating,
  fetchLichessRating
} from './ratings.js';

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
const tournamentStatus = document.getElementById('tournamentStatus');
const tournamentControls = document.getElementById('tournamentControls');
const tournamentSystem = document.getElementById('tournamentSystem');
const tournamentCreateBtn = document.getElementById('btnCreateTournament');
const tournamentCancelBtn = document.getElementById('btnCancelTournament');
const pairingsBody = document.getElementById('pairingsBody');
const pairingsEmpty = document.getElementById('pairingsEmpty');

const STORAGE_KEY = 'turnaj-koruna-registrations-v2';
const STORAGE_KEY_LEGACY = 'turnaj-koruna-registrations-v1';
const TOURNAMENT_KEY = 'turnaj-koruna-tournament-v1';
const REFEREE_KEY = 'turnaj-koruna-referee';
const REFEREE_PASSWORD = 'g';

const providerHelp = {
  'chess.com': {
    placeholder: 'např. kubaczess',
    help: 'Načteme nejvyšší rating z chess.com (blitz, rapid, daily).'
  },
  lichess: {
    placeholder: 'např. oselposel',
    help: 'Načteme nejvyšší rating z lichess.org (blitz, rapid, korespondenční).'
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

renderPlayers();
renderTournament();
updateProviderUI(getSelectedProvider());
updateRefereeUI();

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

tournamentCreateBtn.addEventListener('click', () => {
  if (!isReferee) {
    setTournamentStatus('Přihlaste se jako rozhodčí pro vytvoření turnaje.');
    return;
  }

  if (players.length < 2) {
    setTournamentStatus('Pro nasazení je potřeba alespoň 2 hráče.');
    return;
  }

  const system = tournamentSystem.value;
  const pairings = generatePairings(players, system);

  tournament = {
    system,
    round: 1,
    createdAt: new Date().toISOString(),
    pairings
  };

  saveTournament(tournament);
  renderTournament();
  setTournamentStatus('Nasazení pro 1. kolo bylo vytvořeno.');
});

tournamentCancelBtn.addEventListener('click', () => {
  if (!tournament) {
    return;
  }

  const confirmed = window.confirm('Opravdu chcete zrušit turnaj?');
  if (!confirmed) {
    return;
  }

  tournament = null;
  saveTournament(tournament);
  renderTournament();
  setTournamentStatus('Turnaj byl zrušen.');
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
  pairingsBody.textContent = '';

  if (!tournament) {
    pairingsEmpty.hidden = false;
    tournamentCancelBtn.disabled = true;
    tournamentSystem.disabled = !isReferee;
    tournamentCreateBtn.disabled = !isReferee;
    tournamentHint.textContent = isReferee
      ? 'Vyberte systém a vytvořte první kolo.'
      : 'Pro práci s turnajem je potřeba přihlášení rozhodčího.';
    return;
  }

  pairingsEmpty.hidden = tournament.pairings.length > 0;
  tournamentCancelBtn.disabled = !isReferee;
  tournamentSystem.disabled = !isReferee;
  tournamentCreateBtn.disabled = !isReferee;
  if (tournamentSystem.value !== tournament.system) {
    tournamentSystem.value = tournament.system;
  }
  tournamentHint.textContent = tournament.system === 'swiss'
    ? 'Systém: švýcarský.'
    : 'Systém: každý s každým.';

  tournament.pairings.forEach((pairing, index) => {
    const row = document.createElement('tr');
    row.appendChild(createCell(String(index + 1)));

    if (pairing.byeId) {
      const player = findPlayer(pairing.byeId);
      row.appendChild(createCell(player ? player.name : 'Neznámý hráč'));
      row.appendChild(createCell('volno'));
      pairingsBody.appendChild(row);
      return;
    }

    const white = findPlayer(pairing.whiteId);
    const black = findPlayer(pairing.blackId);

    row.appendChild(createCell(white ? white.name : 'Neznámý hráč'));
    row.appendChild(createCell(black ? black.name : 'Neznámý hráč'));
    pairingsBody.appendChild(row);
  });
}

function generatePairings(playerList, system) {
  const sorted = [...playerList].sort((a, b) => {
    const ratingA = a.ratingFinal ?? 0;
    const ratingB = b.ratingFinal ?? 0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    return a.name.localeCompare(b.name, 'cs');
  });

  if (system === 'swiss') {
    return generateSwissPairings(sorted);
  }

  return generateRoundRobinPairings(sorted);
}

function generateRoundRobinPairings(sorted) {
  const list = [...sorted];
  if (list.length % 2 === 1) {
    list.push(null);
  }

  const half = list.length / 2;
  const pairings = [];

  for (let i = 0; i < half; i += 1) {
    const white = list[i];
    const black = list[list.length - 1 - i];

    if (!white && !black) {
      continue;
    }

    if (!white || !black) {
      const byePlayer = white || black;
      pairings.push({ byeId: byePlayer.id });
      continue;
    }

    pairings.push({ whiteId: white.id, blackId: black.id });
  }

  return pairings;
}

function generateSwissPairings(sorted) {
  const list = [...sorted];
  const pairings = [];

  if (list.length % 2 === 1) {
    const byePlayer = list.pop();
    if (byePlayer) {
      pairings.push({ byeId: byePlayer.id });
    }
  }

  const half = list.length / 2;
  for (let i = 0; i < half; i += 1) {
    const white = list[i];
    const black = list[i + half];
    if (!white || !black) {
      continue;
    }
    pairings.push({ whiteId: white.id, blackId: black.id });
  }

  return pairings;
}

function invalidateTournament(message) {
  if (!tournament) {
    return;
  }

  tournament = null;
  saveTournament(tournament);
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

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    return;
  }
  window.localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(data));
}

function findPlayer(id) {
  return players.find((player) => player.id === id);
}
