const fmt = (v) => {
  if (v === 0) return '$0'
  return Math.abs(v) >= 1_000_000
    ? `$${(v / 1e6).toFixed(1)}M`
    : `$${Math.round(v / 1000)}K`
}

const fmtYY = (val, compare) => {
  if (!compare) return null
  const pct = Math.round(((val - compare) / compare) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% y/y`
}

// 5-column layout: label | all $ | all y/y | nb $ | nb y/y
function Row({ label, all, nb, subtotal, total, yyAll, yyNB }) {
  const isAccent = subtotal || total
  const tdBase = `text-xs ${isAccent ? 'font-semibold text-licorice' : 'text-sesame-600'}`
  const borderStyle = subtotal
    ? { borderTop: '1px solid #D5D5D2' }
    : total
    ? { borderTop: '3px double #42433E' }
    : {}

  return (
    <tr>
      <td className={`${tdBase} py-1 pr-6`}>{label}</td>
      <td className={`${tdBase} text-right tabular-nums pl-8 whitespace-nowrap py-1`} style={borderStyle}>
        {fmt(all)}
      </td>
      <td className={`text-[10px] font-normal text-sesame-400 pl-2 whitespace-nowrap py-1 pr-8`} style={borderStyle}>
        {yyAll != null ? fmtYY(all, yyAll) : ''}
      </td>
      <td className={`${tdBase} text-right tabular-nums pl-8 whitespace-nowrap py-1`} style={borderStyle}>
        {fmt(nb)}
      </td>
      <td className={`text-[10px] font-normal text-sesame-400 pl-2 whitespace-nowrap py-1`} style={borderStyle}>
        {yyNB != null ? fmtYY(nb, yyNB) : ''}
      </td>
    </tr>
  )
}

export default function ForecastTotals({
  closedWonTotal, inTotal, closestToPin, mostLikelyTotal, upside,
  closedWonNB, inNB, closestToPinNB, mostLikelyNB, upsideNB,
  yyCtpAll = 700000,  yyBestAll = 900000,
  yyCtpNB  = 350000,  yyBestNB  = 450000,
}) {
  return (
    <div className="bg-coconut px-6 py-5 border-b border-sesame-300">
      <table>
        <thead>
          <tr className="border-b border-sesame-300">
            <th className="text-left text-[10px] font-bold uppercase tracking-widest text-sesame-500 pb-2 pr-6">
              Q1 Forecast
            </th>
            <th className="text-right text-[10px] font-bold uppercase tracking-widest text-sesame-500 pb-2 pl-8 whitespace-nowrap">
              All
            </th>
            <th />
            <th className="text-right text-[10px] font-bold uppercase tracking-widest text-sesame-500 pb-2 pl-8 whitespace-nowrap">
              New Biz
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <Row label="Closed Won"           all={closedWonTotal}  nb={closedWonNB} />
          <Row label="In (Commit)"          all={inTotal}         nb={inNB} />
          <Row label="Closest to Pin"       all={closestToPin}    nb={closestToPinNB} subtotal yyAll={yyCtpAll}  yyNB={yyCtpNB} />
          <Row label="Most Likely (Upside)" all={mostLikelyTotal} nb={mostLikelyNB} />
          <Row label="Best Case"            all={upside}          nb={upsideNB}       total   yyAll={yyBestAll} yyNB={yyBestNB} />
        </tbody>
      </table>
    </div>
  )
}
