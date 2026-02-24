import { useState, useEffect, useMemo } from 'react'
import PipelineFilters from './PipelineFilters'
import PipelineBridge from './PipelineBridge'
import PipelineTable from './PipelineTable'

const parseCSV = (text) => {
  const [headerLine, ...dataRows] = text.trim().split('\n')
  const headers = headerLine.split(',').map(h => h.trim())
  return dataRows.map(row => {
    const vals = row.split(',').map(v => v.trim())
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] ?? '' }), {})
  })
}

const CSV_MAP = {
  soq: '/data/pipeline_changes_soq_placeholder.csv',
  som: '/data/pipeline_changes_som_placeholder.csv',
  sow: '/data/pipeline_changes_sow_placeholder.csv',
}

const CHANGE_TYPE_ORDER = [
  'Closed Won', 'Closed Lost', 'Slipped', 'Pushed',
  'New', 'ARR Increase', 'ARR Decrease', 'Active',
]

export default function PipelineChanges() {
  const [period, setPeriod] = useState('soq')
  const [dealTypeFilter, setDealTypeFilter] = useState('all')
  const [changeTypeFilter, setChangeTypeFilter] = useState(new Set(CHANGE_TYPE_ORDER))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(CSV_MAP[period])
      .then(r => r.text())
      .then(text => {
        setRows(
          parseCSV(text).map(d => ({
            ...d,
            snapshot_arr: Number(d.snapshot_arr) || 0,
            current_arr: Number(d.current_arr) || 0,
          }))
        )
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [period])

  // Change types present in current data, in priority order
  const allChangeTypes = useMemo(() => {
    const inData = new Set(rows.map(d => d.change_type))
    return CHANGE_TYPE_ORDER.filter(ct => inData.has(ct))
  }, [rows])

  const filteredRows = useMemo(() =>
    rows
      .filter(d => dealTypeFilter === 'all' || d.deal_type === dealTypeFilter)
      .filter(d => changeTypeFilter.has(d.change_type)),
    [rows, dealTypeFilter, changeTypeFilter]
  )

  const handleChangeType = (ct) => {
    if (ct === '__all__') {
      const allSelected = allChangeTypes.every(t => changeTypeFilter.has(t))
      setChangeTypeFilter(allSelected ? new Set() : new Set(CHANGE_TYPE_ORDER))
      return
    }
    setChangeTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(ct)) next.delete(ct)
      else next.add(ct)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sesame-500 text-sm">
        Loading pipeline changes…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600 text-sm">
        Error loading data: {error}
      </div>
    )
  }

  return (
    <div>
      <PipelineFilters
        period={period}
        onPeriod={setPeriod}
        dealTypeFilter={dealTypeFilter}
        onDealType={setDealTypeFilter}
        changeTypeFilter={changeTypeFilter}
        onChangeType={handleChangeType}
        allChangeTypes={allChangeTypes}
      />
      <PipelineBridge rows={rows} period={period} />
      <div>
        <div className="px-6 py-3 border-b border-sesame-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-sesame-500">
            Pipeline Changes ({filteredRows.length} {filteredRows.length === 1 ? 'deal' : 'deals'})
          </h2>
        </div>
        <PipelineTable rows={filteredRows} />
      </div>
    </div>
  )
}
