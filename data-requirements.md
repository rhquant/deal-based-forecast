# Data Requirements — Deal-Backed Forecast Tool
> **Status:** Draft for Analyst Handover | **Owner:** GTM Ops | **Version:** 0.1

---

## Overview

This document defines the field-level data requirements for the `/forecasting` tool. It is the primary handover artifact for the analyst responsible for building the GTM Mart views and configuring the MCP server queries.

### Architecture Pattern

The tool uses two data access paths:

| Path | Server | Purpose |
|---|---|---|
| Live Salesforce data | `mcp-salesforce` (SOQL) | Forecast tab — open pipeline + closed won |
| Historical snapshots | `mcp-snowflake` | Pipeline Changes tab — SOM/SOW/SOQ diffs |
| Prior period actuals | `mcp-snowflake` | Y/Y % in the forecast bridge |

**The tool is user-scoped.** Every query must respect the requesting user's role and book of business. See Section 4 for the access control pattern.

---

## Fiscal Calendar

The tool operates on a fiscal calendar. This convention must be applied consistently across all views and queries.

| Term | Definition |
|---|---|
| Fiscal year start | February 1 |
| Q1 | Feb 1 – Apr 30 |
| Q2 | May 1 – Jul 31 |
| Q3 | Aug 1 – Oct 31 |
| Q4 | Nov 1 – Jan 31 |
| M1 | February |
| M2 | March |
| M3 | April |

All `close_date` bucketing (monthly, weekly, quarterly) should derive from this calendar, not the standard Gregorian calendar.

---

## Data Source 1 — Salesforce via mcp-salesforce

### Source Object: `Opportunity`

Two queries are required. Both query the same object with different filters.

---

### Query 1: Open Pipeline

**Purpose:** Powers the Forecast tab deal table. Includes all open deals closing within the current fiscal quarter.

**SOQL:**
```sql
SELECT
    Id,
    Name,
    Account.Name,
    [ARR_FIELD],              -- see Open Questions
    CloseDate,
    StageName,
    ForecastCategoryName,
    [DEAL_TYPE_FIELD],        -- see Open Questions
    [SEGMENT_FIELD],          -- see Open Questions
    OwnerId,
    Owner.Name,
    Owner.ManagerId
FROM Opportunity
WHERE IsClosed = false
  AND CloseDate >= [FISCAL_Q_START]
  AND CloseDate <= [FISCAL_Q_END]
  AND [USER_SCOPE_FILTER]    -- injected by mcp-salesforce based on user role
```

**Field Mapping (Salesforce → Tool):**

| Salesforce Field | Tool Field Name | Notes |
|---|---|---|
| `Id` | `opportunity_id` | Unique key |
| `Name` | `opportunity_name` | Display |
| `Account.Name` | `account_name` | Display |
| `[ARR_FIELD]` | `arr` | Cast to number |
| `CloseDate` | `close_date` | ISO date string `YYYY-MM-DD` |
| `StageName` | `stage` | Display |
| `ForecastCategoryName` | `vp_forecast` | Values: `Commit`, `Best Case`, `Most Likely`, `Pipeline`, `Omitted` |
| `[DEAL_TYPE_FIELD]` | `deal_type` | Values: `New Business`, `Expansion`, `Renewal` |
| `[SEGMENT_FIELD]` | `segment` | Values: `Commercial`, `Enterprise`, `Public Sector`, `NorCal` |
| `OwnerId` | `owner_id` | Used for scoping, not displayed |
| `Owner.Name` | `owner_name` | Display (future use) |
| `Owner.ManagerId` | `manager_id` | Used for manager-level scoping |

**Tool behavior driven by `vp_forecast`:**
- `Commit` → deal is pre-toggled **In** on load
- `Best Case` → deal is pre-toggled **Best Case** on load
- All others → deal is unselected, appears in deal table only

---

### Query 2: Closed Won

**Purpose:** Powers the Closed Won row in the forecast bridge.

**SOQL:**
```sql
SELECT
    Id,
    Name,
    Account.Name,
    [ARR_FIELD],
    CloseDate,
    StageName,
    [DEAL_TYPE_FIELD],
    [SEGMENT_FIELD],
    OwnerId,
    Owner.ManagerId
FROM Opportunity
WHERE IsWon = true
  AND CloseDate >= [FISCAL_Q_START]
  AND CloseDate <= [FISCAL_Q_END]
  AND [USER_SCOPE_FILTER]
```

**Field Mapping:** Same as Open Pipeline minus `ForecastCategoryName` (not relevant for closed deals).

---

## Data Source 2 — Snowflake via mcp-snowflake

Three objects are required. All table names marked `[CONFIRM]` need the analyst to verify the actual Snowflake path before running.

---

### Object 1: `GTM_MART.REP_HIERARCHY`

**Purpose:** Flattens the full org chart so any manager query can find every rep in their reporting tree at any depth. Built once, shared across all GTM tools.

```sql
CREATE OR REPLACE VIEW GTM_MART.REP_HIERARCHY AS

WITH RECURSIVE subordinates AS (

  -- Base case: every active user anchors their own subtree
  SELECT
    id    AS manager_sfdc_id,
    id    AS subordinate_sfdc_id,
    name  AS subordinate_name,
    0     AS depth
  FROM [CONFIRM: raw Salesforce User table]    -- e.g. RAW.SALESFORCE.USER
  WHERE is_active = true

  UNION ALL

  -- Recursive case: walk down one level at a time
  SELECT
    s.manager_sfdc_id,
    u.id    AS subordinate_sfdc_id,
    u.name  AS subordinate_name,
    s.depth + 1
  FROM [CONFIRM: raw Salesforce User table] u
  JOIN subordinates s ON u.manager_id = s.subordinate_sfdc_id
  WHERE u.is_active = true
    AND u.id != u.manager_id    -- guard: some root users have manager_id = self

)
SELECT
  manager_sfdc_id,
  subordinate_sfdc_id,
  subordinate_name,
  depth
FROM subordinates;
```

**How it gets used in every opportunity query:**
```sql
-- Inject this WHERE clause for manager-role users
WHERE owner_id IN (
  SELECT subordinate_sfdc_id
  FROM GTM_MART.REP_HIERARCHY
  WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}'
)
```

---

### Object 2: `GTM_MART.PIPELINE_SNAPSHOTS`

**Purpose:** Powers the Pipeline Changes tab. Compares each opportunity's state at a reference point (SOQ / SOM / SOW) against its state today and classifies the change.

**Prerequisite — daily snapshot table:** This view depends on a table that captures the full state of every open Opportunity once per day. If this does not already exist it must be created first. See Open Question 6.

```sql
CREATE OR REPLACE VIEW GTM_MART.PIPELINE_SNAPSHOTS AS

WITH

-- Current state of all opportunities that close in fiscal Q1
-- (includes deals that have since closed won/lost so we can classify them)
current_opps AS (
  SELECT
    o.id                          AS opportunity_id,
    o.name                        AS opportunity_name,
    a.name                        AS account_name,
    o.[CONFIRM: ARR field]        AS current_arr,
    o.close_date                  AS current_close_date,
    o.stage_name                  AS current_stage,
    o.[CONFIRM: deal type field]  AS deal_type,
    o.[CONFIRM: segment field]    AS segment,
    o.owner_id,
    o.is_won,
    o.is_closed
  FROM [CONFIRM: raw Opportunity table] o          -- e.g. RAW.SALESFORCE.OPPORTUNITY
  LEFT JOIN [CONFIRM: raw Account table] a
    ON o.account_id = a.id
  WHERE o.close_date BETWEEN DATE '2026-02-01' AND DATE '2026-04-30'
     OR (o.is_closed = true
         AND o.close_date BETWEEN DATE '2026-02-01' AND DATE '2026-04-30')
),

-- State of each opportunity at each reference snapshot date
-- SOQ  = Feb 1 (start of quarter)
-- SOM  = 1st of each month
-- SOW  = each Monday in the quarter
snapshot_dates AS (
  SELECT 'SOQ' AS snapshot_type, DATE '2026-02-01' AS snapshot_date
  UNION ALL SELECT 'SOM', DATE '2026-02-01'
  UNION ALL SELECT 'SOM', DATE '2026-03-01'
  UNION ALL SELECT 'SOM', DATE '2026-04-01'
  UNION ALL
  -- Generate every Monday in Q1 (Feb 3 is the first Monday of Q1 FY26)
  SELECT
    'SOW',
    DATEADD(WEEK, rn - 1, DATE '2026-02-03')
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY SEQ4()) AS rn
    FROM TABLE(GENERATOR(ROWCOUNT => 13))
  )
  WHERE DATEADD(WEEK, rn - 1, DATE '2026-02-03') <= DATE '2026-04-30'
),

opp_at_snapshot AS (
  SELECT
    sd.snapshot_type,
    sd.snapshot_date,
    s.opportunity_id,
    s.[CONFIRM: ARR field]        AS snapshot_arr,
    s.close_date                  AS snapshot_close_date,
    s.stage_name                  AS snapshot_stage,
    s.[CONFIRM: deal type field]  AS deal_type,
    s.[CONFIRM: segment field]    AS segment,
    s.owner_id
  FROM [CONFIRM: daily snapshot table] s           -- e.g. RAW.OPP_DAILY_SNAPSHOTS
  JOIN snapshot_dates sd ON s.snapshot_date = sd.snapshot_date
  WHERE s.close_date BETWEEN DATE '2026-02-01' AND DATE '2026-04-30'
    AND s.is_closed = false
)

SELECT
  sd.snapshot_type,
  sd.snapshot_date,
  COALESCE(snap.opportunity_id,    c.opportunity_id)    AS opportunity_id,
  COALESCE(c.opportunity_name,     snap.opportunity_name) AS opportunity_name,
  COALESCE(c.account_name,         snap.account_name)   AS account_name,
  COALESCE(c.deal_type,            snap.deal_type)       AS deal_type,
  COALESCE(c.segment,              snap.segment)         AS segment,
  COALESCE(snap.owner_id,          c.owner_id)           AS owner_id,
  COALESCE(snap.snapshot_arr,      0)                    AS snapshot_arr,
  COALESCE(c.current_arr,          0)                    AS current_arr,
  snap.snapshot_close_date,
  c.current_close_date,
  snap.snapshot_stage,
  c.current_stage,

  -- change_type: evaluated top to bottom, first match wins
  CASE
    WHEN snap.opportunity_id IS NULL
      THEN 'New'                -- did not exist at snapshot
    WHEN c.is_won = true
      THEN 'Closed Won'
    WHEN c.is_closed = true AND c.is_won = false
      THEN 'Closed Lost'
    WHEN c.current_close_date > DATE '2026-04-30'
     AND snap.snapshot_close_date <= DATE '2026-04-30'
      THEN 'Slipped'            -- pushed out of the quarter entirely
    WHEN c.current_close_date > snap.snapshot_close_date
     AND c.current_close_date <= DATE '2026-04-30'
      THEN 'Pushed'             -- moved later but still in quarter
    WHEN COALESCE(c.current_arr, 0) > COALESCE(snap.snapshot_arr, 0)
      THEN 'ARR Increase'
    WHEN COALESCE(c.current_arr, 0) < COALESCE(snap.snapshot_arr, 0)
      THEN 'ARR Decrease'
    ELSE 'Active'               -- no meaningful change
  END AS change_type

FROM snapshot_dates sd
LEFT JOIN opp_at_snapshot snap
  ON snap.snapshot_type = sd.snapshot_type
  AND snap.snapshot_date = sd.snapshot_date
FULL OUTER JOIN current_opps c
  ON c.opportunity_id = snap.opportunity_id
WHERE c.opportunity_id IS NOT NULL
   OR snap.opportunity_id IS NOT NULL;
```

**How the tool queries it:**
```sql
-- Tool sends snapshot_type as a filter; mcp-snowflake injects the user scope
SELECT *
FROM GTM_MART.PIPELINE_SNAPSHOTS
WHERE snapshot_type = 'SOQ'               -- or 'SOM', 'SOW'
  AND owner_id IN (                       -- user scope injected by mcp server
    SELECT subordinate_sfdc_id
    FROM GTM_MART.REP_HIERARCHY
    WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}'
  )
ORDER BY change_type, current_arr DESC;
```

---

### Object 3: `GTM_MART.FORECAST_ACTUALS`

**Purpose:** Powers the Y/Y % on the Closest to Pin and Best Case rows in the forecast bridge. Returns final closed actuals by fiscal period, segment, and deal type.

```sql
CREATE OR REPLACE VIEW GTM_MART.FORECAST_ACTUALS AS

SELECT
  -- Fiscal period labels
  -- FY starts Feb 1: Feb-Apr = Q1, May-Jul = Q2, Aug-Oct = Q3, Nov-Jan = Q4
  CASE
    WHEN MONTH(close_date) BETWEEN 2 AND 4  THEN 'Q1'
    WHEN MONTH(close_date) BETWEEN 5 AND 7  THEN 'Q2'
    WHEN MONTH(close_date) BETWEEN 8 AND 10 THEN 'Q3'
    ELSE                                         'Q4'
  END AS fiscal_quarter,

  CASE
    WHEN MONTH(close_date) >= 2
      THEN CONCAT('FY', YEAR(close_date))
    ELSE
      CONCAT('FY', YEAR(close_date) - 1)   -- Jan still belongs to prior FY
  END AS fiscal_year,

  [CONFIRM: segment field]    AS segment,
  [CONFIRM: deal type field]  AS deal_type,
  owner_id,

  -- Actuals
  SUM([CONFIRM: ARR field])   AS closed_won_arr,

  -- CTTP proxy: closed won ARR where the deal was in Commit when it closed
  SUM(
    CASE WHEN [CONFIRM: forecast category field] = 'Commit'
    THEN [CONFIRM: ARR field] ELSE 0 END
  )                           AS commit_arr,

  -- Best Case proxy: all closed won ARR (Commit + Best Case + others)
  SUM([CONFIRM: ARR field])   AS best_case_arr

FROM [CONFIRM: raw Opportunity table]              -- e.g. RAW.SALESFORCE.OPPORTUNITY
WHERE is_won = true
GROUP BY 1, 2, 3, 4, 5;
```

**How the tool queries it:**
```sql
-- Fetch prior-year Q1 actuals for Y/Y calculation
-- mcp-snowflake injects the user scope
SELECT
  segment,
  deal_type,
  SUM(closed_won_arr) AS cttp_arr,    -- prior year CTTP baseline
  SUM(best_case_arr)  AS best_case_arr
FROM GTM_MART.FORECAST_ACTUALS
WHERE fiscal_year    = 'FY2025'       -- prior fiscal year
  AND fiscal_quarter = 'Q1'
  AND owner_id IN (
    SELECT subordinate_sfdc_id
    FROM GTM_MART.REP_HIERARCHY
    WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}'
  )
GROUP BY segment, deal_type;
```

---

## Section 4 — User Scoping

All queries (both mcp-salesforce and mcp-snowflake) must be scoped by the requesting user's role. The mcp server sets the user context at connection time. Queries must not accept user identity as a parameter — the scope filter is injected by the server.

### Role Definitions

| Role | Scope | WHERE clause injected |
|---|---|---|
| `rep` | Own opportunities only | `owner_id = '{{ current_user_sfdc_id }}'` |
| `manager` | Full reporting tree (recursive) | `owner_id IN (SELECT subordinate_sfdc_id FROM GTM_MART.REP_HIERARCHY WHERE manager_sfdc_id = '{{ current_user_sfdc_id }}')` |
| `director` | Full segment | `segment = '{{ current_user_segment }}'` |
| `exec` | All — no filter | *(no WHERE clause added)* |
| `ops` | All — audit logged | *(no WHERE clause added, all queries logged)* |

Manager scoping is **recursive** — a manager sees all opportunities in their full reporting tree at any depth. `GTM_MART.REP_HIERARCHY` handles this. Build that view first.

---

## Open Questions for Analyst

These items require confirmation of Salesforce custom field API names before views and queries can be finalized.

| # | Question | Impact |
|---|---|---|
| 1 | What is the API name for the ARR field? Is it standard `Amount` or a custom field (e.g. `ARR__c`, `Net_ARR__c`)? | All queries, all views |
| 2 | What is the API name for the Segment field? Is it on Opportunity or Account? | All queries, all views, user scoping |
| 3 | What is the API name for the Deal Type field? Is it standard `Type` or custom? | All queries, all views |
| 4 | Does the VP Forecast come from standard `ForecastCategoryName` or a custom override field? | Open pipeline query, toggle pre-selection |
| 5 | What Snowflake database and schema house the raw Salesforce Opportunity data (e.g. `RAW.SFDC_OPPORTUNITIES`)? | Both Snowflake views |
| 6 | Is there an existing daily Opportunity snapshot table in Snowflake, or does the snapshot infrastructure need to be built from scratch? | `GTM_MART.PIPELINE_SNAPSHOTS` |
| 7 | ~~How deep is the manager reporting hierarchy?~~ **Decided: recursive.** `GTM_MART.REP_HIERARCHY` view required. | User scoping for `manager` role |
| 8 | Is `NorCal` a distinct segment value in Salesforce, or is it a sub-segment/territory of another segment? | Segment filter logic |

---

## Changelog

| Version | Date | Author | Notes |
|---|---|---|---|
| 0.1 | 2026-02-25 | GTM Ops | Initial draft from tool inspection |
