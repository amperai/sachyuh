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
