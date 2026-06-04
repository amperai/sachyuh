import { generateSwissPairings, getSwissRoundLimit } from '../tournament.js';
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

test('Švýcar: bez opakování defaultne', () => {
  const players = [makePlayer('a', 1600), makePlayer('b', 1500)];
  const rounds = [makeRound(1, [
    { whiteId: 'a', blackId: 'b', result: '1-0' }
  ])];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, false);
  assertEqual(result.reason, 'no_match');
});

test('Švýcar: opakování povoleno, když je potreba', () => {
  const players = [makePlayer('a', 1600), makePlayer('b', 1500)];
  const rounds = [makeRound(1, [
    { whiteId: 'a', blackId: 'b', result: '1-0' }
  ])];

  const result = generateSwissPairings(players, rounds, { allowRematch: true });
  assertEqual(result.success, true);
  assertEqual(result.hasRematch, true);
  assertEqual(result.pairings.length, 1);

  const pairing = result.pairings[0];
  assert(pairing.whiteId && pairing.blackId, 'Chybí hráci v párování.');
  assert(
    (pairing.whiteId === 'a' && pairing.blackId === 'b')
      || (pairing.whiteId === 'b' && pairing.blackId === 'a'),
    'Párování neobsahuje ocekávané hráce.'
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
  assert(bye, 'Bye nebylo prideleno.');
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

test('Svicar: top hrac bere nejblizsi bodoveho soupere', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'd', result: '1-0' },
      { whiteId: 'b', blackId: 'c', result: '0.5-0.5' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { whiteId: 'b', blackId: 'd', result: '1-0' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const pairing = result.pairings.find((item) => (
    (item.whiteId === 'a' && item.blackId === 'b')
      || (item.whiteId === 'b' && item.blackId === 'a')
  ));
  assert(pairing, 'Missing pairing for A vs B.');
});

test('Svicar: bez opakovani preskoci do vzdalenjsi skupiny', () => {
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
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { whiteId: 'b', blackId: 'd', result: '1-0' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const pairing = result.pairings.find((item) => (
    (item.whiteId === 'a' && item.blackId === 'd')
      || (item.whiteId === 'd' && item.blackId === 'a')
  ));
  assert(pairing, 'Expected A vs D to avoid rematch.');
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
    assert(lastColors[pairing.blackId] !== 'black', 'Cerný opakuje barvu.');
  });
});

test('Svicar: barevna bilance se preferuje', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { whiteId: 'd', blackId: 'b', result: '1-0' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'd', result: '1-0' },
      { whiteId: 'c', blackId: 'b', result: '1-0' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const pairing = result.pairings.find((item) => (
    (item.whiteId === 'a' && item.blackId === 'b')
      || (item.whiteId === 'b' && item.blackId === 'a')
  ));
  assert(pairing, 'Missing pairing for A vs B.');
  assertEqual(pairing.whiteId, 'b');
});

test('Svicar: barevna bilance neblokuje', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'c', result: '1-0' },
      { whiteId: 'b', blackId: 'd', result: '1-0' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'd', result: '1-0' },
      { whiteId: 'b', blackId: 'c', result: '1-0' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const allRounds = [...rounds, makeRound(3, result.pairings)];
  const counts = getColorCounts(players, allRounds);
  const hasImbalance = players.some((player) => {
    const record = counts[player.id];
    return Math.abs(record.white - record.black) > 1;
  });

  assert(hasImbalance, 'Expected color imbalance when no balanced pairing exists.');
});



test('Swiss: round limit is half rounded up', () => {
  assertEqual(getSwissRoundLimit(0), 0);
  assertEqual(getSwissRoundLimit(1), 1);
  assertEqual(getSwissRoundLimit(2), 1);
  assertEqual(getSwissRoundLimit(3), 2);
  assertEqual(getSwissRoundLimit(12), 6);
  assertEqual(getSwissRoundLimit(13), 7);
});


test('Svicar: skupina pari top half vs bottom half', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700),
    makePlayer('e', 1600),
    makePlayer('f', 1500)
  ];

  const result = generateSwissPairings(players, []);
  assertEqual(result.success, true);

  const pairs = result.pairings
    .filter((pairing) => !pairing.byeId)
    .map((pairing) => [pairing.whiteId, pairing.blackId].sort().join('-'));

  const expected = ['a-d', 'b-e', 'c-f'];
  expected.forEach((pair) => {
    assert(pairs.includes(pair), 'Chybi parovani ' + pair + '.');
  });
});


test('Svicar: merge scoregroup kdyz nejde parovat', () => {
  const players = [
    makePlayer('a', 2000),
    makePlayer('b', 1900),
    makePlayer('c', 1800),
    makePlayer('d', 1700),
    makePlayer('e', 1600),
    makePlayer('f', 1500),
    makePlayer('g', 1400),
    makePlayer('h', 1300)
  ];

  const rounds = [
    makeRound(1, [
      { whiteId: 'a', blackId: 'b', result: '0.5-0.5' },
      { whiteId: 'c', blackId: 'd', result: '0.5-0.5' }
    ]),
    makeRound(2, [
      { whiteId: 'a', blackId: 'c', result: '0.5-0.5' },
      { whiteId: 'b', blackId: 'd', result: '0.5-0.5' }
    ]),
    makeRound(3, [
      { whiteId: 'a', blackId: 'd', result: '0.5-0.5' },
      { whiteId: 'b', blackId: 'c', result: '0.5-0.5' }
    ])
  ];

  const result = generateSwissPairings(players, rounds);
  assertEqual(result.success, true);

  const top = new Set(['a', 'b', 'c', 'd']);
  const bottom = new Set(['e', 'f', 'g', 'h']);
  const pairs = result.pairings.filter((pairing) => !pairing.byeId);

  assertEqual(pairs.length, 4);
  pairs.forEach((pairing) => {
    const isTopTop = top.has(pairing.whiteId) && top.has(pairing.blackId);
    const isBottomBottom = bottom.has(pairing.whiteId) && bottom.has(pairing.blackId);
    assert(!isTopTop, 'Top scoregroup should not pair internally.');
    assert(!isBottomBottom, 'Lower scoregroup should not pair internally.');
  });
});


