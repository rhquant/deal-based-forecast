const fmt = (v) => {
  if (v === 0) return '$0'
  return Math.abs(v) >= 1_000_000
    ? `$${(v / 1e6).toFixed(1)}M`
    : `$${Math.round(v / 1000)}K`
}

const fmtPct = (val, quota) => {
  if (!quota) return '—'
  return `${Math.round((val / quota) * 100)}%`
}

const fmtYY = (val, compare) => {
  if (!compare) return '—'
  const pct = Math.round(((val - compare) / compare) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

const HEADERS = ['Segment', 'Closed Won', 'In', 'CTTP', 'Y/Y', 'Best Case', 'Quota', 'Att%']

function RollupRow({ row, isTotal, quota, priorYearCttp }) {
  const cttp     = row.closedWon + row.inArr
  const bestCase = row.closedWon + row.bcArr

  const tdNum   = `text-xs text-right tabular-nums pl-6 py-1 whitespace-nowrap ${isTotal ? 'font-semibold text-licorice' : 'text-sesame-600'}`
  const tdMuted = 'text-xs text-right tabular-nums pl-6 py-1 whitespace-nowrap text-sesame-400'

  return (
    <tr className={isTotal ? 'border-b border-sesame-300' : ''}>
      <td className={`text-xs py-1 pr-6 whitespace-nowrap ${isTotal ? 'font-semibold text-licorice' : 'text-sesame-600 pl-4'}`}>
        {row.segment}
      </td>
      <td className={tdNum}>{fmt(row.closedWon)}</td>
      <td className={tdNum}>{fmt(row.inArr)}</td>
      <td className={tdNum}>{fmt(cttp)}</td>
      <td className={tdMuted}>{fmtYY(cttp, priorYearCttp)}</td>
      <td className={tdNum}>{fmt(bestCase)}</td>
      <td className={tdMuted}>{quota ? fmt(quota) : '—'}</td>
      <td className={tdMuted}>{fmtPct(cttp, quota)}</td>
    </tr>
  )
}

export default function RepRollup({ rollup, quotaBySegment = {}, yyBySegment = {} }) {
  const { total, rows } = rollup

  const totalQuota      = Object.values(quotaBySegment).reduce((s, q) => s + (q || 0), 0)
  const totalPriorYear  = Object.values(yyBySegment).reduce((s, v) => s + (v || 0), 0)

  return (
    <div className="bg-coconut px-6 py-5 flex-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-sesame-500 mb-3">
        Segment Rollup
      </div>
      <table>
        <thead>
          <tr className="border-b border-sesame-300">
            {HEADERS.map((h, i) => (
              <th
                key={h}
                className={`text-[10px] font-bold uppercase tracking-widest text-sesame-500 pb-2 whitespace-nowrap ${
                  i === 0 ? 'text-left pr-6' : 'text-right pl-6'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <RollupRow row={total} isTotal quota={totalQuota} priorYearCttp={totalPriorYear} />
          {rows.map(row => (
            <RollupRow
              key={row.segment}
              row={row}
              isTotal={false}
              quota={quotaBySegment[row.segment] || 0}
              priorYearCttp={yyBySegment[row.segment] || 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
