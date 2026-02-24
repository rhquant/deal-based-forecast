const PERIOD_OPTIONS = [
  { value: 'soq', label: 'Start of Quarter' },
  { value: 'som', label: 'Start of Month' },
  { value: 'sow', label: 'This Week' },
]

const DEAL_TYPE_OPTIONS = ['all', 'New Business', 'Expansion']

const CHANGE_COLORS = {
  'Closed Won':   'bg-cactus text-shamrock',
  'Closed Lost':  'bg-sesame-300 text-sesame-700',
  'Slipped':      'bg-pineapple text-licorice',
  'Pushed':       'bg-sesame-200 text-sesame-700',
  'New':          'bg-matcha text-shamrock',
  'ARR Increase': 'bg-matcha-000 text-shamrock',
  'ARR Decrease': 'bg-pineapple text-licorice',
  'Active':       'bg-sesame-100 text-sesame-500',
}

const INACTIVE = 'bg-coconut text-sesame-600 border border-sesame-300 hover:border-sesame-500'

export default function PipelineFilters({
  period, onPeriod,
  dealTypeFilter, onDealType,
  changeTypeFilter, onChangeType,
  allChangeTypes,
}) {
  const allSelected = allChangeTypes.length > 0 && allChangeTypes.every(ct => changeTypeFilter.has(ct))

  return (
    <div className="bg-sesame-100 border-b border-sesame-300 px-6 py-3 space-y-3">

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-24 shrink-0">Compare to</span>
        <div className="flex gap-1.5">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPeriod(value)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                period === value ? 'bg-licorice text-coconut' : INACTIVE
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Deal type filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-24 shrink-0">Deal Type</span>
        <div className="flex gap-1.5">
          {DEAL_TYPE_OPTIONS.map(dt => (
            <button
              key={dt}
              onClick={() => onDealType(dt)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                dealTypeFilter === dt ? 'bg-licorice text-coconut' : INACTIVE
              }`}
            >
              {dt === 'all' ? 'All' : dt}
            </button>
          ))}
        </div>
      </div>

      {/* Change type filter (multi-select) */}
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-24 shrink-0 pt-1">Change Type</span>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => onChangeType('__all__')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              allSelected ? 'bg-licorice text-coconut' : INACTIVE
            }`}
          >
            All
          </button>
          {allChangeTypes.map(ct => {
            const active = changeTypeFilter.has(ct)
            return (
              <button
                key={ct}
                onClick={() => onChangeType(ct)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  active
                    ? (CHANGE_COLORS[ct] ?? 'bg-sesame-300 text-sesame-700')
                    : INACTIVE
                }`}
              >
                {ct}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
