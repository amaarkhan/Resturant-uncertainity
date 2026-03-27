# Phase 2 Data Model

## Objective
Define minimum entities required to support end-to-end recommendation flow and metrics collection.

## Entities

### 1. User
- id
- full_name
- email (unique)
- password_hash
- role (OWNER_MANAGER or ADMIN)
- restaurant_id (nullable for ADMIN)
- created_at
- updated_at

### 2. Restaurant
- id
- name
- city
- area (optional)
- timezone
- active
- created_at
- updated_at

### 3. MenuItem
- id
- restaurant_id
- name
- unit (plate, kg, piece)
- baseline_prep_qty
- active
- created_at
- updated_at

### 4. SignalSnapshot
- id
- restaurant_id
- date
- weather_type (clear, rain, heatwave, etc.)
- temperature_c
- event_type (none, cricket, holiday, exam, local_event)
- event_intensity (0 to 1)
- source_status (live or fallback)
- created_at

### 5. RecommendationRun
- id
- restaurant_id
- date
- generated_by (system or admin)
- confidence_level (High, Medium, Low)
- reason_summary
- used_fallback (boolean)
- created_at

### 6. RecommendationItem
- id
- recommendation_run_id
- menu_item_id
- recommended_qty
- baseline_qty
- adjustment_factor
- reason

### 7. DailyOutcome
- id
- restaurant_id
- date
- menu_item_id
- prepared_qty
- sold_qty
- leftover_qty
- stockout (boolean)
- recommendation_followed (boolean)
- created_at

### 8. QuickFeedback
- id
- restaurant_id
- date
- feedback_type (ran_out_early, too_much_left, balanced)
- note (optional)
- confidence_rating (1 to 5)
- created_at

### 9. AuditLog (Admin Actions)
- id
- admin_user_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

## Key Relationships
- Restaurant 1 to many Users.
- Restaurant 1 to many MenuItems.
- Restaurant 1 to many SignalSnapshots.
- Restaurant 1 to many RecommendationRuns.
- RecommendationRun 1 to many RecommendationItems.
- Restaurant 1 to many DailyOutcomes.
- Restaurant 1 to many QuickFeedback entries.

## Metric Derivations
- Waste percent = sum(leftover_qty) / sum(prepared_qty).
- Stockout rate = count(stockout true) / total menu-item-days.
- Follow rate = count(recommendation_followed true) / total outcome records.
- Trust score = average(confidence_rating).

## Data Quality Rules
- sold_qty cannot exceed prepared_qty.
- leftover_qty = prepared_qty - sold_qty unless stockout true and manual override note exists.
- date + restaurant_id + menu_item_id unique for DailyOutcome.

## Phase 2 Exit Criteria
- Schema agreed and mapped to MVP metrics.
- Validation rules approved before API implementation.
