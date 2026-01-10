export const samplePointsByInterval = (points, intervalMs, anchorMs) => {
  if (!Array.isArray(points) || points.length === 0) return [];

  const interval = Number(intervalMs);
  if (!Number.isFinite(interval) || interval <= 0) return points;

  const anchor = Number(anchorMs);
  const start = Number.isFinite(anchor) ? anchor : Number(points[0]?.x);
  if (!Number.isFinite(start)) return points;

  const out = [];

  let currentBucket = null;
  let lastPointInBucket = null;

  for (const p of points) {
    if (!p) continue;
    const x = Number(p.x);
    if (!Number.isFinite(x)) continue;

    const bucket = Math.floor((x - start) / interval);
    if (currentBucket == null) {
      currentBucket = bucket;
      lastPointInBucket = p;
      continue;
    }

    if (bucket === currentBucket) {
      lastPointInBucket = p;
      continue;
    }

    if (lastPointInBucket) out.push(lastPointInBucket);
    currentBucket = bucket;
    lastPointInBucket = p;
  }

  if (lastPointInBucket) out.push(lastPointInBucket);
  return out;
};
