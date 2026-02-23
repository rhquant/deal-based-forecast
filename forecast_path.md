# Forecast Path Tool

## Purpose

This tool provides a deal-backed "path to forecast" view for a SaaS GTM executive at end of quarter. It is a closest-to-the-pin forecast, not an expected value model. The user manually selects which open deals are "In" (committed) and which are "Best Case" (upside), and the tool calculates two totals in real time.

**Closest to the Pin** = Closed Won ARR (auto) + manually selected "In" deals  
**Best Case** = Closest to the Pin + manually selected "Best Case" deals

---

## Data Sources

Two Salesforce reports are required. Both should be scoped to the **current fiscal quarter**.

### Report 1: Closed Won Deals (`closed_won_report.csv`)

Filters:
- Stage = Closed Won
- Close Date = current fiscal quarter

Required fields:

| Field Label in SFDC | Expected CSV Column Name |
|---|---|
| Opportunity Name | `opportunity_name` |
| Account Name | `account_name` |
| ARR (Annual Recurring Revenue) | `arr` |
| Close Date | `close_date` |
| Stage | `stage` |

> **Placeholder**: Until the live report is connected, use `data/closed_won_placeholder.csv`. Total ARR from this report feeds directly into the Closest to the Pin baseline — individual deals are not displayed.

### Report 2: Open Pipeline Deals (`open_pipeline_report.csv`)

Filters:
- Stage != Closed Won, Closed Lost
- Close Date = current fiscal quarter
- ARR >= 60,000

Required fields:

| Field Label in SFDC | Expected CSV Column Name |
|---|---|
| Opportunity Name | `opportunity_name` |
| Account Name | `account_name` |
| ARR (Annual Recurring Revenue) | `arr` |
| Close Date | `close_date` |
| Stage | `stage` |
| VP Deal Forecast | `vp_forecast` |

> **Placeholder**: Until the live report is connected, use `data/open_pipeline_placeholder.csv`. Valid values for `vp_forecast`: `Commit`, `Best Case`, `Most Likely`.

---

## Placeholder Data

Create the following two CSV files under `data/` when initializing the tool.

### `data/closed_won_placeholder.csv`

```
opportunity_name,account_name,arr,close_date,stage
Acme Corp Expansion,Acme Corp,185000,2025-03-28,Closed Won
Globex New Logo,Globex,95000,2025-03-15,Closed Won
Initech Renewal Uplift,Initech,120000,2025-03-20,Closed Won
Umbrella Corp New,Umbrella Corp,240000,2025-03-10,Closed Won
```

### `data/open_pipeline_placeholder.csv`

```
opportunity_name,account_name,arr,close_date,stage,vp_forecast
Stark Industries Expansion,Stark Industries,310000,2025-03-31,Negotiation / Review,Commit
Wayne Enterprises New Logo,Wayne Enterprises,195000,2025-03-31,Negotiation / Review,Commit
Cyberdyne New Logo,Cyberdyne Systems,145000,2025-03-28,Proposal / Price Quote,Best Case
Oscorp Expansion,Oscorp,125000,2025-03-31,Proposal / Price Quote,Most Likely
Soylent Corp New Logo,Soylent Corp,98000,2025-03-29,Negotiation / Review,Best Case
Weyland-Yutani Renewal,Weyland-Yutani,87000,2025-03-25,Proposal / Price Quote,Most Likely
Nakatomi Trading New Logo,Nakatomi Trading,74000,2025-03-31,Proposal / Price Quote,Best Case
Momcorp Expansion,Momcorp,62000,2025-03-28,Needs Analysis,Most Likely
```

---

## Layout

The UI is structured top to bottom in three sections:

```
┌─────────────────────────────────────────────────────┐
│  SECTION 1: Forecast Totals (header bar)            │
│  Closest to the Pin: $X.XM   Best Case: $X.XM       │
├─────────────────────────────────────────────────────┤
│  SECTION 2: Summary Tables                          │
│  [ In Deals List ]       [ Best Case Deals List ]   │
├─────────────────────────────────────────────────────┤
│  SECTION 3: Deal Table (open pipeline, ARR > $60K)  │
│  [In] [BC] | Account | Opp | Stage | VP Fcst | ARR  │
└─────────────────────────────────────────────────────┘
```

---

## Section 1: Forecast Totals

Display two large numbers side by side.

| Metric | Calculation |
|---|---|
| **Closest to the Pin** | `sum(closed_won.arr)` + `sum(arr for deals where in_toggle = true)` |
| **Best Case** | Closest to the Pin + `sum(arr for deals where best_case_toggle = true)` |

- Numbers should display as currency, formatted to one decimal (e.g., `$4.2M`)
- Both numbers update instantly whenever a toggle changes in the deal table
- Closed Won total should be displayed as a sub-label beneath Closest to the Pin (e.g., "Closed Won baseline: $640K")

---

## Section 2: Summary Tables

Two side-by-side tables that update reactively as the user toggles deals below.

### "In" Deals Table (left)

Shows all open deals currently toggled as **In**.

Columns: Account Name | Opportunity Name | ARR

Footer row: **Total** | — | `sum(arr)`

### "Best Case" Deals Table (right)

Shows all open deals currently toggled as **Best Case**.

Columns: Account Name | Opportunity Name | ARR

Footer row: **Total** | — | `sum(arr)`

If no deals are selected for a bucket, display: *"No deals selected"*

---

## Section 3: Deal Table

Displays all open pipeline deals with ARR > $60K for the current quarter.

### Columns (left to right)

| Column | Description |
|---|---|
| **In** | Toggle button. When active, deal counts toward Closest to the Pin. |
| **Best Case** | Toggle button. When active, deal counts toward Best Case upside. |
| **Account Name** | `account_name` from report |
| **Opportunity Name** | `opportunity_name` from report |
| **Stage** | `stage` from report |
| **VP Forecast** | `vp_forecast` from report — display with color coding: Commit = green, Best Case = yellow, Most Likely = blue |
| **ARR** | `arr` from report, formatted as currency |
| **Close Date** | `close_date` from report, formatted as MMM DD |

### Toggle Behavior

- **In** and **Best Case** are mutually exclusive per deal — selecting one automatically deactivates the other
- Toggles are styled as small pill buttons to the left of the deal row
- Active state should be visually distinct (filled/colored); inactive state should be outlined/ghost
- **In** button color: solid blue when active
- **Best Case** button color: solid amber when active

### Sort Order

Default sort: ARR descending. Allow column header click to re-sort.

### Filtering

- Only show deals with `arr >= 60000`
- Only show open deals (exclude Closed Won / Closed Lost)

---

## Implementation Notes

- This is a single-page tool, no routing needed
- All state is managed client-side; no backend persistence required
- The tool should be buildable as a React component or standalone HTML/JS file
- When SFDC reports become available, the CSV paths in `data/` are the only thing that needs to change — the logic should be data-agnostic
- Currency formatting helper: values >= 1,000,000 display as `$X.XM`; values < 1,000,000 display as `$XXXK`
- The tool is used by a single executive at end of quarter — optimize for clarity and speed of use, not configurability
- Default state: all toggles off; user builds their forecast from scratch each session

---

## File Structure

```
forecast_path/
├── forecast_path.md         # This file — spec and instructions
├── data/
│   ├── closed_won_placeholder.csv
│   └── open_pipeline_placeholder.csv
├── components/
│   ├── ForecastTotals.jsx   # Section 1
│   ├── SummaryTables.jsx    # Section 2
│   └── DealTable.jsx        # Section 3
└── ForecastPath.jsx         # Root component, loads data, owns state
```
