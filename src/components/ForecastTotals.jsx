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

function DashedSeparator() {
  return (
    <tr>
      <td colSpan={5} style={{ borderTop: '1px dashed #B4B4B0' }} className="pt-1" />
    </tr>
  )
}

function QuotaRow({ label, all, nb }) {
  const td = 'text-xs text-sesame-600 py-1'
  return (
    <tr>
      <td className={`${td} pr-6`}>{label}</td>
      <td className={`${td} text-right tabular-nums pl-8 whitespace-nowrap`}>{fmt(all)}</td>
      <td className="pl-2 pr-8" />
      <td className={`${td} text-right tabular-nums pl-8 whitespace-nowrap`}>{fmt(nb)}</td>
      <td />
    </tr>
  )
}

function GapRow({ all, nb, attAll, attNB }) {
  const td = 'text-xs text-sesame-600 py-1'
  const fmtAtt = (v) => (isFinite(v) && v > 0 ? `${Math.round(v * 100)}%` : '—')
  return (
    <tr>
      <td className={`${td} pr-6`}>Gap / Att%</td>
      <td className={`${td} text-right tabular-nums pl-8 whitespace-nowrap`}>
        {fmt(all)}
        <span className="text-[10px] text-sesame-400 ml-1">{fmtAtt(attAll)}</span>
      </td>
      <td className="pl-2 pr-8" />
      <td className={`${td} text-right tabular-nums pl-8 whitespace-nowrap`}>
        {fmt(nb)}
        <span className="text-[10px] text-sesame-400 ml-1">{fmtAtt(attNB)}</span>
      </td>
      <td />
    </tr>
  )
}

export default function ForecastTotals({
  closedWonTotal, inTotal, closestToPin, mostLikelyTotal, upside,
  closedWonNB, inNB, closestToPinNB, mostLikelyNB, upsideNB,
  yyCtpAll = 700000,  yyBestAll = 900000,
  yyCtpNB  = 350000,  yyBestNB  = 450000,
  quotaAll = 1_500_000, quotaNB = 750_000,
}) {
  return (
    <div className="bg-coconut px-6 py-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-sesame-500 mb-3">
        Q1 Forecast
      </div>
      <table>
        <thead>
          <tr className="border-b border-sesame-300">
            <th className="pb-2 pr-6" />
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
          <DashedSeparator />
          <QuotaRow label="Quota" all={quotaAll}            nb={quotaNB} />
          <GapRow                 all={upside - quotaAll}   nb={upsideNB - quotaNB}
                                  attAll={upside / quotaAll} attNB={upsideNB / quotaNB} />
        </tbody>
      </table>
    </div>
  )
}
