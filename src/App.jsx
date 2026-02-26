import { useState, useEffect, useMemo } from 'react'
import ForecastTotals from './components/ForecastTotals'
import SummaryTables from './components/SummaryTables'
import DealTable from './components/DealTable'
import PipelineChanges from './components/pipeline/PipelineChanges'
import ForecastFilters from './components/ForecastFilters'

const parseCSV = (text) => {
  const [headerLine, ...rows] = text.trim().split('\n')
  const headers = headerLine.split(',').map(h => h.trim())
  return rows.map(row => {
    const vals = row.split(',').map(v => v.trim())
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] }), {})
  })
}

const NB = (d) => d.deal_type === 'New Business'

// Fiscal Q1: Feb=M1, Mar=M2, Apr=M3
const FISCAL_Q_START_MONTH = 1  // 0-indexed JS month for February

const getISOWeek = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

const getMonthKey = (dateStr) =>
  `M${new Date(dateStr + 'T12:00:00').getMonth() - FISCAL_Q_START_MONTH + 1}`

const getWeekKey = (dateStr) => `W${getISOWeek(dateStr)}`

export default function App() {
  const [activeTab, setActiveTab] = useState('forecast')
  const [closedWonDeals, setClosedWonDeals] = useState([])
  const [deals, setDeals] = useState([])
  const [sortConfig, setSortConfig] = useState({ column: 'arr', direction: 'desc' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state
  const [segmentFilter,   setSegmentFilter]   = useState(new Set())
  const [timeGranularity, setTimeGranularity] = useState('quarter')
  const [selectedPeriods, setSelectedPeriods] = useState(new Set())

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
          bestCaseToggle: d.vp_forecast === 'Best Case',
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

  // Filter handlers
  const handleSegment = (seg) => {
    setSegmentFilter(prev => {
      if (seg === '__all__') return new Set()
      const next = new Set(prev)
      if (next.has(seg)) next.delete(seg); else next.add(seg)
      return next
    })
  }

  const handleGranularity = (g) => {
    setTimeGranularity(g)
    setSelectedPeriods(new Set())
  }

  const handlePeriod = (key) => {
    setSelectedPeriods(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // Available week pills derived from all deals
  const availableWeeks = useMemo(() => {
    const seen = new Map()
    for (const d of [...closedWonDeals, ...deals]) {
      if (!d.close_date) continue
      const w = getISOWeek(d.close_date)
      if (seen.has(w)) continue
      const dt  = new Date(d.close_date + 'T12:00:00')
      const day = (dt.getDay() + 6) % 7
      const mon = new Date(dt); mon.setDate(dt.getDate() - day)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const f   = x => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      seen.set(w, { key: `W${w}`, label: `W${w} (${f(mon)}–${f(sun)})` })
    }
    return [...seen.entries()].sort(([a], [b]) => a - b).map(([, v]) => v)
  }, [closedWonDeals, deals])

  // Filter predicate (inline to avoid stale closure risk)
  const filteredClosedWon = useMemo(() =>
    closedWonDeals.filter(d => {
      if (segmentFilter.size > 0 && !segmentFilter.has(d.segment)) return false
      if (timeGranularity !== 'quarter' && selectedPeriods.size > 0 && d.close_date) {
        const key = timeGranularity === 'month' ? getMonthKey(d.close_date) : getWeekKey(d.close_date)
        if (!selectedPeriods.has(key)) return false
      }
      return true
    }),
    [closedWonDeals, segmentFilter, timeGranularity, selectedPeriods]
  )

  const filteredDeals = useMemo(() =>
    deals.filter(d => {
      if (segmentFilter.size > 0 && !segmentFilter.has(d.segment)) return false
      if (timeGranularity !== 'quarter' && selectedPeriods.size > 0 && d.close_date) {
        const key = timeGranularity === 'month' ? getMonthKey(d.close_date) : getWeekKey(d.close_date)
        if (!selectedPeriods.has(key)) return false
      }
      return true
    }),
    [deals, segmentFilter, timeGranularity, selectedPeriods]
  )

  const sortedDeals = useMemo(() => {
    const { column, direction } = sortConfig
    return [...filteredDeals].sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      if (typeof av === 'number') return direction === 'asc' ? av - bv : bv - av
      return direction === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filteredDeals, sortConfig])

  // Totals from filtered arrays
  const closedWonTotal  = filteredClosedWon.reduce((s, d) => s + d.arr, 0)
  const inTotal         = filteredDeals.filter(d => d.inToggle).reduce((s, d) => s + d.arr, 0)
  const mostLikelyTotal = filteredDeals.filter(d => d.bestCaseToggle).reduce((s, d) => s + d.arr, 0)
  const closestToPin    = closedWonTotal + inTotal
  const upside          = closestToPin + mostLikelyTotal

  // New Business only
  const closedWonNB    = filteredClosedWon.filter(NB).reduce((s, d) => s + d.arr, 0)
  const inNB           = filteredDeals.filter(d => d.inToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const mostLikelyNB   = filteredDeals.filter(d => d.bestCaseToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const closestToPinNB = closedWonNB + inNB
  const upsideNB       = closestToPinNB + mostLikelyNB

  const inDeals = filteredDeals.filter(d => d.inToggle)
  const bcDeals = filteredDeals.filter(d => d.bestCaseToggle)

  return (
    <div className="min-h-screen bg-coconut">

      {/* Page header */}
      <div className="bg-sesame-100 border-b border-sesame-300 px-6 py-4">
        <h1 className="text-base font-bold text-licorice tracking-tight">Q1 Forecast — Closest to the Pin</h1>
        <p className="text-xs text-sesame-500 mt-0.5">Toggle deals In or Best Case to build your call. Totals update in real time.</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-sesame-300 bg-sesame-100">
        {[['forecast', 'Forecast'], ['pipeline', 'Pipeline Changes']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === id
                ? 'border-matcha text-licorice'
                : 'border-transparent text-sesame-500 hover:text-licorice'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Forecast tab */}
      {activeTab === 'forecast' && (
        loading ? (
          <div className="flex items-center justify-center h-64 text-sesame-500 text-sm bg-sesame-100">
            Loading forecast data…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-600 text-sm">
            Error loading data: {error}
          </div>
        ) : (
          <>
            {/* Filters */}
            <ForecastFilters
              segmentFilter={segmentFilter}
              onSegment={handleSegment}
              timeGranularity={timeGranularity}
              onGranularity={handleGranularity}
              selectedPeriods={selectedPeriods}
              onPeriod={handlePeriod}
              availableWeeks={availableWeeks}
            />

            {/* P&L bridge */}
            <ForecastTotals
              closedWonTotal={closedWonTotal}   inTotal={inTotal}           closestToPin={closestToPin}
              mostLikelyTotal={mostLikelyTotal} upside={upside}
              closedWonNB={closedWonNB}         inNB={inNB}                 closestToPinNB={closestToPinNB}
              mostLikelyNB={mostLikelyNB}       upsideNB={upsideNB}
            />

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
          </>
        )
      )}

      {/* Pipeline Changes tab */}
      {activeTab === 'pipeline' && <PipelineChanges />}
    </div>
  )
}
