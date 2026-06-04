import {
  chessComRatingsFromStats,
  convertToTournamentRating,
  fetchChessComRating,
  fetchLichessRating,
  getMaxRating,
  interpolatePairs,
  lichessRatingsFromHistory,
  resultFromHttpStatus,
  resultFromRatings
} from '../ratings.js';
import { assert, assertClose, assertEqual, test } from './harness.js';

function createOkFetch(payload) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => payload
  });
}

function createStatusFetch(status) {
  return async () => ({
    ok: false,
    status,
    json: async () => ({})
  });
}

test('interpolatePairs: lineární interpolace', () => {
  const pairs = [
    [1000, 1230],
    [1100, 1320]
  ];
  const value = interpolatePairs(pairs, 1050);
  assertClose(value, 1275);
});

test('konverze: chess.com rapid -> blitz', () => {
  const value = convertToTournamentRating({
    provider: 'chess.com',
    category: 'rapid',
    rating: 1230
  });
  assertEqual(value, 1000);
});

test('konverze: lichess blitz -> blitz', () => {
  const value = convertToTournamentRating({
    provider: 'lichess',
    category: 'blitz',
    rating: 1200
  });
  assertEqual(value, 800);
});

test('konverze: lichess correspondence -> rapid', () => {
  const value = convertToTournamentRating({
    provider: 'lichess',
    category: 'correspondence',
    rating: 1615
  });
  assertEqual(value, 1000);
});

test('chess.com: vybere nejvyšší rating', () => {
  const stats = {
    chess_blitz: { best: { rating: 1820 } },
    chess_rapid: { best: { rating: 1700 } },
    chess_daily: { best: { rating: 1600 } }
  };

  const ratings = chessComRatingsFromStats(stats);
  assertEqual(ratings.blitz, 1820);
  assertEqual(ratings.rapid, 1700);
  assertEqual(ratings.daily, 1600);

  const max = getMaxRating(ratings);
  assertEqual(max.rating, 1820);
  assertEqual(max.category, 'blitz');
});

test('chess.com: fallback na last, když best chybí', () => {
  const stats = {
    chess_blitz: { last: { rating: 1444 } }
  };

  const ratings = chessComRatingsFromStats(stats);
  assertEqual(ratings.blitz, 1444);
});

test('chess.com: bez ratingu -> no_rating', () => {
  const stats = {};
  const result = resultFromRatings(chessComRatingsFromStats(stats), 'chess.com');
  assertEqual(result.status, 'no_rating');
  assertEqual(result.rating, 0);
});

test('lichess: vybere nejvyšší rating z historie', () => {
  const history = [
    { name: 'Blitz', points: [[2024, 1, 1, 1910], [2024, 1, 2, 1950]] },
    { name: 'Rapid', points: [[2024, 1, 1, 2050]] },
    { name: 'Correspondence', points: [[2024, 1, 1, 1600]] }
  ];

  const ratings = lichessRatingsFromHistory(history);
  assertEqual(ratings.blitz, 1950);
  assertEqual(ratings.rapid, 2050);
  assertEqual(ratings.correspondence, 1600);

  const max = getMaxRating(ratings);
  assertEqual(max.rating, 2050);
  assertEqual(max.category, 'rapid');
});

test('lichess: rozpozná objekt s value polem', () => {
  const history = {
    value: [
      { name: 'Rapid', points: [[2024, 3, 2, 1888]] }
    ]
  };

  const ratings = lichessRatingsFromHistory(history);
  assertEqual(ratings.rapid, 1888);
});

test('lichess: bez ratingu -> no_rating', () => {
  const history = [
    { name: 'Rapid', points: [] }
  ];

  const result = resultFromRatings(lichessRatingsFromHistory(history), 'lichess');
  assertEqual(result.status, 'no_rating');
  assertEqual(result.rating, 0);
});

test('http status 404 -> not_found', () => {
  const result = resultFromHttpStatus(404, 'chess.com');
  assertEqual(result.status, 'not_found');
  assertEqual(result.rating, 0);
});

test('fetchChessComRating: 404 -> not_found', async () => {
  const result = await fetchChessComRating('ghost', createStatusFetch(404));
  assertEqual(result.status, 'not_found');
  assertEqual(result.rating, 0);
});

test('fetchLichessRating: ok -> rating', async () => {
  const history = [
    { name: 'Blitz', points: [[2024, 1, 1, 1700]] }
  ];

  const result = await fetchLichessRating('oselposel', createOkFetch(history));
  assertEqual(result.status, 'ok');
  assertEqual(result.rating, 1700);
  assertEqual(result.category, 'blitz');
});
