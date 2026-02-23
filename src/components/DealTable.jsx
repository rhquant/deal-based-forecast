const fmt = (v) => v >= 1_000_000 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

const fmtDate = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const VP_BADGE = {
  'Commit':      'bg-cactus text-fern',
  'Best Case':   'bg-pineapple text-licorice',
  'Most Likely': 'bg-sesame-200 text-sesame-700',
}

const COLS = [
  { key: 'account_name',     label: 'Account' },
  { key: 'opportunity_name', label: 'Opportunity' },
  { key: 'stage',            label: 'Stage' },
  { key: 'vp_forecast',      label: 'VP Forecast' },
  { key: 'arr',              label: 'ARR' },
  { key: 'close_date',       label: 'Close Date' },
]

function SortIndicator({ column, sortConfig }) {
  if (sortConfig.column !== column) return <span className="ml-1 text-sesame-400">↕</span>
  return <span className="ml-1 text-matcha-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
}

export default function DealTable({ deals, sortConfig, onSort, onToggle }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sesame-200 border-b border-sesame-300">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-sesame-600 w-14">In</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-sesame-600 w-14">BC</th>
            {COLS.map(({ key, label }) => (
              <th
                key={key}
                className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-sesame-600 cursor-pointer hover:text-licorice select-none whitespace-nowrap"
                onClick={() => onSort(key)}
              >
                {label}
                <SortIndicator column={key} sortConfig={sortConfig} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b border-sesame-200 hover:bg-sesame-100">
              <td className="px-3 py-2">
                <button
                  onClick={() => onToggle(deal.id, 'in')}
                  className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${
                    deal.inToggle
                      ? 'bg-shamrock text-coconut border-shamrock'
                      : 'bg-coconut text-shamrock border-shamrock hover:bg-sesame-100'
                  }`}
                >
                  In
                </button>
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onToggle(deal.id, 'bc')}
                  className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${
                    deal.bestCaseToggle
                      ? 'bg-pineapple text-licorice border-pineapple'
                      : 'bg-coconut text-sesame-600 border-sesame-400 hover:border-sesame-600'
                  }`}
                >
                  BC
                </button>
              </td>
              <td className="px-3 py-2 text-sesame-700 whitespace-nowrap">{deal.account_name}</td>
              <td className="px-3 py-2 text-sesame-600 max-w-xs truncate">{deal.opportunity_name}</td>
              <td className="px-3 py-2 text-sesame-600 whitespace-nowrap">{deal.stage}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${VP_BADGE[deal.vp_forecast] ?? 'bg-sesame-200 text-sesame-700'}`}>
                  {deal.vp_forecast}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-licorice whitespace-nowrap">{fmt(deal.arr)}</td>
              <td className="px-3 py-2 text-sesame-500 whitespace-nowrap">{fmtDate(deal.close_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
