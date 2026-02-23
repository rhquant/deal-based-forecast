const YY_COMPARE = 1_000_000
const PLAN       = 1_500_000

const fmt = (v) => {
  if (v === 0) return '$0'
  return Math.abs(v) >= 1_000_000
    ? `$${(v / 1e6).toFixed(1)}M`
    : `$${Math.round(v / 1000)}K`
}

function fmtPct(actual, compare) {
  if (compare === 0) return { str: '—', positive: true }
  const pct = Math.round(((actual - compare) / compare) * 100)
  return { str: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

function fmtDelta(actual, compare) {
  const d = actual - compare
  const abs = Math.abs(d)
  const formatted = abs >= 1_000_000 ? `$${(abs / 1e6).toFixed(1)}M` : `$${Math.round(abs / 1000)}K`
  return { str: `${d >= 0 ? '+' : '−'}${formatted}`, positive: d >= 0 }
}

// Divider spans all 4 grid columns
function Divider() {
  return <div className="col-span-4 border-t border-sesame-700" />
}

// Regular additive row — no comparisons
function LineRow({ op, label, value }) {
  return (
    <>
      <span className="text-sesame-600 text-xs text-right">{op}</span>
      <span className="text-sesame-500 text-xs uppercase tracking-widest">{label}</span>
      <span className="text-sesame-300 text-xs tabular-nums text-right">{fmt(value)}</span>
      <span />
    </>
  )
}

// Subtotal row — bold value + Y/Y % + Plan $
function TotalRow({ label, value, valueClass }) {
  const yyPct   = fmtPct(value, YY_COMPARE)
  const yyDelta = fmtDelta(value, YY_COMPARE)
  const plPct   = fmtPct(value, PLAN)
  const plDelta = fmtDelta(value, PLAN)

  return (
    <>
      <span className="text-sesame-600 text-xs text-right">=</span>
      <span className="text-sesame-300 text-xs uppercase tracking-widest font-bold">{label}</span>
      <span className={`text-xs font-bold tabular-nums text-right ${valueClass}`}>{fmt(value)}</span>
      <span className="flex items-center gap-1.5 text-xs pl-4">
        <span className={`tabular-nums font-medium ${yyPct.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>{yyPct.str}</span>
        <span className="text-sesame-600 uppercase tracking-wider text-[10px]">Y/Y</span>
        <span className={`tabular-nums ${yyDelta.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>({yyDelta.str})</span>

        <span className="text-sesame-700 mx-1">·</span>

        <span className={`tabular-nums font-medium ${plPct.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>{plPct.str}</span>
        <span className="text-sesame-600 uppercase tracking-wider text-[10px]">vs Plan</span>
        <span className={`tabular-nums ${plDelta.positive ? 'text-matcha-400' : 'text-sesame-500'}`}>({plDelta.str})</span>
      </span>
    </>
  )
}

export default function ForecastTotals({ closedWonTotal, inTotal, closestToPin, mostLikelyTotal, upside }) {
  return (
    <div
      className="bg-licorice px-6 py-4"
      style={{
        display: 'grid',
        gridTemplateColumns: '1rem 8rem 5rem 1fr',
        columnGap: '0.75rem',
        rowGap: '0.5rem',
        alignItems: 'center',
      }}
    >
      <LineRow op=""  label="Closed Won"  value={closedWonTotal} />
      <LineRow op="+" label="In Deals"    value={inTotal} />
      <Divider />
      <TotalRow label="CTTP"       value={closestToPin}   valueClass="text-matcha" />
      <LineRow op="+" label="Most Likely" value={mostLikelyTotal} />
      <Divider />
      <TotalRow label="Upside"     value={upside}         valueClass="text-pineapple" />
    </div>
  )
}
