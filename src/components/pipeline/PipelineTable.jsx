const fmt = (v) => {
  if (!v && v !== 0) return '—'
  const abs = Math.abs(v)
  return abs >= 1_000_000 ? `$${(abs / 1e6).toFixed(1)}M` : `$${Math.round(abs / 1000)}K`
}

const fmtDate = (s) => {
  if (!s || !s.trim()) return '—'
  const d = new Date(s.trim())
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TYPE_BADGE = {
  'New Business': 'bg-matcha-000 text-shamrock',
  'Expansion':    'bg-sesame-200 text-sesame-700',
}

const CHANGE_TYPE_ORDER = [
  'Closed Won', 'Closed Lost', 'Slipped', 'Pushed',
  'New', 'ARR Increase', 'ARR Decrease', 'Active',
]

const CHANGE_PRIORITY = Object.fromEntries(CHANGE_TYPE_ORDER.map((ct, i) => [ct, i]))

const CHANGE_COLORS = {
  'Closed Won':   'bg-cactus text-shamrock',
  'Closed Lost':  'bg-sesame-300 text-sesame-700',
  'Slipped':      'bg-pineapple text-licorice',
  'Pushed':       'bg-sesame-200 text-sesame-700',
  'New':          'bg-matcha text-shamrock',
  'ARR Increase': 'bg-matcha-000 text-shamrock',
  'ARR Decrease': 'bg-pineapple text-licorice',
}

const describeChange = (row) => {
  switch (row.change_type) {
    case 'ARR Increase':
    case 'ARR Decrease':
      return `ARR ${fmt(row.snapshot_arr)} → ${fmt(row.current_arr)}`
    case 'Slipped':
    case 'Pushed':
      return `Close date ${fmtDate(row.snapshot_close_date)} → ${fmtDate(row.current_close_date)}`
    case 'New':
      return 'Added to pipeline'
    case 'Closed Won':
      return 'Won'
    case 'Closed Lost':
      return 'Lost'
    default:
      return '—'
  }
}

export default function PipelineTable({ rows }) {
  const sorted = [...rows].sort((a, b) => {
    const pa = CHANGE_PRIORITY[a.change_type] ?? 99
    const pb = CHANGE_PRIORITY[b.change_type] ?? 99
    if (pa !== pb) return pa - pb
    return (b.current_arr || b.snapshot_arr) - (a.current_arr || a.snapshot_arr)
  })

  if (!sorted.length) {
    return (
      <div className="px-6 py-10 text-center text-sesame-400 text-sm italic">
        No deals match the current filters
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sesame-200 border-b border-sesame-300">
            {['Change', 'Account', 'Opportunity', 'Type', 'Stage', 'ARR', 'Close Date', 'What changed'].map(label => (
              <th
                key={label}
                className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-sesame-600 whitespace-nowrap"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const badge = CHANGE_COLORS[row.change_type]
            const displayArr = row.current_arr || row.snapshot_arr

            return (
              <tr key={i} className="border-b border-sesame-200 hover:bg-sesame-100">
                <td className="px-3 py-2 whitespace-nowrap">
                  {badge && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge}`}>
                      {row.change_type}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-sesame-700 whitespace-nowrap">{row.account_name}</td>
                <td className="px-3 py-2 text-sesame-600 max-w-[220px] truncate">{row.opportunity_name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_BADGE[row.deal_type] ?? 'bg-sesame-200 text-sesame-700'}`}>
                    {row.deal_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-sesame-600 whitespace-nowrap text-xs">
                  {row.current_stage || row.snapshot_stage || '—'}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-licorice whitespace-nowrap">
                  {displayArr ? fmt(displayArr) : '—'}
                </td>
                <td className="px-3 py-2 text-sesame-500 whitespace-nowrap text-xs">
                  {fmtDate(row.current_close_date || row.snapshot_close_date)}
                </td>
                <td className="px-3 py-2 text-sesame-500 whitespace-nowrap text-xs">
                  {describeChange(row)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
