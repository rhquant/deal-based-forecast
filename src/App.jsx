import { useState, useEffect, useMemo } from 'react'
import ForecastHeadline from './components/ForecastHeadline'
import ForecastTotals from './components/ForecastTotals'
import RepRollup from './components/RepRollup'
import SummaryTables from './components/SummaryTables'
import DealTable from './components/DealTable'
import ForecastFilters from './components/ForecastFilters'
import SideNav from './components/SideNav'
import AccordionSection from './components/AccordionSection'
import PipelineChanges from './components/pipeline/PipelineChanges'

// Fiscal Q1 starts Feb 1. M1=Feb, M2=Mar, M3=Apr
const FISCAL_Q_START_MONTH = 1  // 0-based JS month index for February
const SEGMENTS = ['Commercial', 'Enterprise', 'Public Sector', 'NorCal']
const NB = (d) => d.deal_type === 'New Business'

const getISOWeek = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

const getMonthKey = (dateStr) =>
  `M${new Date(dateStr + 'T12:00:00').getMonth() - FISCAL_Q_START_MONTH + 1}`

const getWeekKey = (dateStr) => `W${getISOWeek(dateStr)}`

const parseCSV = (text) => {
  const [headerLine, ...rows] = text.trim().split('\n')
  const headers = headerLine.split(',').map(h => h.trim())
  return rows.map(row => {
    const vals = row.split(',').map(v => v.trim())
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] ?? '' }), {})
  })
}

export default function App() {
  const [closedWonDeals, setClosedWonDeals] = useState([])
  const [deals, setDeals] = useState([])
  const [sortConfig, setSortConfig] = useState({ column: 'arr', direction: 'desc' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('forecast')

  // Accordion state
  const [openSections, setOpenSections] = useState({
    filters: true,
    bridge:  true,
    summary: false,
    deals:   true,
  })
  const toggleSection = (key) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter predicate
  const matchesPeriod = (d) => {
    if (timeGranularity === 'quarter' || selectedPeriods.size === 0) return true
    if (!d.close_date) return true
    return selectedPeriods.has(
      timeGranularity === 'month' ? getMonthKey(d.close_date) : getWeekKey(d.close_date)
    )
  }

  // Filtered base arrays
  const filteredClosedWon = useMemo(() =>
    closedWonDeals.filter(d =>
      (segmentFilter.size === 0 || segmentFilter.has(d.segment)) && matchesPeriod(d)
    ),
    [closedWonDeals, segmentFilter, timeGranularity, selectedPeriods]
  )

  const filteredDeals = useMemo(() =>
    deals.filter(d =>
      (segmentFilter.size === 0 || segmentFilter.has(d.segment)) && matchesPeriod(d)
    ),
    [deals, segmentFilter, timeGranularity, selectedPeriods]
  )

  // Sorted deal table
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

  // Search-filtered deals
  const searchFilteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return sortedDeals
    const q = searchQuery.toLowerCase()
    return sortedDeals.filter(d =>
      d.account_name?.toLowerCase().includes(q) ||
      d.opportunity_name?.toLowerCase().includes(q)
    )
  }, [sortedDeals, searchQuery])

  // All totals
  const closedWonTotal  = filteredClosedWon.reduce((s, d) => s + d.arr, 0)
  const inTotal         = filteredDeals.filter(d => d.inToggle).reduce((s, d) => s + d.arr, 0)
  const mostLikelyTotal = filteredDeals.filter(d => d.bestCaseToggle).reduce((s, d) => s + d.arr, 0)
  const closestToPin    = closedWonTotal + inTotal
  const upside          = closestToPin + mostLikelyTotal

  // New Business totals
  const closedWonNB    = filteredClosedWon.filter(NB).reduce((s, d) => s + d.arr, 0)
  const inNB           = filteredDeals.filter(d => d.inToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const mostLikelyNB   = filteredDeals.filter(d => d.bestCaseToggle && NB(d)).reduce((s, d) => s + d.arr, 0)
  const closestToPinNB = closedWonNB + inNB
  const upsideNB       = closestToPinNB + mostLikelyNB

  const inDeals = filteredDeals.filter(d => d.inToggle)
  const bcDeals = filteredDeals.filter(d => d.bestCaseToggle)

  // Segment rollup
  const repRollup = useMemo(() => {
    const bySegment = (seg) => ({
      segment:   seg,
      closedWon: filteredClosedWon.filter(d => d.segment === seg).reduce((s, d) => s + d.arr, 0),
      inArr:     filteredDeals.filter(d => d.segment === seg && d.inToggle).reduce((s, d) => s + d.arr, 0),
      bcArr:     filteredDeals.filter(d => d.segment === seg && (d.inToggle || d.bestCaseToggle)).reduce((s, d) => s + d.arr, 0),
    })
    const rows = SEGMENTS.map(bySegment)
    const total = {
      segment:   'North America',
      closedWon: rows.reduce((s, r) => s + r.closedWon, 0),
      inArr:     rows.reduce((s, r) => s + r.inArr, 0),
      bcArr:     rows.reduce((s, r) => s + r.bcArr, 0),
    }
    return { total, rows }
  }, [filteredClosedWon, filteredDeals])

  // Search input for accordion action slot
  const searchInput = (
    <input
      type="text"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      placeholder="Search accounts…"
      className="text-xs px-2 py-1 rounded border border-sesame-300 bg-coconut text-licorice placeholder-sesame-400 focus:outline-none focus:border-matcha w-36"
    />
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sesame-500 text-sm bg-sesame-100 min-h-screen">
        Loading forecast data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm min-h-screen">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <div className="flex">
      <SideNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 ml-40 min-h-screen bg-coconut">
        {/* Page header */}
        <div className="bg-sesame-100 border-b border-sesame-300 px-6 py-4">
          <h1 className="text-base font-bold text-licorice tracking-tight">Q1 Forecast — Deal Backed Commit</h1>
          <p className="text-xs text-sesame-500 mt-0.5">Toggle deals In or Best Case to build your call. Totals update in real time.</p>
        </div>

        {activeTab === 'forecast' && (
          <>
            <ForecastHeadline upside={upside} upsideNB={upsideNB} />

            <AccordionSection
              title="Filters"
              open={openSections.filters}
              onToggle={() => toggleSection('filters')}
            >
              <ForecastFilters
                segmentFilter={segmentFilter}
                onSegment={handleSegment}
                timeGranularity={timeGranularity}
                onGranularity={handleGranularity}
                selectedPeriods={selectedPeriods}
                onPeriod={handlePeriod}
                availableWeeks={availableWeeks}
              />
            </AccordionSection>

            <AccordionSection
              title="Q1 Forecast"
              open={openSections.bridge}
              onToggle={() => toggleSection('bridge')}
            >
              <div className="flex items-stretch">
                <ForecastTotals
                  closedWonTotal={closedWonTotal}   inTotal={inTotal}           closestToPin={closestToPin}
                  mostLikelyTotal={mostLikelyTotal} upside={upside}
                  closedWonNB={closedWonNB}         inNB={inNB}                 closestToPinNB={closestToPinNB}
                  mostLikelyNB={mostLikelyNB}       upsideNB={upsideNB}
                />
                <div className="w-px bg-sesame-200 my-4 flex-shrink-0" />
                <RepRollup rollup={repRollup} />
              </div>
            </AccordionSection>

            <AccordionSection
              title="Summary"
              open={openSections.summary}
              onToggle={() => toggleSection('summary')}
            >
              <SummaryTables inDeals={inDeals} bcDeals={bcDeals} />
            </AccordionSection>

            <AccordionSection
              title="Open Pipeline"
              open={openSections.deals}
              onToggle={() => toggleSection('deals')}
              action={searchInput}
            >
              <DealTable
                deals={searchFilteredDeals}
                sortConfig={sortConfig}
                onSort={handleSort}
                onToggle={toggleDeal}
              />
            </AccordionSection>
          </>
        )}

        {activeTab === 'pipeline' && <PipelineChanges />}
      </main>
    </div>
  )
}
