const YY_COMPARE = 1_000_000
const PLAN       = 1_500_000

const fmt = (v) => {
  if (v === 0) return '$0'
  return Math.abs(v) >= 1_000_000
    ? `$${(v / 1e6).toFixed(1)}M`
    : `$${Math.round(v / 1000)}K`
}

function fmtDelta(actual, compare) {
  const d = actual - compare
  const abs = Math.abs(d)
  const formatted = abs >= 1_000_000 ? `$${(abs / 1e6).toFixed(1)}M` : `$${Math.round(abs / 1000)}K`
  return { str: `${d >= 0 ? '+' : '−'}${formatted}`, positive: d >= 0 }
}

function Divider() {
  return <div className="border-t border-sesame-700 my-0.5" />
}

function LineRow({ op, label, value }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sesame-600 text-xs w-3 shrink-0 text-right">{op}</span>
      <span className="text-sesame-500 text-xs uppercase tracking-widest w-28 shrink-0">{label}</span>
      <span className="text-sesame-300 text-sm font-medium tabular-nums">{fmt(value)}</span>
    </div>
  )
}

function TotalRow({ label, value, valueClass }) {
  const yy = fmtDelta(value, YY_COMPARE)
  const pl = fmtDelta(value, PLAN)

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-2">
      <span className="text-sesame-600 text-xs w-3 shrink-0 text-right">=</span>
      <span className="text-sesame-300 text-[11px] uppercase tracking-widest w-28 shrink-0 font-bold">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${valueClass}`}>{fmt(value)}</span>

      <div className="ml-2 flex items-baseline gap-4 text-xs">
        <span className="text-sesame-600 uppercase tracking-wider text-[10px]">Y/Y</span>
        <span className="text-sesame-400 tabular-nums">{fmt(YY_COMPARE)}</span>
        <span className={`tabular-nums font-medium ${yy.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>
          ({yy.str})
        </span>

        <span className="text-sesame-700 mx-1">·</span>

        <span className="text-sesame-600 uppercase tracking-wider text-[10px]">Plan</span>
        <span className="text-sesame-400 tabular-nums">{fmt(PLAN)}</span>
        <span className={`tabular-nums font-medium ${pl.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>
          ({pl.str})
        </span>
      </div>
    </div>
  )
}

export default function ForecastTotals({ closedWonTotal, inTotal, closestToPin, mostLikelyTotal, upside }) {
  return (
    <div className="bg-licorice px-6 py-4">
      <LineRow op=""  label="Closed Won"   value={closedWonTotal} />
      <LineRow op="+" label="In Deals"     value={inTotal} />
      <Divider />
      <TotalRow label="CTTP"        value={closestToPin}    valueClass="text-matcha" />
      <LineRow op="+" label="Most Likely"  value={mostLikelyTotal} />
      <Divider />
      <TotalRow label="Upside"      value={upside}          valueClass="text-pineapple" />
    </div>
  )
}
