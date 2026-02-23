const fmt = (v) => v >= 1_000_000 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

export default function ForecastTotals({ closestToPin, bestCase, closedWonTotal }) {
  return (
    <div className="bg-licorice text-coconut px-6 py-5 flex flex-col sm:flex-row gap-6 sm:gap-12">
      <div>
        <div className="text-3xl font-bold tracking-tight text-matcha">{fmt(closestToPin)}</div>
        <div className="text-xs font-bold uppercase tracking-widest text-sesame-500 mt-1">Closest to the Pin</div>
        <div className="text-xs text-sesame-600 mt-0.5">Closed Won baseline: {fmt(closedWonTotal)}</div>
      </div>
      <div className="sm:border-l sm:border-sesame-700 sm:pl-12">
        <div className="text-3xl font-bold tracking-tight text-pineapple">{fmt(bestCase)}</div>
        <div className="text-xs font-bold uppercase tracking-widest text-sesame-500 mt-1">Best Case</div>
        <div className="text-xs text-sesame-600 mt-0.5">Includes all toggled upside</div>
      </div>
    </div>
  )
}
