# Deal-Based Forecast

A deal-backed "path to forecast" tool for a SaaS GTM executive. Built with React + Vite + Tailwind CSS.

---

## What It Does

This is a closest-to-the-pin forecast tool. You manually toggle open pipeline deals as **In** (committed) or **Best Case** (upside), and two totals update in real time:

- **Closest to the Pin** = Closed Won ARR (auto) + all deals toggled In
- **Best Case** = Closest to the Pin + all deals toggled Best Case

In and Best Case are mutually exclusive per deal.

---

## Data Sources

The tool reads two Salesforce CSV exports placed in `public/data/`. Placeholder files are included for development.

### `public/data/closed_won_placeholder.csv`

Scope: Closed Won deals in the current fiscal quarter.

| Column | Description |
|---|---|
| `opportunity_name` | Opportunity Name |
| `account_name` | Account Name |
| `arr` | Annual Recurring Revenue |
| `close_date` | Close Date (YYYY-MM-DD) |
| `stage` | Stage |

### `public/data/open_pipeline_placeholder.csv`

Scope: Open pipeline deals in the current fiscal quarter with ARR ≥ $60K.

| Column | Description |
|---|---|
| `opportunity_name` | Opportunity Name |
| `account_name` | Account Name |
| `arr` | Annual Recurring Revenue |
| `close_date` | Close Date (YYYY-MM-DD) |
| `stage` | Stage |
| `vp_forecast` | VP Deal Forecast — valid values: `Commit`, `Best Case`, `Most Likely` |

**To connect live data:** replace the placeholder CSV files with your Salesforce exports. Column names must match exactly.

---

## Default Behavior

- Deals where `vp_forecast === 'Commit'` are pre-toggled **In** on load
- All other deals start with both toggles off
- Sort defaults to ARR descending; all column headers are clickable to re-sort

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Stack

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/)
- No backend — all state is client-side, no persistence
