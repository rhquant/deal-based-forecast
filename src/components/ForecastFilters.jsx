const SEGMENTS = ['Commercial', 'Enterprise', 'Public Sector', 'NorCal']
const MONTH_LABELS = { M1: 'M1 · Feb', M2: 'M2 · Mar', M3: 'M3 · Apr' }

const pill = (active) =>
  active
    ? 'px-3 py-1 rounded-full text-xs font-medium bg-licorice text-coconut cursor-pointer select-none'
    : 'px-3 py-1 rounded-full text-xs font-medium bg-coconut border border-sesame-300 text-sesame-600 hover:border-sesame-500 cursor-pointer select-none'

export default function ForecastFilters({
  segmentFilter,
  onSegment,
  timeGranularity,
  onGranularity,
  selectedPeriods,
  onPeriod,
  availableWeeks,
}) {
  return (
    <div className="bg-sesame-100 border-b border-sesame-300 px-6 py-3 flex flex-col gap-3">

      {/* Row 1 — Time granularity */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-16 shrink-0">Time</span>
        {['quarter', 'month', 'week'].map(g => (
          <button
            key={g}
            onClick={() => onGranularity(g)}
            className={pill(timeGranularity === g)}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {/* Row 2 — Period pills (hidden for quarter) */}
      {timeGranularity !== 'quarter' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-16 shrink-0">Period</span>
          {timeGranularity === 'month'
            ? Object.entries(MONTH_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onPeriod(key)}
                  className={pill(selectedPeriods.size === 0 || selectedPeriods.has(key))}
                >
                  {label}
                </button>
              ))
            : availableWeeks.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onPeriod(key)}
                  className={pill(selectedPeriods.size === 0 || selectedPeriods.has(key))}
                >
                  {label}
                </button>
              ))
          }
        </div>
      )}

      {/* Row 3 — Segment */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500 w-16 shrink-0">Segment</span>
        <button
          onClick={() => onSegment('__all__')}
          className={pill(segmentFilter.size === 0)}
        >
          All
        </button>
        {SEGMENTS.map(seg => (
          <button
            key={seg}
            onClick={() => onSegment(seg)}
            className={pill(segmentFilter.size === 0 || segmentFilter.has(seg))}
          >
            {seg}
          </button>
        ))}
      </div>

    </div>
  )
}
