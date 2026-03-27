# Phase 3 Live Demo Script (5-7 Minutes)

## Goal
Demonstrate complete end-to-end MVP value and one failure-handling case.

## Scenario Setup
- Restaurant: Karachi Kitchen
- Day: Today
- Context: Rain + cricket match (event intensity 0.8)

## Demo Steps
1. Open customer app URL and login as owner.
2. Generate recommendation with context inputs.
3. Explain confidence level and reason summary.
4. Show item-level recommended quantities.
5. Enter actual outcomes (prepared/sold/leftover/stockout) and save.
6. Submit quick feedback (ran_out_early or too_much_left).
7. Open admin panel URL and login as admin.
8. Show restaurants, menu items, users, and metrics overview.
9. Highlight PMF-aligned metrics: waste percent, stockout rate, trust score.

## Failure Handling Step
- Generate recommendation with fallback sourceStatus and explain low-confidence warning.
- Explain how owner should treat low-confidence output conservatively.

## Closing Message
- MVP solves core daily decision flow without POS history.
- Captures measurable outcomes for PMF decision in Phase 4.
