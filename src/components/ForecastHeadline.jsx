const fmt = (v) => v >= 1_000_000 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

const fmtYY = (val, compare) => {
  if (!compare) return null
  const pct = Math.round(((val - compare) / compare) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% y/y`
}

function StatBlock({ label, value, colorClass, yyCompare }) {
  const yy = yyCompare ? fmtYY(value, yyCompare) : null
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-sesame-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold tracking-tight tabular-nums ${colorClass}`}>{fmt(value)}</div>
      {yy && <div className="text-xs text-sesame-400 mt-1">{yy}</div>}
    </div>
  )
}

export default function ForecastHeadline({
  upside, upsideNB,
  yyBestAll = 900_000, yyBestNB = 450_000,
}) {
  return (
    <div className="bg-coconut border-b border-sesame-300 px-6 py-5 flex items-start gap-10">
      <StatBlock label="Deal-Backed Forecast"    value={upside}         colorClass="text-pineapple" yyCompare={yyBestAll} />
      <StatBlock label="New Biz"                 value={upsideNB}       colorClass="text-pineapple" yyCompare={yyBestNB}  />
    </div>
  )
}
