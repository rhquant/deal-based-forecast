const fmt = (v) => v >= 1_000_000 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

function SummaryTable({ title, deals, titleClass }) {
  const total = deals.reduce((s, d) => s + d.arr, 0)

  return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${titleClass}`}>{title}</h3>
      {deals.length === 0 ? (
        <p className="text-sm text-sesame-400 italic">No deals selected</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sesame-300 text-sesame-500 text-xs uppercase tracking-wide">
              <th className="text-left pb-1 font-medium">Account</th>
              <th className="text-left pb-1 font-medium">Opportunity</th>
              <th className="text-right pb-1 font-medium">ARR</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-sesame-200">
                <td className="py-1 pr-2 text-sesame-700">{d.account_name}</td>
                <td className="py-1 pr-2 text-sesame-600 text-xs">{d.opportunity_name}</td>
                <td className="py-1 text-right font-medium text-licorice">{fmt(d.arr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-2 text-xs font-semibold text-sesame-500 uppercase tracking-wide">Total ARR</td>
              <td className="pt-2 text-right font-bold text-licorice">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

export default function SummaryTables({ inDeals, bcDeals }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 px-6 py-4 bg-sesame-100 border-b border-sesame-300">
      <SummaryTable title="In — Committed" deals={inDeals} titleClass="text-shamrock" />
      <div className="hidden sm:block w-px bg-sesame-300" />
      <SummaryTable title="Best Case — Upside" deals={bcDeals} titleClass="text-sesame-700" />
    </div>
  )
}
