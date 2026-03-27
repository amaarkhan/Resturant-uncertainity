function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function buildWindowMetrics({ outcomes, feedback }) {
  const totals = outcomes.reduce(
    (acc, row) => {
      acc.prepared += row.preparedQty;
      acc.leftover += row.leftoverQty;
      acc.stockout += row.stockout ? 1 : 0;
      acc.followed += row.recommendationFollowed ? 1 : 0;
      return acc;
    },
    { prepared: 0, leftover: 0, stockout: 0, followed: 0 }
  );

  const avgTrust = feedback.length
    ? Number((feedback.reduce((sum, row) => sum + row.confidenceRating, 0) / feedback.length).toFixed(2))
    : 0;

  return {
    outcomeCount: outcomes.length,
    feedbackCount: feedback.length,
    wastePercent: percent(totals.leftover, totals.prepared),
    stockoutRate: percent(totals.stockout, outcomes.length),
    recommendationFollowRate: percent(totals.followed, outcomes.length),
    trustScore: avgTrust
  };
}

export function deltaPercent(baselineValue, pilotValue, invertDirection = false) {
  if (!baselineValue && !pilotValue) return 0;
  if (!baselineValue) return 100;
  const raw = ((pilotValue - baselineValue) / baselineValue) * 100;
  const adjusted = invertDirection ? -raw : raw;
  return Number(adjusted.toFixed(2));
}

export function decidePmfDirection({
  wasteReduction,
  stockoutReduction,
  followRate,
  trustScore,
  week4Usage,
  willingnessToPay
}) {
  const checks = {
    wasteReduction: wasteReduction >= 10,
    stockoutReduction: stockoutReduction >= 15,
    followRate: followRate >= 60,
    trustScore: trustScore >= 4,
    week4Usage: week4Usage >= 40,
    willingnessToPay: willingnessToPay >= 20
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  if (checks.wasteReduction && passedCount >= 4) {
    return { decision: "PMF_DIRECTION_POSITIVE", passedCount, checks };
  }
  if (passedCount >= 2) {
    return { decision: "PROMISING_NOT_YET_PMF", passedCount, checks };
  }
  return { decision: "PIVOT_NEEDED", passedCount, checks };
}
