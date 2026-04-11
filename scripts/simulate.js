import { generateSwissPairings } from '../tournament.js';

const DRAW_RATES = [0, 5, 10, 15, 20, 25, 30];
const SAMPLE_SIZE = 200;
const RNG_SEED = 123456789;

const outputSummary = document.getElementById('outputSummary');
const outputCsv = document.getElementById('outputCsv');
const statusEl = document.getElementById('status');

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildPlayers(count) {
  const players = [];
  const base = 2400;
  const step = 10;
  for (let i = 0; i < count; i += 1) {
    players.push({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      ratingFinal: base - i * step
    });
  }
  return players;
}

function getRoundCount(playerCount) {
  if (playerCount <= 14) {
    return 7;
  }
  if (playerCount <= 18) {
    return 8;
  }
  return 9;
}

function randomResult(drawRate, rng) {
  const roll = rng();
  if (roll < drawRate) {
    return '0.5-0.5';
  }
  return rng() < 0.5 ? '1-0' : '0-1';
}

function initHistory(players) {
  const history = {};
  players.forEach((player) => {
    history[player.id] = {
      opponents: new Set(),
      white: 0,
      black: 0,
      hadBye: false
    };
  });
  return history;
}

function applyRound(history, round) {
  for (const pairing of round.pairings) {
    if (pairing.byeId) {
      const data = history[pairing.byeId];
      if (!data) {
        return 'unknown_player';
      }
      if (data.hadBye) {
        return 'bye_repeat';
      }
      data.hadBye = true;
      continue;
    }

    const white = history[pairing.whiteId];
    const black = history[pairing.blackId];
    if (!white || !black) {
      return 'unknown_player';
    }
    if (white.opponents.has(pairing.blackId) || black.opponents.has(pairing.whiteId)) {
      return 'rematch';
    }

    const nextWhite = white.white + 1;
    const nextBlack = white.black;
    if (Math.abs(nextWhite - nextBlack) > 1) {
      return 'color_balance';
    }

    const nextBlackWhite = black.white;
    const nextBlackBlack = black.black + 1;
    if (Math.abs(nextBlackWhite - nextBlackBlack) > 1) {
      return 'color_balance';
    }

    white.white = nextWhite;
    black.black = nextBlackBlack;
    white.opponents.add(pairing.blackId);
    black.opponents.add(pairing.whiteId);
  }

  return null;
}

function simulateTournament(playerCount, roundCount, drawRate, rng) {
  const players = buildPlayers(playerCount);
  const rounds = [];
  const history = initHistory(players);

  for (let round = 1; round <= roundCount; round += 1) {
    const result = generateSwissPairings(players, rounds, { allowRematch: false });
    if (!result.success) {
      return { success: false, reason: result.reason, round };
    }
    if (result.hasRematch) {
      return { success: false, reason: 'rule_violation', detail: 'rematch', round };
    }

    const pairings = result.pairings.map((pairing) => {
      if (pairing.byeId) {
        return { ...pairing, result: 'bye' };
      }
      return { ...pairing, result: randomResult(drawRate, rng) };
    });

    const roundData = { round, pairings };
    const violation = applyRound(history, roundData);
    if (violation) {
      return { success: false, reason: 'rule_violation', detail: violation, round };
    }
    rounds.push(roundData);
  }

  return { success: true };
}

function runSimulation() {
  const rng = makeRng(RNG_SEED);
  const csvLines = [
    'players,rounds,draw_rate_percent,samples,successes,failures,fail_no_match,fail_odd_group,fail_rule_violation'
  ];

  const summary = {
    scenarios: 0,
    scenariosWithFailures: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    failNoMatch: 0,
    failOddGroup: 0,
    failRuleViolation: 0,
    failureRounds: {},
    worstScenario: null
  };

  for (let players = 12; players <= 30; players += 1) {
    const rounds = getRoundCount(players);
    for (const drawRatePercent of DRAW_RATES) {
      const drawRate = drawRatePercent / 100;
      summary.scenarios += 1;

      let successes = 0;
      let failures = 0;
      let failNoMatch = 0;
      let failOddGroup = 0;
      let failRuleViolation = 0;

      for (let sample = 0; sample < SAMPLE_SIZE; sample += 1) {
        const result = simulateTournament(players, rounds, drawRate, rng);
        if (result.success) {
          successes += 1;
          continue;
        }
        failures += 1;
        summary.failureRounds[result.round] = (summary.failureRounds[result.round] || 0) + 1;
        if (result.reason === 'no_match') {
          failNoMatch += 1;
        } else if (result.reason === 'odd_group') {
          failOddGroup += 1;
        } else {
          failRuleViolation += 1;
        }
      }

      summary.totalFailures += failures;
      summary.totalSuccesses += successes;
      summary.failNoMatch += failNoMatch;
      summary.failOddGroup += failOddGroup;
      summary.failRuleViolation += failRuleViolation;
      if (failures > 0) {
        summary.scenariosWithFailures += 1;
      }

      if (!summary.worstScenario || failures > summary.worstScenario.failures) {
        summary.worstScenario = {
          players,
          rounds,
          drawRatePercent,
          failures,
          successes
        };
      }

      csvLines.push([
        players,
        rounds,
        drawRatePercent,
        SAMPLE_SIZE,
        successes,
        failures,
        failNoMatch,
        failOddGroup,
        failRuleViolation
      ].join(','));
    }
  }

  const failureRoundEntries = Object.keys(summary.failureRounds)
    .sort((a, b) => Number(a) - Number(b))
    .map((round) => `round_${round}=${summary.failureRounds[round]}`)
    .join(' ');
  const summaryLines = [
    `scenarios: ${summary.scenarios}`,
    `samples_per_scenario: ${SAMPLE_SIZE}`,
    `total_successes: ${summary.totalSuccesses}`,
    `total_failures: ${summary.totalFailures}`,
    `scenarios_with_failures: ${summary.scenariosWithFailures}`,
    `fail_no_match: ${summary.failNoMatch}`,
    `fail_odd_group: ${summary.failOddGroup}`,
    `fail_rule_violation: ${summary.failRuleViolation}`,
    `failure_rounds: ${failureRoundEntries || 'none'}`,
    summary.worstScenario
      ? `worst_scenario: players=${summary.worstScenario.players} rounds=${summary.worstScenario.rounds} draw_rate_percent=${summary.worstScenario.drawRatePercent} failures=${summary.worstScenario.failures}`
      : 'worst_scenario: none'
  ];

  outputSummary.textContent = summaryLines.join('\n');
  outputCsv.textContent = csvLines.join('\n');
  statusEl.textContent = 'Done';
  document.body.dataset.status = 'done';
}

runSimulation();
