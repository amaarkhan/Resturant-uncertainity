# Phase 4 Metrics Framework

## A. Adoption and Behavior Metrics
1. Recommendation View Rate
- Definition: users viewing recommendations before prep.

2. Recommendation Follow Rate
- Definition: outcome records marked recommendationFollowed true.

3. Week 4 Usage Rate
- Definition: percent of pilot users still active by week 4.

## B. Value and Outcome Metrics
1. Waste Percent
- Formula: sum(leftoverQty) / sum(preparedQty) * 100

2. Stockout Rate
- Formula: stockout records / total outcome records * 100

3. Waste Reduction
- Formula: percent reduction from baseline window to pilot window

4. Stockout Reduction
- Formula: percent reduction from baseline window to pilot window

## C. Trust and Satisfaction Metrics
1. Trust Score
- Formula: average confidenceRating from quick feedback

2. Trust Lift
- Formula: change in trust score from baseline to pilot window

## D. Commercial Signal Metrics
1. Willingness-to-Pay (WTP)
- Definition: percent of pilot users indicating they would continue under paid plan.

2. Trial-to-Paid Intent
- Early proxy based on post-pilot interviews/survey.

## E. PMF Decision Thresholds
- Waste reduction >= 10 percent
- Stockout reduction >= 15 percent
- Recommendation follow rate >= 60 percent
- Trust score >= 4.0
- Week 4 usage >= 40 percent
- WTP >= 20 percent

## API Support
Use endpoint:
- GET /api/v1/admin/metrics/pmf-report
