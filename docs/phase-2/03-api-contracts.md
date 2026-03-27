# Phase 2 API Contracts

## Conventions
- Base path: /api/v1
- Auth: Bearer JWT
- Responses use JSON
- Time format: ISO 8601

## Auth Endpoints

### POST /auth/login
Request
- email
- password

Response
- access_token
- role
- user_id
- restaurant_id

### POST /auth/refresh
Request
- refresh_token

Response
- access_token

## Customer Endpoints

### POST /recommendations/generate
Purpose
Generate daily recommendation for a restaurant date.

Request
- restaurant_id
- date
- optional manual_context (event override)

Response
- recommendation_run_id
- confidence_level
- reason_summary
- items: [{menu_item_id, item_name, baseline_qty, recommended_qty, adjustment_factor, reason}]
- signals_used
- used_fallback

Errors
- 400 invalid input
- 403 unauthorized restaurant access
- 503 signal source unavailable

### POST /outcomes/daily
Purpose
Store prepared/sold/leftover/stockout by menu item.

Request
- restaurant_id
- date
- entries: [{menu_item_id, prepared_qty, sold_qty, leftover_qty, stockout, recommendation_followed}]

Response
- saved_count

### POST /feedback/quick
Purpose
Capture quick user feedback and trust signal.

Request
- restaurant_id
- date
- feedback_type
- confidence_rating
- optional note

Response
- feedback_id

### GET /recommendations/history
Query
- restaurant_id
- from_date
- to_date

Response
- recommendation_runs summary list

## Admin Endpoints

### GET /admin/restaurants
### POST /admin/restaurants
### PATCH /admin/restaurants/{id}

### GET /admin/menu-items?restaurant_id=
### POST /admin/menu-items
### PATCH /admin/menu-items/{id}

### GET /admin/users
### POST /admin/users
### PATCH /admin/users/{id}

### GET /admin/metrics/overview
Response
- active_restaurants
- daily_active_users
- recommendation_view_rate
- recommendation_follow_rate
- feedback_completion_rate
- error_rate

## Health Endpoint

### GET /health
Response
- status (ok or degraded)
- version
- uptime_seconds
- db_status
- external_signal_status

## API Non-Goals (MVP)
- No public third-party developer API.
- No GraphQL requirement.
- No asynchronous webhook integrations.

## Phase 2 Exit Criteria
- Endpoint contracts frozen.
- Frontend and backend teams aligned on payload shapes.
