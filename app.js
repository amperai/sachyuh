import {
  CATEGORY_LABELS,
  PROVIDER_LABELS,
  STATUS_LABELS,
  fetchChessComRating,
  fetchLichessRating
} from './ratings.js';

const form = document.getElementById('registration-form');
const nameInput = document.getElementById('playerName');
const handleInput = document.getElementById('accountHandle');
const providerInputs = Array.from(document.querySelectorAll('input[name="provider"]'));
const statusEl = document.getElementById('formStatus');
const accountHelp = document.getElementById('accountHelp');
const playersBody = document.getElementById('playersBody');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('btnClear');
const submitBtn = document.getElementById('submitBtn');

const STORAGE_KEY = 'turnaj-koruna-registrations-v1';

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
renderPlayers();
updateProviderUI(getSelectedProvider());

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

  const entry = {
    id: createId(),
    name,
    provider,
    username: provider === 'none' ? '' : username,
    rating: result.rating,
    category: result.category,
    status: result.status,
    createdAt: new Date().toISOString()
  };

  players = [entry, ...players];
  savePlayers(players);
  renderPlayers();
  setStatus(buildStatusMessage(entry));

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

function buildStatusMessage(entry) {
  if (entry.status === 'ok') {
    const category = entry.category ? CATEGORY_LABELS[entry.category] : '';
    return `Rating ${entry.rating}${category ? ` (${category})` : ''} byl načten.`;
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

function renderPlayers() {
  playersBody.textContent = '';
  emptyState.hidden = players.length > 0;
  clearBtn.disabled = players.length === 0;

  for (const player of players) {
    const row = document.createElement('tr');

    row.appendChild(createCell(player.name));
    row.appendChild(createCell(PROVIDER_LABELS[player.provider] || player.provider));
    row.appendChild(createCell(player.username || '-'));
    row.appendChild(createCell(String(player.rating ?? 0)));
    row.appendChild(createCell(player.category ? CATEGORY_LABELS[player.category] : '-'));

    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    const className = statusClassMap[player.status] || 'error';

    status.className = `status ${className}`;
    status.textContent = STATUS_LABELS[player.status] || player.status;
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    playersBody.appendChild(row);
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

function loadPlayers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function savePlayers(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
