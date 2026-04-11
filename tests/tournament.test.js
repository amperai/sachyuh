import { generateSwissPairings } from '../tournament.js';
import { assert, assertEqual, test } from './harness.js';

function makePlayer(id, rating) {
  return { id, name: id.toUpperCase(), ratingFinal: rating };
}

function makeRound(round, pairings) {
  return { round, pairings };
}

function sortByRating(players) {
  return [...players].sort((a, b) => {
    const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  });
}

function getColorCounts(players, rounds) {
  const counts = {};
  players.forEach((player) => {
    counts[player.id] = { white: 0, black: 0 };
  });

  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId) {
        return;
      }
      counts[pairing.whiteId].white += 1;
      counts[pairing.blackId].black += 1;
    });
  });

  return counts;
}

function getLastColors(players, rounds) {
  const last = {};
  players.forEach((player) => {
    last[player.id] = null;
  });

  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId) {
        return;
      }
      last[pairing.whiteId] = 'white';
      last[pairing.blackId] = 'black';
    });
  });

  return last;
}

test('Švýcar: bez opakování defaultně', () => {
  const players = [makePlayer('a', 1600), makePlayer('b', 1500)];
  const rounds = [makeRound(1, [
    { whiteId: 'a', blackId: 'b', result: '1-0' }
  ])];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, false);
  assertEqual(result.reason, 'no_match');
});

test('Švýcar: opakování povoleno, když je potřeba', () => {
  const players = [makePlayer('a', 1600), makePlayer('b', 1500)];
  const rounds = [makeRound(1, [
    { whiteId: 'a', blackId: 'b', result: '1-0' }
  ])];

  const result = generateSwissPairings(players, rounds, { allowRematch: true });
  assertEqual(result.success, true);
  assertEqual(result.hasRematch, true);
  assertEqual(result.pairings.length, 1);

  const pairing = result.pairings[0];
  assert(pairing.whiteId && pairing.blackId, 'Chybí hráči v párování.');
  assert(
    (pairing.whiteId === 'a' && pairing.blackId === 'b')
      || (pairing.whiteId === 'b' && pairing.blackId === 'a'),
    'Párování neobsahuje očekávané hráče.'
  );
});

test('Švýcar: bye jde nejníže postavenému bez bye', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700),
    makePlayer('e', 1600)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'b', result: '1-0' },
      { whiteId: 'c', blackId: 'd', result: '1-0' },
      { byeId: 'e', result: 'bye' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { whiteId: 'b', blackId: 'e', result: '1-0' },
      { byeId: 'd', result: 'bye' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const bye = result.pairings.find((pairing) => pairing.byeId);
  assert(bye, 'Bye nebylo přiděleno.');
  assertEqual(bye.byeId, 'c');
});

test('Švýcar: bye nesmí být dvakrát', () => {
  const players = [
    makePlayer('a', 1500),
    makePlayer('b', 1400),
    makePlayer('c', 1300)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'b', blackId: 'c', result: '1-0' },
      { byeId: 'a', result: 'bye' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { byeId: 'b', result: 'bye' }
    ]),
    makeRound(3, [
      { whiteId: 'a', blackId: 'b', result: '1-0' },
      { byeId: 'c', result: 'bye' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, false);
  assertEqual(result.pairings.length, 0);
});

test('Švýcar: párování top half vs bottom half', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const result = generateSwissPairings(players, []);
  assertEqual(result.success, true);

  const sorted = sortByRating(players);
  const half = sorted.length / 2;
  const topIds = new Set(sorted.slice(0, half).map((player) => player.id));
  const bottomIds = new Set(sorted.slice(half).map((player) => player.id));

  result.pairings.forEach((pairing) => {
    if (pairing.byeId) {
      return;
    }
    const whiteTop = topIds.has(pairing.whiteId);
    const blackTop = topIds.has(pairing.blackId);
    assert(
      (whiteTop && bottomIds.has(pairing.blackId))
        || (blackTop && bottomIds.has(pairing.whiteId)),
      'Párování není mezi top a bottom half.'
    );
  });
});

test('Švýcar: barvy se neopakují, pokud je to možné', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'c', result: '0.5-0.5' },
      { whiteId: 'b', blackId: 'd', result: '0.5-0.5' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const lastColors = getLastColors(players, rounds);
  result.pairings.forEach((pairing) => {
    if (pairing.byeId) {
      return;
    }
    assert(lastColors[pairing.whiteId] !== 'white', 'Bílý opakuje barvu.');
    assert(lastColors[pairing.blackId] !== 'black', 'Černý opakuje barvu.');
  });
});

test('Švýcar: barevná bilance se drží v limitu', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'b', result: '1-0' },
      { whiteId: 'c', blackId: 'd', result: '1-0' }
    ]),
    makeRound(2, [
      { whiteId: 'd', blackId: 'a', result: '1-0' },
      { whiteId: 'b', blackId: 'c', result: '1-0' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const allRounds = [...rounds, makeRound(3, result.pairings)];
  const counts = getColorCounts(players, allRounds);

  players.forEach((player) => {
    const record = counts[player.id];
    assert(Math.abs(record.white - record.black) <= 1, 'Barvy jsou mimo limit.');
  });
});
