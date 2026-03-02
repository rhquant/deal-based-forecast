# Semantic Layer Requirements — Forecast Path Tool
> **For analyst handover.** Defines every object, field, filter, and derivation the tool needs.
> Analyst maps these to actual Snowflake table/column names.

---

## Tool Summary

Two tabs. Two data sources.

| Tab | Data Source | Access |
|---|---|---|
| Forecast | Live Salesforce opportunities | mcp-salesforce (SOQL) |
| Pipeline Changes | Opportunity snapshots vs today | mcp-snowflake |
| Y/Y % in bridge | Prior period closed actuals | mcp-snowflake |

All queries are **user-scoped**. See Section 4.

---

## Section 1 — Salesforce (mcp-salesforce)

Two SOQL queries against the `Opportunity` object. Custom field API names marked `[CONFIRM]`.

---

### Query 1A — Closed Won

Powers the **Closed Won** row in the forecast bridge.

```
Object:   Opportunity
Filter:   IsWon = true
          CloseDate >= first day of current fiscal quarter
          CloseDate <= last day of current fiscal quarter
          [user scope — see Section 4]
```

| Tool Field | Salesforce Field | Notes |
|---|---|---|
| `opportunity_name` | `Name` | |
| `account_name` | `Account.Name` | |
| `arr` | `[CONFIRM]` | ARR field — Amount or custom e.g. Net_ARR__c |
| `close_date` | `CloseDate` | Format as YYYY-MM-DD |
| `stage` | `StageName` | |
| `deal_type` | `[CONFIRM]` | Values must be `New Business` or `Expansion` |
| `segment` | `[CONFIRM]` | Values: Commercial, Enterprise, Public Sector, NorCal |
| `owner_id` | `OwnerId` | For user scoping — not displayed |
| `manager_id` | `Owner.ManagerId` | For manager scoping — not displayed |

---

### Query 1B — Open Pipeline

Powers the **deal table** and the **In / Best Case toggle rows** in the bridge.

```
Object:   Opportunity
Filter:   IsClosed = false
          CloseDate >= first day of current fiscal quarter
          CloseDate <= last day of current fiscal quarter
          ARR >= 60000
          [user scope — see Section 4]
```

| Tool Field | Salesforce Field | Notes |
|---|---|---|
| `opportunity_name` | `Name` | |
| `account_name` | `Account.Name` | |
| `arr` | `total_commissionable_arr__c` | Same ARR field as Query 1A |
| `close_date` | `CloseDate` | Format as YYYY-MM-DD |
| `stage` | `StageName` | |
| `vp_forecast` | `vp_deal_forecast__c` | VP override forecast field. Values must be: `Commit`, `Best Case`, `Most Likely`. Likely a custom field, not standard ForecastCategoryName. |
| `deal_type` | `type` | Same as Query 1A |
| `segment` | `owner_market_segment` | Same as Query 1A |
| `owner_id` | `OwnerId` | For user scoping — not displayed |
| `manager_id` | `Owner.ManagerId` | For manager scoping — not displayed |

**Critical:** `vp_forecast` drives auto-toggle behavior on load:
- `Commit` → deal pre-toggled **In**
- `Best Case` → deal pre-toggled **Best Case**
- `Most Likely` → no pre-toggle

---

## Section 2 — Snowflake Semantic Layer (mcp-snowflake)

Two entities needed. Analyst builds these as views in the GTM Mart.

---

### Entity 2A — Pipeline Snapshots

**View name (suggested):** `GTM_MART.PIPELINE_SNAPSHOTS`

Powers the **Pipeline Changes tab**. Compares each open pipeline opportunity's state at a reference snapshot point against its current state, and classifies what changed.

#### Snapshot Reference Points

| snapshot_type | Definition |
|---|---|
| `SOQ` | State of pipeline on Feb 1 (first day of fiscal Q1) |
| `SOM` | State of pipeline on the 1st of each month |
| `SOW` | State of pipeline on the most recent Monday |

#### Required Fields

| Field | Type | Description |
|---|---|---|
| `snapshot_type` | string | `SOQ`, `SOM`, or `SOW` |
| `snapshot_date` | date | Actual date of the snapshot |
| `opportunity_id` | string | Salesforce Opportunity ID |
| `opportunity_name` | string | |
| `account_name` | string | |
| `deal_type` | string | `New Business` or `Expansion` |
| `segment` | string | Commercial / Enterprise / Public Sector / NorCal |
| `snapshot_arr` | number | ARR at snapshot time. `0` if deal did not exist yet. |
| `current_arr` | number | ARR today. `0` if deal has left the pipeline (won/lost/slipped). |
| `snapshot_close_date` | date | Close date at snapshot. Null if deal did not exist. |
| `current_close_date` | date | Close date today. Null if deal no longer open. |
| `snapshot_stage` | string | Stage at snapshot. Null if deal did not exist. |
| `current_stage` | string | Stage today. Null if deal no longer open. |
| `change_type` | string | Derived — see classification logic below |
| `owner_id` | string | For user scoping |

#### `change_type` Classification Logic

Evaluate top to bottom. First match wins.

| Priority | Value | Condition |
|---|---|---|
| 1 | `New` | Deal did not exist at snapshot (`snapshot_arr = 0`, no snapshot date) |
| 2 | `Closed Won` | Deal existed at snapshot and is now won |
| 3 | `Closed Lost` | Deal existed at snapshot and is now lost/closed |
| 4 | `Slipped` | `current_close_date` moved beyond the end of fiscal quarter; `snapshot_close_date` was within it |
| 5 | `Pushed` | `current_close_date > snapshot_close_date` but still within the quarter |
| 6 | `ARR Increase` | `current_arr > snapshot_arr` |
| 7 | `ARR Decrease` | `current_arr < snapshot_arr` |
| 8 | `Active` | No change across all tracked fields |

#### Implementation Note

The most maintainable pattern is a **daily opportunity snapshot table** (one row per opportunity per day) from which this view is derived. The view joins the snapshot on the reference date to the current opportunity state. Do not maintain three separate snapshot tables.

---

### Entity 2B — Forecast Actuals (Y/Y)

**View name (suggested):** `GTM_MART.FORECAST_ACTUALS`

Powers two Y/Y displays:
1. **Forecast bridge** — Y/Y % on the Closest to Pin and Best Case rows (total All + New Biz)
2. **Segment Rollup table** — Y/Y % on CTTP broken out by segment (Commercial / Enterprise / Public Sector / NorCal)

Returns prior period final closed actuals. `segment` is required on every row so both consumers can filter or aggregate as needed.

#### Required Fields

| Field | Type | Description |
|---|---|---|
| `fiscal_year` | string | e.g. `FY2025`, `FY2026` |
| `fiscal_quarter` | string | `Q1`, `Q2`, `Q3`, `Q4` |
| `segment` | string | Commercial / Enterprise / Public Sector / NorCal |
| `deal_type` | string | `New Business`, `Expansion` |
| `closed_won_arr` | number | Total closed won ARR for the period |
| `commit_closed_arr` | number | Closed won ARR where VP forecast was `Commit` at time of close — used as the CTTP proxy for prior periods |
| `owner_id` | string | For user scoping |

#### Query A — Bridge Y/Y (totals, split by deal type)

```sql
SELECT
  segment,
  deal_type,
  SUM(commit_closed_arr) AS cttp_arr,
  SUM(closed_won_arr)    AS best_case_arr
FROM GTM_MART.FORECAST_ACTUALS
WHERE fiscal_year    = 'FY2025'
  AND fiscal_quarter = 'Q1'
  AND owner_id IN (
    SELECT subordinate_sfdc_id FROM GTM_MART.REP_HIERARCHY
    WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}'
  )
GROUP BY segment, deal_type;
```

#### Query B — Segment Rollup Y/Y (CTTP per segment, all deal types combined)

```sql
SELECT
  segment,
  SUM(commit_closed_arr) AS prior_year_cttp
FROM GTM_MART.FORECAST_ACTUALS
WHERE fiscal_year    = 'FY2025'
  AND fiscal_quarter = 'Q1'
  AND owner_id IN (
    SELECT subordinate_sfdc_id FROM GTM_MART.REP_HIERARCHY
    WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}'
  )
GROUP BY segment;
```

The tool uses Query B to populate the `yyBySegment` prop on the Segment Rollup component. The Y/Y % shown is `(current_cttp - prior_year_cttp) / prior_year_cttp`.

#### Fiscal Calendar

```
FY starts Feb 1
Q1 = Feb, Mar, Apr
Q2 = May, Jun, Jul
Q3 = Aug, Sep, Oct
Q4 = Nov, Dec, Jan   ← January belongs to the fiscal year that started the prior Feb
```

---

## Section 3 — Rep Hierarchy (shared utility)

**View name (suggested):** `GTM_MART.REP_HIERARCHY`

Required for recursive manager scoping. Not specific to this tool — should be built once and shared across all GTM tools.

#### Required Fields

| Field | Type | Description |
|---|---|---|
| `manager_sfdc_id` | string | The Salesforce User ID of the manager (ancestor) |
| `subordinate_sfdc_id` | string | The Salesforce User ID of every rep in that manager's tree |
| `subordinate_name` | string | Display name |
| `depth` | number | 0 = self, 1 = direct report, 2 = two levels down, etc. |

#### Logic

Recursive traversal of the Salesforce `User.ManagerId` field. For any given `manager_sfdc_id`, the view returns every user in their reporting chain at any depth.

---

## Section 4 — User Scoping

Every query (SOQL and Snowflake) is scoped by the requesting user's role. The mcp server injects the scope filter at query time — the tool never passes user identity as a parameter.

| Role | Scope | Filter applied |
|---|---|---|
| `rep` | Own opportunities only | `owner_id = {current_user_id}` |
| `manager` | Full reporting tree, all depths | `owner_id IN (subordinate_sfdc_ids from REP_HIERARCHY for current_user_id)` |
| `director` | Full segment | `segment = {current_user_segment}` |
| `exec` | All | No filter |
| `ops` | All, audit logged | No filter |

---

## Section 5 — Open Questions for Analyst

| # | Question | Affects |
|---|---|---|
| 1 | API name of the ARR field on Opportunity (Amount vs custom) | Queries 1A, 1B |
| 2 | API name of the VP Forecast override field (not standard ForecastCategoryName) | Query 1B, toggle behavior |
| 3 | API name of the Deal Type field (standard Type vs custom) | Queries 1A, 1B, Pipeline Snapshots |
| 4 | API name of the Segment field — and is it on Opportunity or Account? | Queries 1A, 1B, Pipeline Snapshots |
| 5 | Does a daily Opportunity snapshot table already exist in Snowflake? If not, it must be created before Pipeline Snapshots view can be built | Entity 2A |
