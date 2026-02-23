# Forecast Path Tool

## Purpose

A deal-backed "path to forecast" tool for a SaaS GTM executive at end of quarter. This is a closest-to-the-pin forecast — not an expected value model. The user manually toggles open pipeline deals as **In** (committed) or **Best Case** (upside), and totals update in real time.

Two views are shown side by side: a **total forecast** across all deal types, and a **New Business-only** view filtered to new logos.

---

## Stack

- **React 18 + Vite 5** — standalone app, no routing, single page
- **Tailwind CSS v3** — utility classes only; brand colors registered as custom tokens
- **Brand colors** — defined in `brand.md`, registered in `tailwind.config.js`
- **No backend** — all state is client-side, no persistence
- **Data** — two CSV files fetched at runtime from `public/data/` via `fetch()`

---

## Deal Types

Every deal (open pipeline and closed won) carries a `deal_type` field with one of two values:

| Value | Description |
|---|---|
| `New Business` | New logo acquisition |
| `Expansion` | Expansion into an existing customer account |

This field drives the New Business bridge and the Type badge in the deal table.

---

## Data Sources

Two Salesforce CSV exports are required, scoped to the **current fiscal quarter**, placed in `public/data/`.

### Report 1: Closed Won (`closed_won_placeholder.csv`)

Filters: Stage = Closed Won, Close Date = current fiscal quarter

| CSV Column | SFDC Field |
|---|---|
| `opportunity_name` | Opportunity Name |
| `account_name` | Account Name |
| `arr` | ARR (Annual Recurring Revenue) |
| `close_date` | Close Date (YYYY-MM-DD) |
| `stage` | Stage |
| `deal_type` | Deal Type — `New Business` or `Expansion` |

### Report 2: Open Pipeline (`open_pipeline_placeholder.csv`)

Filters: Stage != Closed Won/Lost, Close Date = current fiscal quarter, ARR >= $60K

| CSV Column | SFDC Field |
|---|---|
| `opportunity_name` | Opportunity Name |
| `account_name` | Account Name |
| `arr` | ARR (Annual Recurring Revenue) |
| `close_date` | Close Date (YYYY-MM-DD) |
| `stage` | Stage |
| `vp_forecast` | VP Deal Forecast — `Commit`, `Best Case`, or `Most Likely` |
| `deal_type` | Deal Type — `New Business` or `Expansion` |

> **To connect live data:** drop replacement CSVs into `public/data/` with matching column names. No code changes needed.

---

## Placeholder Data

### `public/data/closed_won_placeholder.csv`

```
opportunity_name,account_name,arr,close_date,stage,deal_type
Acme Corp Expansion,Acme Corp,185000,2025-03-28,Closed Won,Expansion
Globex New Logo,Globex,95000,2025-03-15,Closed Won,New Business
Initech Renewal Uplift,Initech,120000,2025-03-20,Closed Won,Expansion
Umbrella Corp New,Umbrella Corp,240000,2025-03-10,Closed Won,New Business
```

### `public/data/open_pipeline_placeholder.csv`

```
opportunity_name,account_name,arr,close_date,stage,vp_forecast,deal_type
Stark Industries Expansion,Stark Industries,310000,2025-03-31,Negotiation / Review,Commit,Expansion
Wayne Enterprises New Logo,Wayne Enterprises,195000,2025-03-31,Negotiation / Review,Commit,New Business
Cyberdyne New Logo,Cyberdyne Systems,145000,2025-03-28,Proposal / Price Quote,Best Case,New Business
Oscorp Expansion,Oscorp,125000,2025-03-31,Proposal / Price Quote,Most Likely,Expansion
Soylent Corp New Logo,Soylent Corp,98000,2025-03-29,Negotiation / Review,Best Case,New Business
Weyland-Yutani Renewal,Weyland-Yutani,87000,2025-03-25,Proposal / Price Quote,Most Likely,Expansion
Nakatomi Trading New Logo,Nakatomi Trading,74000,2025-03-31,Proposal / Price Quote,Best Case,New Business
Momcorp Expansion,Momcorp,62000,2025-03-28,Needs Analysis,Most Likely,Expansion
```

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  SECTION 1: Dual Forecast Bridges                                    │
│  [ Q1 Forecast — All Deals ] │ [ New Business — New Logos Only ]     │
│  Closed Won        $640K     │  Closed Won        $335K              │
│  + In Deals        $505K     │  + In Deals        $195K              │
│  ────────────────────────    │  ──────────────────────────           │
│  = CTTP            $1.1M  ···│  = CTTP            $530K  ···         │
│  + Most Likely     $0        │  + Most Likely     $0                 │
│  ────────────────────────    │  ──────────────────────────           │
│  = Upside          $1.1M  ···│  = Upside          $530K  ···         │
├──────────────────────────────────────────────────────────────────────┤
│  SECTION 2: Summary Tables                                           │
│  [ In — Committed ]          │  [ Best Case — Upside ]               │
├──────────────────────────────────────────────────────────────────────┤
│  SECTION 3: Open Pipeline Deal Table                                 │
│  [In] [BC] │ Account │ Opp │ Stage │ Type │ VP Forecast │ ARR │ Date │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Forecast Bridges

Two bridges displayed side by side. Left = all deals. Right = New Business only. Both react live to toggle changes.

### Bridge Math (additive waterfall)

```
  Closed Won          $XXX      ← sum of all closed won deals (auto)
+ In Deals            $XXX      ← sum of open deals with inToggle = true
────────────────────────────
= CTTP                $X.XM     ← Closest to the Pin
+ Most Likely         $XXX      ← sum of open deals with bestCaseToggle = true
────────────────────────────
= Upside              $X.XM     ← CTTP + Most Likely toggled deals
```

### Comparison Columns (on CTTP and Upside rows only)

Each subtotal row shows two comparisons inline:

```
xx% Y/Y (+/-$xx)   ·   xx% vs Plan (+/-$xx)
```

| Comparison | Current placeholder | To update |
|---|---|---|
| Y/Y | $1,000,000 | `yyCompare` prop on `<ForecastTotals>` |
| vs Plan | $1,500,000 | `plan` prop on `<ForecastTotals>` |

- Positive delta → Matcha green
- Negative delta → muted sesame

### Visual Differentiation

| Bridge | Background | Purpose |
|---|---|---|
| Q1 Forecast | Licorice `#11110D` (near-black) | All deal types |
| New Business | Fern `#203524` (dark green) | New logos only |

---

## Section 2: Summary Tables

Two side-by-side tables on a Sesame background. Update reactively as deals are toggled.

- **Left — "In — Committed"**: deals with `inToggle = true`
- **Right — "Best Case — Upside"**: deals with `bestCaseToggle = true`

Columns: Account | Opportunity | ARR. Footer: Total ARR.

No deal-type breakout in these tables.

---

## Section 3: Deal Table

All open pipeline deals, default sort ARR descending. All column headers are clickable to re-sort.

### Columns

| Column | Source | Notes |
|---|---|---|
| **In** | Toggle | Adds deal to CTTP. Mutually exclusive with BC. |
| **BC** | Toggle | Adds deal to Most Likely / Upside. Mutually exclusive with In. |
| **Account** | `account_name` | |
| **Opportunity** | `opportunity_name` | |
| **Stage** | `stage` | |
| **Type** | `deal_type` | Badge: New Business = matcha, Expansion = sesame |
| **VP Forecast** | `vp_forecast` | Badge: Commit = green, Best Case = yellow, Most Likely = neutral |
| **ARR** | `arr` | Right-aligned, formatted as $XK or $X.XM |
| **Close Date** | `close_date` | Formatted as MMM D |

### Toggle Behavior

- Deals where `vp_forecast === 'Commit'` are pre-toggled **In** on load
- All other deals start with both toggles off
- In and BC are mutually exclusive per deal — activating one clears the other

---

## Brand Colors

Defined in `brand.md`. Registered in `tailwind.config.js` under `theme.extend.colors`.

| Token | Hex | Usage |
|---|---|---|
| `licorice` | `#11110D` | Total forecast bridge background, primary text |
| `coconut` | `#FFFFFF` | Page background, text on dark |
| `matcha` | `#D1F470` | CTTP value, New Business type badge background |
| `pineapple` | `#FEEB7E` | Upside value, BC toggle active, Best Case VP badge |
| `sesame-100` | `#F5F5F2` | Page header, summary tables background |
| `sesame-200` | `#E5E5E2` | Table header row, borders |
| `sesame-500–700` | various | Body text, muted labels |
| `cactus` | `#A1D78F` | Commit VP badge background |
| `shamrock` | `#2D4C33` | In toggle active, Commit VP badge text |
| `fern` | `#203524` | New Business bridge background |

---

## Currency Formatting

```
value >= $1,000,000  →  $X.XM  (one decimal)
value <  $1,000,000  →  $XXXK  (rounded to nearest $1K)
value === 0          →  $0
```

---

## File Structure

```
deal-backed-forecast/
├── brand.md                          # Brand color reference
├── forecast_path.md                  # This file
├── package.json                      # "forecast-path", React + Vite + Tailwind
├── vite.config.js
├── tailwind.config.js                # Brand colors registered here
├── postcss.config.js
├── index.html
├── public/
│   └── data/
│       ├── closed_won_placeholder.csv
│       └── open_pipeline_placeholder.csv
└── src/
    ├── main.jsx
    ├── index.css                     # @tailwind directives only
    ├── App.jsx                       # Root — owns all state, computes totals
    └── components/
        ├── ForecastTotals.jsx        # Section 1 — bridge waterfall
        ├── SummaryTables.jsx         # Section 2 — In / BC deal lists
        └── DealTable.jsx             # Section 3 — sortable pipeline table
```

---

## Running Locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## Repo

`https://github.com/rhquant/deal-based-forecast`
