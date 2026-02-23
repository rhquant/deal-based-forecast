import { useState, useEffect, useMemo } from 'react'
import ForecastTotals from './components/ForecastTotals'
import SummaryTables from './components/SummaryTables'
import DealTable from './components/DealTable'

const parseCSV = (text) => {
  const [headerLine, ...rows] = text.trim().split('\n')
  const headers = headerLine.split(',').map(h => h.trim())
  return rows.map(row => {
    const vals = row.split(',').map(v => v.trim())
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] }), {})
  })
}

const NB = (d) => d.deal_type === 'New Business'

export default function App() {
  const [closedWonDeals, setClosedWonDeals] = useState([])
  const [deals, setDeals] = useState([])
  const [sortConfig, setSortConfig] = useState({ column: 'arr', direction: 'desc' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/closed_won_placeholder.csv').then(r => r.text()),
      fetch('/data/open_pipeline_placeholder.csv').then(r => r.text()),
    ])
      .then(([cwText, opText]) => {
        const cw = parseCSV(cwText).map(d => ({ ...d, arr: Number(d.arr) }))
        const op = parseCSV(opText).map((d, i) => ({
          ...d,
          id: i,
          arr: Number(d.arr),
          inToggle: d.vp_forecast === 'Commit',
          bestCaseToggle: false,
        }))
        setClosedWonDeals(cw)
        setDeals(op)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const toggleDeal = (id, bucket) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d
      if (bucket === 'in') return { ...d, inToggle: !d.inToggle, bestCaseToggle: false }
      return { ...d, bestCaseToggle: !d.bestCaseToggle, inToggle: false }
    }))
  }

  const handleSort = (column) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const sortedDeals = useMemo(() => {
    const { column, direction } = sortConfig
    return [...deals].sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      if (typeof av === 'number') return direction === 'asc' ? av - bv : bv - av
      return direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [deals, sortConfig])

  // — All deals —
  const closedWonTotal  = closedWonDeals.reduce((s, d) => s + d.arr, 0)
  const inTotal         = deals.filter(d => d.inToggle).reduce((s, d) => s + d.arr, 0)
  const mostLikelyTotal = deals.filter(d => d.bestCaseToggle).reduce((s, d) => s + d.arr, 0)
  const closestToPin    = closedWonTotal + inTotal
  const upside          = closestToPin + mostLikelyTotal

  // — New Business only —
  const closedWonNB     = closedWonDeals.filter(NB).reduce((s, d) => s + d.arr, 0)
  const inNB            = deals.filter(d => d.inToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const mostLikelyNB    = deals.filter(d => d.bestCaseToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const closestToPinNB  = closedWonNB + inNB
  const upsideNB        = closestToPinNB + mostLikelyNB

  const inDeals = deals.filter(d => d.inToggle)
  const bcDeals = deals.filter(d => d.bestCaseToggle)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sesame-500 text-sm bg-sesame-100">
        Loading forecast data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-sm">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-coconut">

      {/* Page header */}
      <div className="bg-sesame-100 border-b border-sesame-300 px-6 py-4">
        <h1 className="text-base font-bold text-licorice tracking-tight">Q1 Forecast — Closest to the Pin</h1>
        <p className="text-xs text-sesame-500 mt-0.5">Toggle deals In or Best Case to build your call. Totals update in real time.</p>
      </div>

      {/* Side-by-side bridges */}
      <div className="flex border-b border-sesame-300">
        <div className="flex-1 min-w-0">
          <ForecastTotals
            title="Q1 Forecast"
            subtitle="All deal types"
            wrapperClass="bg-licorice"
            closedWonTotal={closedWonTotal}
            inTotal={inTotal}
            closestToPin={closestToPin}
            mostLikelyTotal={mostLikelyTotal}
            upside={upside}
          />
        </div>
        <div className="w-px bg-sesame-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <ForecastTotals
            title="New Business"
            subtitle="New logos only"
            wrapperClass="bg-fern"
            closedWonTotal={closedWonNB}
            inTotal={inNB}
            closestToPin={closestToPinNB}
            mostLikelyTotal={mostLikelyNB}
            upside={upsideNB}
          />
        </div>
      </div>

      {/* Summary tables */}
      <SummaryTables inDeals={inDeals} bcDeals={bcDeals} />

      {/* Deal table */}
      <div className="pb-8">
        <div className="px-6 py-3 border-b border-sesame-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sesame-500">Open Pipeline</h2>
        </div>
        <DealTable
          deals={sortedDeals}
          sortConfig={sortConfig}
          onSort={handleSort}
          onToggle={toggleDeal}
        />
      </div>
    </div>
  )
}
