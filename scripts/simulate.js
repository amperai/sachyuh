import { generateSwissPairings } from '../tournament.js';

const DRAW_RATES = [0, 5, 10, 15, 20, 25, 30];
const DEFAULT_SAMPLE_SIZE = 200;
const RNG_SEED = 123456789;

const isBrowser = typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const outputSummary = isBrowser ? document.getElementById('outputSummary') : null;
const outputCsv = isBrowser ? document.getElementById('outputCsv') : null;
const statusEl = isBrowser ? document.getElementById('status') : null;

function resolveSampleSize() {
  if (isBrowser && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const value = Number.parseInt(params.get('samples'), 10);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return DEFAULT_SAMPLE_SIZE;
}

const SAMPLE_SIZE = resolveSampleSize();

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
  let colorImbalance = 0;

  for (const pairing of round.pairings) {
    if (pairing.byeId) {
      const data = history[pairing.byeId];
      if (!data) {
        return { violation: 'unknown_player', colorImbalance };
      }
      if (data.hadBye) {
        return { violation: 'bye_repeat', colorImbalance };
      }
      data.hadBye = true;
      continue;
    }

    const white = history[pairing.whiteId];
    const black = history[pairing.blackId];
    if (!white || !black) {
      return { violation: 'unknown_player', colorImbalance };
    }
    if (white.opponents.has(pairing.blackId) || black.opponents.has(pairing.whiteId)) {
      return { violation: 'rematch', colorImbalance };
    }

    const nextWhite = white.white + 1;
    const nextBlack = white.black;
    const nextBlackWhite = black.white;
    const nextBlackBlack = black.black + 1;

    white.white = nextWhite;
    black.black = nextBlackBlack;
    white.opponents.add(pairing.blackId);
    black.opponents.add(pairing.whiteId);

    if (Math.abs(nextWhite - nextBlack) > 1) {
      colorImbalance += 1;
    }
    if (Math.abs(nextBlackWhite - nextBlackBlack) > 1) {
      colorImbalance += 1;
    }
  }

  return { violation: null, colorImbalance };
}

function simulateTournament(playerCount, roundCount, drawRate, rng) {
  const players = buildPlayers(playerCount);
  const rounds = [];
  const history = initHistory(players);
  let colorImbalanceEvents = 0;

  for (let round = 1; round <= roundCount; round += 1) {
    const result = generateSwissPairings(players, rounds, { allowRematch: false });
    if (!result.success) {
      return { success: false, reason: result.reason, round, colorImbalanceEvents };
    }
    if (result.hasRematch) {
      return { success: false, reason: 'rule_violation', detail: 'rematch', round, colorImbalanceEvents };
    }

    const pairings = result.pairings.map((pairing) => {
      if (pairing.byeId) {
        return { ...pairing, result: 'bye' };
      }
      return { ...pairing, result: randomResult(drawRate, rng) };
    });

    const roundData = { round, pairings };
    const outcome = applyRound(history, roundData);
    colorImbalanceEvents += outcome.colorImbalance;
    if (outcome.violation) {
      return {
        success: false,
        reason: 'rule_violation',
        detail: outcome.violation,
        round,
        colorImbalanceEvents
      };
    }
    rounds.push(roundData);
  }

  return { success: true, colorImbalanceEvents };
}

async function runSimulation() {
  const rng = makeRng(RNG_SEED);
  const csvLines = [
    'players,rounds,draw_rate_percent,samples,successes,failures,fail_no_match,fail_odd_group,fail_rule_violation,color_imbalance_tournaments,color_imbalance_events'
  ];

  const summary = {
    scenarios: 0,
    scenariosWithFailures: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    failNoMatch: 0,
    failOddGroup: 0,
    failRuleViolation: 0,
    colorImbalanceTournaments: 0,
    colorImbalanceEvents: 0,
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
      let colorImbalanceTournaments = 0;
      let colorImbalanceEvents = 0;

      for (let sample = 0; sample < SAMPLE_SIZE; sample += 1) {
        const result = simulateTournament(players, rounds, drawRate, rng);
        colorImbalanceEvents += result.colorImbalanceEvents || 0;
        if (result.colorImbalanceEvents > 0) {
          colorImbalanceTournaments += 1;
        }
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
      summary.colorImbalanceTournaments += colorImbalanceTournaments;
      summary.colorImbalanceEvents += colorImbalanceEvents;
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
        failRuleViolation,
        colorImbalanceTournaments,
        colorImbalanceEvents
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
    `color_imbalance_tournaments: ${summary.colorImbalanceTournaments}`,
    `color_imbalance_events: ${summary.colorImbalanceEvents}`,
    `failure_rounds: ${failureRoundEntries || 'none'}`,
    summary.worstScenario
      ? `worst_scenario: players=${summary.worstScenario.players} rounds=${summary.worstScenario.rounds} draw_rate_percent=${summary.worstScenario.drawRatePercent} failures=${summary.worstScenario.failures}`
      : 'worst_scenario: none'
  ];

  const summaryText = summaryLines.join('\n');
  const csvText = csvLines.join('\n');

  if (outputSummary) {
    outputSummary.textContent = summaryText;
  }
  if (outputCsv) {
    outputCsv.textContent = csvText;
  }
  if (statusEl) {
    statusEl.textContent = 'Done';
  }
  if (isBrowser && document.body) {
    document.body.dataset.status = 'done';
  }
  if (isNode) {
    const fs = await import('fs/promises');
    const summaryPath = new URL('../reports/simulation-summary.txt', import.meta.url);
    const csvPath = new URL('../reports/simulation-summary.csv', import.meta.url);
    await fs.writeFile(summaryPath, summaryText, { encoding: 'ascii' });
    await fs.writeFile(csvPath, csvText, { encoding: 'ascii' });
    console.log(summaryText);
  }
}

void runSimulation();
