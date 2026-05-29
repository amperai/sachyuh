// turnaj_meta.js – správa metadat turnaje jako celku (tabulka `tournaments`)
// Funguje s oběma backendy (JS i Rust) přes /api/tournaments.

const TOURNAMENTS_API = window.SACHYUH_TOURNAMENTS_API || '/api/tournaments';

const form = document.getElementById('tournamentMetaForm');
const nameInput = document.getElementById('metaName');
const descInput = document.getElementById('metaDesc');
const statusEl = document.getElementById('metaStatus');
const metaList = document.getElementById('metaList');
const metaSection = document.getElementById('tournamentMeta');

// Zobraz sekci v admin panelu jen když je přihlášen rozhodčí
function checkAndShowMeta() {
  const isAdmin = sessionStorage.getItem('turnaj-koruna-referee') === '1';
  if (metaSection) metaSection.hidden = !isAdmin;
}

// Načti a zobraz turnaje
async function loadTournaments() {
  try {
    const res = await fetch(TOURNAMENTS_API);
    if (!res.ok) return;
    const list = await res.json();
    renderTournamentList(list);
  } catch {
    // API nemusí být dostupné (JS backend bez nové tabulky)
  }
}

function renderTournamentList(list) {
  if (!metaList) return;
  if (!list || list.length === 0) {
    metaList.innerHTML = '<p class="empty">Žádné turnaje v databázi.</p>';
    return;
  }
  const rows = list.map(t => `
    <tr>
      <td>${escHtml(t.name)}</td>
      <td>${escHtml(t.description || '–')}</td>
      <td><small>${new Date(t.created_at).toLocaleDateString('cs-CZ')}</small></td>
    </tr>
  `).join('');
  metaList.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.9em">
      <thead><tr>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #ddd">Název</th>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #ddd">Popis</th>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #ddd">Datum</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput?.value.trim();
    if (!name) {
      if (statusEl) statusEl.textContent = 'Zadejte název turnaje.';
      return;
    }
    try {
      const res = await fetch(TOURNAMENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: descInput?.value.trim() || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (statusEl) statusEl.textContent = 'Turnaj uložen.';
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      await loadTournaments();
    } catch (err) {
      if (statusEl) statusEl.textContent = `Chyba: ${err.message}`;
    }
  });
}

// Reaguj na přihlášení/odhlášení rozhodčího (každou vteřinu)
setInterval(checkAndShowMeta, 1000);
checkAndShowMeta();
loadTournaments();
