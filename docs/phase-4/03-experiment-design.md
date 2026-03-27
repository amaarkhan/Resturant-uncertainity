# Phase 4 Experiment Design

## Experiment Type
Baseline vs pilot cohort comparison.

## Cohort Design
- Pilot size target: 15-30 restaurants.
- Segment mix:
  - Cloud kitchens
  - University-adjacent cafes
  - Event-sensitive eateries

## Time Windows
1. Baseline window
- 10-14 days before recommendation-driven usage.

2. Pilot window
- 4-6 weeks of active MVP usage.

## Data Collection Requirements
Per restaurant/day/menu item:
- preparedQty
- soldQty
- leftoverQty
- stockout
- recommendationFollowed

Per restaurant/day:
- quick feedback
- confidence rating

## Primary Experiments
1. Daily recommendation habit test
- Track recommendation usage consistency.

2. Value lift test
- Compare waste and stockouts vs baseline.

3. Trust durability test
- Track confidence score trend over weeks.

4. Commercial signal test
- Capture WTP at end of pilot.

## Failure Scenarios to Track
- Signal source fallback frequency.
- Low confidence recommendation days.
- User drop-off after incorrect recommendations.

## Analysis Cadence
- Weekly review for trend direction.
- Final PMF gate at pilot end.
