const CHESS_COM_CATEGORIES = [
  { key: 'chess_blitz', label: 'blitz' },
  { key: 'chess_rapid', label: 'rapid' },
  { key: 'chess_daily', label: 'daily' }
];

const LICHESS_CATEGORIES = {
  Blitz: 'blitz',
  Rapid: 'rapid',
  Correspondence: 'correspondence'
};

const CHESS_COM_BLITZ_TO_LICHESS = {
  blitz: [
    [500, 1030],
    [600, 1075],
    [700, 1145],
    [800, 1200],
    [900, 1335],
    [1000, 1420],
    [1100, 1475],
    [1150, 1525],
    [1200, 1565],
    [1250, 1605],
    [1300, 1635],
    [1350, 1670],
    [1400, 1705],
    [1450, 1745],
    [1500, 1780],
    [1550, 1815],
    [1600, 1850],
    [1650, 1895],
    [1700, 1910],
    [1750, 1950],
    [1800, 1970],
    [1850, 2005],
    [1900, 2050],
    [1950, 2075],
    [2000, 2100],
    [2100, 2170],
    [2200, 2235],
    [2300, 2295]
  ],
  bullet: [
    [500, 975],
    [600, 1010],
    [700, 1075],
    [800, 1115],
    [900, 1200],
    [1000, 1295],
    [1100, 1385],
    [1150, 1435],
    [1200, 1475],
    [1250, 1530],
    [1300, 1575],
    [1350, 1630],
    [1400, 1675],
    [1450, 1720],
    [1500, 1770],
    [1550, 1805],
    [1600, 1845],
    [1650, 1895],
    [1700, 1920],
    [1750, 1960],
    [1800, 2000],
    [1850, 2040],
    [1900, 2110],
    [1950, 2145],
    [2000, 2195],
    [2100, 2255],
    [2200, 2330],
    [2300, 2400]
  ],
  rapid: [
    [500, 1205],
    [600, 1270],
    [700, 1340],
    [800, 1400],
    [900, 1515],
    [1000, 1615],
    [1100, 1690],
    [1150, 1730],
    [1200, 1765],
    [1250, 1795],
    [1300, 1825],
    [1350, 1850],
    [1400, 1880],
    [1450, 1915],
    [1500, 1930],
    [1550, 1965],
    [1600, 1990],
    [1650, 2020],
    [1700, 2035],
    [1750, 2055],
    [1800, 2085],
    [1850, 2115],
    [1900, 2135],
    [1950, 2155],
    [2000, 2185],
    [2100, 2240],
    [2200, 2285],
    [2300, 2330]
  ],
  classical: [
    [500, 1405],
    [600, 1435],
    [700, 1495],
    [800, 1555],
    [900, 1625],
    [1000, 1715],
    [1100, 1770],
    [1150, 1795],
    [1200, 1810],
    [1250, 1830],
    [1300, 1850],
    [1350, 1855],
    [1400, 1865],
    [1450, 1915],
    [1500, 1935],
    [1550, 1935],
    [1600, 1935],
    [1650, 1985],
    [1700, 2000],
    [1750, 2010],
    [1800, 2030],
    [1850, 2045],
    [1900, 2070],
    [1950, 2095],
    [2000, 2100],
    [2100, 2125],
    [2200, 2195],
    [2300, 2245]
  ]
};

const CHESS_COM_BLITZ_TO_CHESS_COM = {
  bullet: [
    [500, 445],
    [600, 530],
    [700, 620],
    [800, 725],
    [900, 825],
    [1000, 920],
    [1100, 1020],
    [1150, 1070],
    [1200, 1115],
    [1250, 1165],
    [1300, 1205],
    [1350, 1260],
    [1400, 1305],
    [1450, 1355],
    [1500, 1400],
    [1550, 1450],
    [1600, 1510],
    [1650, 1575],
    [1700, 1615],
    [1750, 1665],
    [1800, 1715],
    [1850, 1780],
    [1900, 1825],
    [1950, 1880],
    [2000, 1930],
    [2100, 2035],
    [2200, 2155],
    [2300, 2255]
  ],
  rapid: [
    [500, 735],
    [600, 835],
    [700, 945],
    [800, 1035],
    [900, 1130],
    [1000, 1230],
    [1100, 1320],
    [1150, 1365],
    [1200, 1405],
    [1250, 1450],
    [1300, 1500],
    [1350, 1540],
    [1400, 1575],
    [1450, 1610],
    [1500, 1655],
    [1550, 1695],
    [1600, 1730],
    [1650, 1780],
    [1700, 1810],
    [1750, 1850],
    [1800, 1890],
    [1850, 1940],
    [1900, 1990],
    [1950, 2010],
    [2000, 2035],
    [2100, 2080],
    [2200, 2135],
    [2300, 2190]
  ],
  uscf: [
    [500, 715],
    [600, 775],
    [700, 860],
    [800, 930],
    [900, 1055],
    [1000, 1155],
    [1100, 1280],
    [1150, 1325],
    [1200, 1350],
    [1250, 1390],
    [1300, 1435],
    [1350, 1480],
    [1400, 1530],
    [1450, 1570],
    [1500, 1595],
    [1550, 1640],
    [1600, 1675],
    [1650, 1710],
    [1700, 1750],
    [1750, 1790],
    [1800, 1815],
    [1850, 1850],
    [1900, 1880],
    [1950, 1910],
    [2000, 1940],
    [2100, 2005],
    [2200, 2085],
    [2300, 2185]
  ],
  fide: [
    [1000, 1450],
    [1100, 1490],
    [1150, 1540],
    [1200, 1555],
    [1250, 1570],
    [1300, 1610],
    [1350, 1625],
    [1400, 1650],
    [1450, 1690],
    [1500, 1710],
    [1550, 1720],
    [1600, 1735],
    [1650, 1745],
    [1700, 1770],
    [1750, 1795],
    [1800, 1810],
    [1850, 1840],
    [1900, 1880],
    [1950, 1910],
    [2000, 1925],
    [2100, 1990],
    [2200, 2055],
    [2300, 2135]
  ]
};

function sortPairs(pairs) {
  return [...pairs].sort((a, b) => a[0] - b[0]);
}

export function interpolatePairs(pairs, value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const sorted = sortPairs(pairs);
  if (!sorted.length) {
    return null;
  }

  if (value <= sorted[0][0]) {
    return sorted[0][1];
  }

  const last = sorted[sorted.length - 1];
  if (value >= last[0]) {
    return last[1];
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x1, y1] = sorted[i];
    const [x2, y2] = sorted[i + 1];
    if (value >= x1 && value <= x2) {
      const ratio = (value - x1) / (x2 - x1);
      return y1 + ratio * (y2 - y1);
    }
  }

  return null;
}

export function invertPairs(pairs) {
  return sortPairs(pairs).map(([x, y]) => [y, x]);
}

const LICHESS_TO_CHESS_COM_BLITZ = {
  blitz: invertPairs(CHESS_COM_BLITZ_TO_LICHESS.blitz),
  bullet: invertPairs(CHESS_COM_BLITZ_TO_LICHESS.bullet),
  rapid: invertPairs(CHESS_COM_BLITZ_TO_LICHESS.rapid),
  classical: invertPairs(CHESS_COM_BLITZ_TO_LICHESS.classical)
};

const CHESS_COM_RAPID_TO_BLITZ = invertPairs(CHESS_COM_BLITZ_TO_CHESS_COM.rapid);

export function convertToTournamentRating({ provider, category, rating }) {
  if (!Number.isFinite(rating) || rating <= 0) {
    return 0;
  }

  if (provider === 'chess.com') {
    if (category === 'blitz') {
      return Math.round(rating);
    }

    if (category === 'rapid' || category === 'daily') {
      const converted = interpolatePairs(CHESS_COM_RAPID_TO_BLITZ, rating);
      return converted ? Math.round(converted) : 0;
    }
  }

  if (provider === 'lichess') {
    const normalized = category === 'correspondence' ? 'rapid' : category;
    if (normalized === 'blitz') {
      const converted = interpolatePairs(LICHESS_TO_CHESS_COM_BLITZ.blitz, rating);
      return converted ? Math.round(converted) : 0;
    }

    if (normalized === 'rapid') {
      const converted = interpolatePairs(LICHESS_TO_CHESS_COM_BLITZ.rapid, rating);
      return converted ? Math.round(converted) : 0;
    }
  }

  return 0;
}

export function getMaxRating(ratings) {
  if (!ratings || typeof ratings !== 'object') {
    return null;
  }

  let maxRating = null;
  let maxCategory = null;

  for (const [category, rating] of Object.entries(ratings)) {
    if (!Number.isFinite(rating)) {
      continue;
    }
    if (maxRating === null || rating > maxRating) {
      maxRating = rating;
      maxCategory = category;
    }
  }

  if (maxRating === null) {
    return null;
  }

  return { rating: maxRating, category: maxCategory };
}

export function chessComRatingsFromStats(stats) {
  const ratings = {};
  if (!stats || typeof stats !== 'object') {
    return ratings;
  }

  for (const { key, label } of CHESS_COM_CATEGORIES) {
    const entry = stats[key];
    const best = entry?.best?.rating;
    const last = entry?.last?.rating;
    const rating = Number.isFinite(best) ? best : Number.isFinite(last) ? last : null;

    if (Number.isFinite(rating)) {
      ratings[label] = rating;
    }
  }

  return ratings;
}

export function lichessRatingsFromHistory(history) {
  const ratings = {};
  const list = Array.isArray(history) ? history : Array.isArray(history?.value) ? history.value : [];

  for (const entry of list) {
    const category = LICHESS_CATEGORIES[entry?.name];
    if (!category) {
      continue;
    }

    const points = Array.isArray(entry.points) ? entry.points : [];
    let max = null;

    for (const point of points) {
      const rating = Array.isArray(point) ? point[3] : null;
      if (!Number.isFinite(rating)) {
        continue;
      }
      if (max === null || rating > max) {
        max = rating;
      }
    }

    if (Number.isFinite(max)) {
      ratings[category] = max;
    }
  }

  return ratings;
}

export function resultFromRatings(ratings, provider) {
  const max = getMaxRating(ratings);

  if (!max) {
    return {
      provider,
      status: 'no_rating',
      rating: 0,
      category: null,
      ratings
    };
  }

  return {
    provider,
    status: 'ok',
    rating: max.rating,
    category: max.category,
    ratings
  };
}

export function resultFromHttpStatus(status, provider) {
  if (status === 404) {
    return {
      provider,
      status: 'not_found',
      rating: 0,
      category: null,
      ratings: {}
    };
  }

  return {
    provider,
    status: 'error',
    rating: 0,
    category: null,
    ratings: {}
  };
}

export async function fetchChessComRating(username, fetcher = fetch) {
  const encoded = encodeURIComponent(username);
  const response = await fetcher(`https://api.chess.com/pub/player/${encoded}/stats`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return resultFromHttpStatus(response.status, 'chess.com');
  }

  const data = await response.json();
  return resultFromRatings(chessComRatingsFromStats(data), 'chess.com');
}

export async function fetchLichessRating(username, fetcher = fetch) {
  const encoded = encodeURIComponent(username);
  const response = await fetcher(`https://lichess.org/api/user/${encoded}/rating-history`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return resultFromHttpStatus(response.status, 'lichess');
  }

  const data = await response.json();
  return resultFromRatings(lichessRatingsFromHistory(data), 'lichess');
}

export const CATEGORY_LABELS = {
  blitz: 'blitz',
  rapid: 'rapid',
  daily: 'daily',
  correspondence: 'korespondenční'
};

export const PROVIDER_LABELS = {
  'chess.com': 'chess.com',
  lichess: 'lichess.org',
  none: 'bez účtu'
};

export const STATUS_LABELS = {
  ok: 'Rating nalezen',
  no_rating: 'Bez ratingu',
  not_found: 'Hráč nenalezen',
  no_account: 'Bez účtu',
  error: 'Chyba načítání'
};
