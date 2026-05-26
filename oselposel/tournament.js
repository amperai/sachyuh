export function scoreFromResult(result) {
  if (result === '1-0') {
    return [1, 0];
  }
  if (result === '0-1') {
    return [0, 1];
  }
  if (result === '0.5-0.5') {
    return [0.5, 0.5];
  }
  return [0, 0];
}

export function getScoreMap(playerList, rounds) {
  const scores = {};
  playerList.forEach((player) => {
    scores[player.id] = 0;
  });

  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId) {
        scores[pairing.byeId] = (scores[pairing.byeId] || 0) + 1;
        return;
      }

      if (!pairing.result) {
        return;
      }

      const [whiteScore, blackScore] = scoreFromResult(pairing.result);
      scores[pairing.whiteId] = (scores[pairing.whiteId] || 0) + whiteScore;
      scores[pairing.blackId] = (scores[pairing.blackId] || 0) + blackScore;
    });
  });

  return scores;
}

export function getStandings(playerList, rounds) {
  const scores = getScoreMap(playerList, rounds);
  return playerList.map((player) => ({
    ...player,
    points: scores[player.id] || 0
  })).sort((a, b) => {
    const diff = (b.points || 0) - (a.points || 0);
    if (diff !== 0) {
      return diff;
    }
    const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  });
}

export function createRoundRobinSchedule(playerList) {
  const order = [...playerList].sort((a, b) => {
    const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  }).map((player) => player.id);

  if (order.length % 2 === 1) {
    order.push(null);
  }

  const rounds = [];
  const list = [...order];
  const totalRounds = list.length - 1;
  const half = list.length / 2;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const pairings = [];

    for (let i = 0; i < half; i += 1) {
      const first = list[i];
      const second = list[list.length - 1 - i];

      if (!first && !second) {
        continue;
      }

      if (!first || !second) {
        const byeId = first || second;
        pairings.push({ byeId, result: 'bye' });
        continue;
      }

      const isEvenRound = roundIndex % 2 === 0;
      const whiteId = isEvenRound ? first : second;
      const blackId = isEvenRound ? second : first;

      pairings.push({ whiteId, blackId, result: null });
    }

    rounds.push({ round: roundIndex + 1, pairings });

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }

  return rounds;
}

function buildHistory(playerList, rounds) {
  const history = {};
  playerList.forEach((player) => {
    history[player.id] = {
      opponents: new Set(),
      white: 0,
      black: 0,
      lastColor: null,
      hadBye: false
    };
  });

  rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.byeId) {
        if (history[pairing.byeId]) {
          history[pairing.byeId].hadBye = true;
        }
        return;
      }

      const white = history[pairing.whiteId];
      const black = history[pairing.blackId];
      if (white && black) {
        white.white += 1;
        black.black += 1;
        white.lastColor = 'white';
        black.lastColor = 'black';
        white.opponents.add(pairing.blackId);
        black.opponents.add(pairing.whiteId);
      }
    });
  });

  return history;
}

function selectByePlayer(playerList, rounds, history) {
  if (playerList.length % 2 === 0) {
    return null;
  }

  const scores = getScoreMap(playerList, rounds);
  const eligible = playerList.filter((player) => !history[player.id]?.hadBye);
  if (!eligible.length) {
    return null;
  }

  eligible.sort((a, b) => {
    const scoreDiff = (scores[a.id] || 0) - (scores[b.id] || 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const ratingDiff = (a.ratingFinal ?? 0) - (b.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  });

  return eligible[0];
}

function groupByScore(playerList, rounds) {
  const scores = getScoreMap(playerList, rounds);
  const sorted = [...playerList].sort((a, b) => {
    const scoreDiff = (scores[b.id] || 0) - (scores[a.id] || 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  });

  const groups = [];
  sorted.forEach((player) => {
    const score = scores[player.id] || 0;
    const current = groups[groups.length - 1];
    if (!current || current.score !== score) {
      groups.push({ score, players: [player] });
    } else {
      current.players.push(player);
    }
  });

  return groups;
}

function sortPlayersByScore(playerList, scores) {
  return [...playerList].sort((a, b) => {
    const scoreDiff = (scores[b.id] || 0) - (scores[a.id] || 0);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }
    return a.name.localeCompare(b.name, 'cs');
  });
}

function getScoreDiff(scores, playerA, playerB) {
  return Math.abs((scores[playerA.id] || 0) - (scores[playerB.id] || 0));
}

function hasPlayed(history, playerId, opponentId) {
  return history[playerId]?.opponents.has(opponentId);
}

const COLOR_OVERLIMIT_WEIGHT = 100;
const REPEAT_COLOR_WEIGHT = 10;

function colorDiffAfter(data, color) {
  const nextWhite = data.white + (color === 'white' ? 1 : 0);
  const nextBlack = data.black + (color === 'black' ? 1 : 0);
  return Math.abs(nextWhite - nextBlack);
}

function pickColorAssignment(history, playerA, playerB) {
  const options = [
    { whiteId: playerA.id, blackId: playerB.id },
    { whiteId: playerB.id, blackId: playerA.id }
  ];

  const scored = options.map((option) => {
    const whiteData = history[option.whiteId];
    const blackData = history[option.blackId];
    if (!whiteData || !blackData) {
      return null;
    }

    const repeatPenalty = (whiteData.lastColor === 'white' ? 1 : 0)
      + (blackData.lastColor === 'black' ? 1 : 0);
    const whiteDiff = colorDiffAfter(whiteData, 'white');
    const blackDiff = colorDiffAfter(blackData, 'black');
    const overLimitPenalty = Math.max(0, whiteDiff - 1) + Math.max(0, blackDiff - 1);
    const balancePenalty = whiteDiff + blackDiff;
    const colorPenalty = overLimitPenalty * COLOR_OVERLIMIT_WEIGHT + balancePenalty;
    return {
      option,
      repeatPenalty,
      balancePenalty,
      overLimitPenalty,
      colorPenalty
    };
  }).filter(Boolean);

  if (!scored.length) {
    return null;
  }

  scored.sort((a, b) => {
    if (a.overLimitPenalty !== b.overLimitPenalty) {
      return a.overLimitPenalty - b.overLimitPenalty;
    }
    if (a.repeatPenalty !== b.repeatPenalty) {
      return a.repeatPenalty - b.repeatPenalty;
    }
    return a.balancePenalty - b.balancePenalty;
  });

  return scored[0];
}

function applyPairingUpdate(history, pairing) {
  const whiteData = history[pairing.whiteId];
  const blackData = history[pairing.blackId];
  const snapshot = {
    whiteId: pairing.whiteId,
    blackId: pairing.blackId,
    white: { white: whiteData.white, black: whiteData.black, lastColor: whiteData.lastColor },
    black: { white: blackData.white, black: blackData.black, lastColor: blackData.lastColor },
    whiteAdded: !whiteData.opponents.has(pairing.blackId),
    blackAdded: !blackData.opponents.has(pairing.whiteId)
  };

  whiteData.white += 1;
  blackData.black += 1;
  whiteData.lastColor = 'white';
  blackData.lastColor = 'black';
  whiteData.opponents.add(pairing.blackId);
  blackData.opponents.add(pairing.whiteId);

  return snapshot;
}

function revertPairingUpdate(history, snapshot) {
  const whiteData = history[snapshot.whiteId];
  const blackData = history[snapshot.blackId];
  whiteData.white = snapshot.white.white;
  whiteData.black = snapshot.white.black;
  whiteData.lastColor = snapshot.white.lastColor;
  blackData.white = snapshot.black.white;
  blackData.black = snapshot.black.black;
  blackData.lastColor = snapshot.black.lastColor;
  if (snapshot.whiteAdded) {
    whiteData.opponents.delete(snapshot.blackId);
  }
  if (snapshot.blackAdded) {
    blackData.opponents.delete(snapshot.whiteId);
  }
}

function buildCandidateList(player, remaining, history, scores, allowRematch) {
  const candidates = [];

  for (const opponent of remaining) {
    if (opponent.id === player.id) {
      continue;
    }
    const isRematch = hasPlayed(history, player.id, opponent.id);
    if (!allowRematch && isRematch) {
      continue;
    }

    const picked = pickColorAssignment(history, player, opponent);
    if (!picked) {
      continue;
    }

    candidates.push({
      opponent,
      pairing: { ...picked.option, result: null },
      scoreDiff: getScoreDiff(scores, player, opponent),
      rematch: isRematch ? 1 : 0,
      overLimitPenalty: picked.overLimitPenalty,
      repeatPenalty: picked.repeatPenalty,
      balancePenalty: picked.balancePenalty,
      ratingDiff: Math.abs((player.ratingFinal ?? 0) - (opponent.ratingFinal ?? 0))
    });
  }

  candidates.sort((a, b) => {
    if (a.rematch !== b.rematch) {
      return a.rematch - b.rematch;
    }
    if (a.scoreDiff !== b.scoreDiff) {
      return a.scoreDiff - b.scoreDiff;
    }
    if (a.overLimitPenalty !== b.overLimitPenalty) {
      return a.overLimitPenalty - b.overLimitPenalty;
    }
    if (a.repeatPenalty !== b.repeatPenalty) {
      return a.repeatPenalty - b.repeatPenalty;
    }
    if (a.balancePenalty !== b.balancePenalty) {
      return a.balancePenalty - b.balancePenalty;
    }
    if (a.ratingDiff !== b.ratingDiff) {
      return a.ratingDiff - b.ratingDiff;
    }
    return a.opponent.name.localeCompare(b.opponent.name, 'cs');
  });

  return candidates;
}

function tryDirectPairing(top, bottom, history, allowRematch) {
  const pairings = [];

  for (let i = 0; i < top.length; i += 1) {
    const player = top[i];
    const opponent = bottom[i];
    if (!player || !opponent) {
      return null;
    }
    if (!allowRematch && hasPlayed(history, player.id, opponent.id)) {
      return null;
    }
    const picked = pickColorAssignment(history, player, opponent);
    if (!picked) {
      return null;
    }
    pairings.push({ ...picked.option, result: null });
  }

  return pairings;
}

function findSwissPairings(ordered, history, scores, allowRematch) {
  if (!ordered.length) {
    return [];
  }

  const player = ordered[0];
  const remaining = ordered.slice(1);
  const candidates = buildCandidateList(player, remaining, history, scores, allowRematch);

  for (const candidate of candidates) {
    const nextRemaining = remaining.filter((item) => item.id !== candidate.opponent.id);
    const snapshot = applyPairingUpdate(history, candidate.pairing);
    const nextPairings = findSwissPairings(nextRemaining, history, scores, allowRematch);
    revertPairingUpdate(history, snapshot);
    if (nextPairings) {
      return [candidate.pairing, ...nextPairings];
    }
  }

  return null;
}

function matchGroup(top, bottom, history, allowRematch) {
  const REMATCH_WEIGHT = 100;
  const size = top.length;
  const matrix = top.map((player) => bottom.map((candidate) => {
    const isRematch = hasPlayed(history, player.id, candidate.id);
    if (!allowRematch && isRematch) {
      return null;
    }
    const picked = pickColorAssignment(history, player, candidate);
    if (!picked) {
      return null;
    }
    const score = picked.colorPenalty
      + picked.repeatPenalty * REPEAT_COLOR_WEIGHT
      + (isRematch ? REMATCH_WEIGHT : 0);
    return {
      pairing: { ...picked.option, result: null },
      score
    };
  }));

  const memo = new Map();

  function dfs(index, usedMask) {
    if (index >= size) {
      return { score: 0, pairs: [] };
    }
    const key = `${index}|${usedMask}`;
    if (memo.has(key)) {
      return memo.get(key);
    }

    let best = null;
    for (let j = 0; j < size; j += 1) {
      if (usedMask & (1 << j)) {
        continue;
      }
      const candidate = matrix[index][j];
      if (!candidate) {
        continue;
      }
      const next = dfs(index + 1, usedMask | (1 << j));
      if (!next) {
        continue;
      }
      const totalScore = candidate.score + next.score;
      if (!best || totalScore < best.score) {
        best = { score: totalScore, pairs: [candidate.pairing, ...next.pairs] };
      }
    }

    memo.set(key, best);
    return best;
  }

  const result = dfs(0, 0);
  return result ? result.pairs : null;
}

function buildExchangeSplit(players, exchangeCount) {
  const half = players.length / 2;
  if (!exchangeCount) {
    return { top: players.slice(0, half), bottom: players.slice(half) };
  }

  const topBase = players.slice(0, half - exchangeCount);
  const topExchange = players.slice(half, half + exchangeCount);
  const bottomExchange = players.slice(half - exchangeCount, half);
  const bottomBase = players.slice(half + exchangeCount);
  return {
    top: [...topBase, ...topExchange],
    bottom: [...bottomExchange, ...bottomBase]
  };
}

function pairGroup(players, history, allowRematch) {
  if (!players.length) {
    return [];
  }
  if (players.length % 2 !== 0) {
    return null;
  }

  const half = players.length / 2;
  for (let exchangeCount = 0; exchangeCount <= half; exchangeCount += 1) {
    const { top, bottom } = buildExchangeSplit(players, exchangeCount);
    if (exchangeCount === 0) {
      const direct = tryDirectPairing(top, bottom, history, allowRematch);
      if (direct) {
        return direct;
      }
    }
    const pairs = matchGroup(top, bottom, history, allowRematch);
    if (pairs) {
      return pairs;
    }
  }

  return null;
}

function buildGroupOptions(players, history, allowRematch) {
  if (!players.length) {
    return [{ pairings: [], carry: [] }];
  }

  const total = players.length;
  const options = [];
  const minCarry = total % 2 === 0 ? 0 : 1;

  for (let carryCount = minCarry; carryCount <= total; carryCount += 1) {
    const remainingCount = total - carryCount;
    if (remainingCount === 0) {
      options.push({ pairings: [], carry: players.slice(-carryCount) });
      continue;
    }
    if (remainingCount % 2 !== 0) {
      continue;
    }

    const remaining = players.slice(0, remainingCount);
    const carry = players.slice(remainingCount);
    const pairings = pairGroup(remaining, history, allowRematch);
    if (pairings) {
      options.push({ pairings, carry });
    }
  }

  return options;
}

function pairScoreGroups(groups, history, allowRematch) {
  const totalPlayers = groups.reduce((sum, group) => sum + group.players.length, 0);

  function dfs(index, carry) {
    if (index >= groups.length) {
      if (!carry.length) {
        return { pairings: [] };
      }
      const reason = totalPlayers % 2 === 1 ? 'odd_group' : 'no_match';
      return { pairings: null, reason };
    }

    const basePlayers = carry
      ? [...carry, ...groups[index].players]
      : [...groups[index].players];
    const options = buildGroupOptions(basePlayers, history, allowRematch);
    let fallbackReason = 'no_match';

    for (const option of options) {
      const next = dfs(index + 1, option.carry);
      if (next.pairings) {
        return { pairings: [...option.pairings, ...next.pairings] };
      }
      if (next.reason === 'odd_group') {
        fallbackReason = 'odd_group';
      }
    }

    return { pairings: null, reason: fallbackReason };
  }

  return dfs(0, []);
}

function isRematchPair(history, pairing) {
  return hasPlayed(history, pairing.whiteId, pairing.blackId);
}

export function generateSwissPairings(playerList, rounds, options = {}) {
  const allowRematch = options.allowRematch === true;
  const history = buildHistory(playerList, rounds);
  const byePlayer = selectByePlayer(playerList, rounds, history);

  const pool = byePlayer
    ? playerList.filter((player) => player.id !== byePlayer.id)
    : [...playerList];

  const groups = groupByScore(pool, rounds);
  const grouped = pairScoreGroups(groups, history, allowRematch);

  if (!grouped.pairings) {
    return { success: false, pairings: [], reason: grouped.reason || 'no_match' };
  }

  const pairings = grouped.pairings;

  if (byePlayer) {
    pairings.push({ byeId: byePlayer.id, result: 'bye' });
  }

  const hasRematch = pairings.some((pairing) => (
    pairing.whiteId && hasPlayed(history, pairing.whiteId, pairing.blackId)
  ));

  return {
    success: true,
    pairings,
    hasRematch
  };
}

export function getSwissRoundLimit(playerCount) {
  const count = Number.isFinite(playerCount) ? Math.max(0, Math.floor(playerCount)) : 0;
  return Math.ceil(count / 2);
}
