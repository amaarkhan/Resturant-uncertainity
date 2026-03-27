# Phase 4 PMF Decision Gate

## Inputs
1. Baseline and pilot date windows.
2. Week 4 usage percent.
3. Willingness-to-pay percent.
4. Metrics output from /api/v1/admin/metrics/pmf-report.

## Decision Logic
PMF Direction Positive:
- Waste reduction threshold met.
- At least 4 major thresholds met.

Promising Not Yet PMF:
- 2-3 thresholds met with upward trend.

Pivot Needed:
- 0-1 thresholds met, or trust/adoption remains weak.

## Output Format
1. Decision status.
2. Threshold pass/fail map.
3. Root causes of misses.
4. Next 30-day action plan.

## Example API Call
GET /api/v1/admin/metrics/pmf-report?baselineFrom=2026-03-01&baselineTo=2026-03-14&pilotFrom=2026-03-15&pilotTo=2026-04-25&week4Usage=45&willingnessToPay=25

## Evidence to Attach in Final Report
- Before vs after metrics table.
- One qualitative insight per failed threshold.
- Decision rationale with numeric evidence.
