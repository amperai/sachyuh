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

function hasPlayed(history, playerId, opponentId) {
  return history[playerId]?.opponents.has(opponentId);
}

function canAssignColor(history, playerId, color) {
  const data = history[playerId];
  if (!data) {
    return false;
  }
  const nextWhite = data.white + (color === 'white' ? 1 : 0);
  const nextBlack = data.black + (color === 'black' ? 1 : 0);
  return Math.abs(nextWhite - nextBlack) <= 1;
}

function pickColorAssignment(history, playerA, playerB) {
  const options = [
    { whiteId: playerA.id, blackId: playerB.id },
    { whiteId: playerB.id, blackId: playerA.id }
  ].filter((option) => (
    canAssignColor(history, option.whiteId, 'white')
    && canAssignColor(history, option.blackId, 'black')
  ));

  if (!options.length) {
    return null;
  }

  const scored = options.map((option) => {
    const whiteData = history[option.whiteId];
    const blackData = history[option.blackId];
    const repeatPenalty = (whiteData.lastColor === 'white' ? 1 : 0)
      + (blackData.lastColor === 'black' ? 1 : 0);
    const whiteDiff = Math.abs((whiteData.white + 1) - whiteData.black);
    const blackDiff = Math.abs(blackData.white - (blackData.black + 1));
    const balancePenalty = whiteDiff + blackDiff;
    return { option, repeatPenalty, balancePenalty };
  });

  scored.sort((a, b) => {
    if (a.repeatPenalty !== b.repeatPenalty) {
      return a.repeatPenalty - b.repeatPenalty;
    }
    return a.balancePenalty - b.balancePenalty;
  });

  return scored[0];
}

function matchGroup(top, bottom, history, allowRematch) {
  const REMATCH_WEIGHT = 100;
  let bestPairs = null;
  let bestScore = Number.POSITIVE_INFINITY;

  function backtrack(index, remaining, current, score) {
    if (score >= bestScore) {
      return;
    }

    if (index >= top.length) {
      bestPairs = [...current];
      bestScore = score;
      return;
    }

    const player = top[index];

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const isRematch = hasPlayed(history, player.id, candidate.id);
      if (!allowRematch && isRematch) {
        continue;
      }

      const picked = pickColorAssignment(history, player, candidate);
      if (!picked) {
        continue;
      }

      const nextRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      const nextScore = score + picked.repeatPenalty + (isRematch ? REMATCH_WEIGHT : 0);
      const pairing = { ...picked.option, result: null };
      current.push(pairing);
      backtrack(index + 1, nextRemaining, current, nextScore);
      current.pop();
    }
  }

  backtrack(0, bottom, [], 0);
  return bestPairs;
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

  for (let i = 0; i < groups.length - 1; i += 1) {
    if (groups[i].players.length % 2 === 1) {
      const floater = groups[i].players.pop();
      if (floater) {
        groups[i + 1].players.push(floater);
      }
    }
  }

  const pairings = [];

  for (const group of groups) {
    group.players.sort((a, b) => {
      const ratingDiff = (b.ratingFinal ?? 0) - (a.ratingFinal ?? 0);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }
      return a.name.localeCompare(b.name, 'cs');
    });

    if (group.players.length % 2 === 1) {
      return { success: false, pairings: [], reason: 'odd_group' };
    }

    const half = group.players.length / 2;
    const top = group.players.slice(0, half);
    const bottom = group.players.slice(half);

    let matched = matchGroup(top, bottom, history, false);
    if (!matched && allowRematch) {
      matched = matchGroup(top, bottom, history, true);
    }

    if (!matched) {
      return { success: false, pairings: [], reason: 'no_match' };
    }

    pairings.push(...matched);
  }

  if (byePlayer) {
    pairings.push({ byeId: byePlayer.id, result: 'bye' });
  }

  const hasRematch = pairings.some((pairing) => pairing.whiteId && isRematchPair(history, pairing));

  return {
    success: true,
    pairings,
    hasRematch
  };
}
