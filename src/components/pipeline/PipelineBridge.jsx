import { useRef, useEffect, useState, useMemo } from 'react'

const SVG_H = 260
const PAD = { top: 40, bottom: 52, left: 24, right: 24 }

const PERIOD_LABELS = {
  soq: 'SOQ Pipeline',
  som: 'SOM Pipeline',
  sow: 'SOW Pipeline',
}

const fmt = (v, signed = false) => {
  if (v === 0) return '$0'
  const abs = Math.abs(v)
  const str = abs >= 1_000_000 ? `$${(abs / 1e6).toFixed(1)}M` : `$${Math.round(abs / 1000)}K`
  if (!signed) return str
  return v > 0 ? `+${str}` : `−${str}`
}

const CHANGE_CONFIG = [
  {
    key: 'New',
    label: ['New', 'Deals'],
    color: '#D1F470',
    compute: (rows) => rows.filter(d => d.change_type === 'New').reduce((s, d) => s + d.current_arr, 0),
  },
  {
    key: 'ARR Increase',
    label: ['ARR', 'Increase'],
    color: '#E6FAAB',
    compute: (rows) => rows.filter(d => d.change_type === 'ARR Increase').reduce((s, d) => s + (d.current_arr - d.snapshot_arr), 0),
  },
  {
    key: 'ARR Decrease',
    label: ['ARR', 'Decrease'],
    color: '#FEEB7E',
    compute: (rows) => rows.filter(d => d.change_type === 'ARR Decrease').reduce((s, d) => s + (d.current_arr - d.snapshot_arr), 0),
  },
  {
    key: 'Pushed',
    label: ['Pushed', ''],
    color: '#E5E5E2',
    compute: (rows) => rows.filter(d => d.change_type === 'Pushed').reduce((s, d) => s + (d.current_arr - d.snapshot_arr), 0),
  },
  {
    key: 'Slipped',
    label: ['Slipped', ''],
    color: '#FEEB7E',
    compute: (rows) => rows.filter(d => d.change_type === 'Slipped').reduce((s, d) => s - d.snapshot_arr, 0),
  },
  {
    key: 'Closed Won',
    label: ['Closed', 'Won'],
    color: '#A1D78F',
    compute: (rows) => rows.filter(d => d.change_type === 'Closed Won').reduce((s, d) => s - d.snapshot_arr, 0),
  },
  {
    key: 'Closed Lost',
    label: ['Closed', 'Lost'],
    color: '#D5D5D2',
    compute: (rows) => rows.filter(d => d.change_type === 'Closed Lost').reduce((s, d) => s - d.snapshot_arr, 0),
  },
]

export default function PipelineBridge({ rows, period }) {
  const containerRef = useRef(null)
  const [svgWidth, setSvgWidth] = useState(700)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSvgWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { bridgeRows, maxValue } = useMemo(() => {
    if (!rows.length) return { bridgeRows: [], maxValue: 1 }

    const snapshotTotal = rows.reduce((s, d) => s + d.snapshot_arr, 0)
    const currentTotal  = rows.reduce((s, d) => s + d.current_arr, 0)

    const changeRows = CHANGE_CONFIG
      .map(cfg => ({ ...cfg, delta: cfg.compute(rows) }))
      .filter(r => r.delta !== 0)

    let running = snapshotTotal
    const enriched = changeRows.map(r => {
      const before = running
      running += r.delta
      return { ...r, before, after: running }
    })

    const allValues = [
      snapshotTotal, currentTotal,
      ...enriched.map(r => r.before),
      ...enriched.map(r => r.after),
    ]

    return {
      bridgeRows: [
        { type: 'total', label: [PERIOD_LABELS[period] ?? 'Snapshot', ''], value: snapshotTotal, after: snapshotTotal },
        ...enriched.map(r => ({ type: 'change', ...r })),
        { type: 'total', label: ['Current', 'Pipeline'], value: currentTotal, after: currentTotal },
      ],
      maxValue: Math.max(...allValues, 1),
    }
  }, [rows, period])

  if (!rows.length) return null

  const n       = bridgeRows.length
  const chartW  = Math.max(10, svgWidth - PAD.left - PAD.right)
  const chartH  = SVG_H - PAD.top - PAD.bottom
  const baselineY = PAD.top + chartH  // SVG y of the x-axis

  const colSlot  = chartW / n
  const colW     = Math.min(72, Math.max(32, colSlot * 0.58))
  const colCX    = (i) => PAD.left + i * colSlot + colSlot / 2
  const colLeft  = (i) => colCX(i) - colW / 2

  // Convert ARR value → pixel height from baseline (upward)
  const sc = (v) => (v / maxValue) * chartH

  // SVG y of a given ARR value (0 = baseline, higher value = lower SVG y)
  const vy = (v) => baselineY - sc(v)

  return (
    <div ref={containerRef} className="w-full px-6 py-4 bg-coconut border-b border-sesame-200">
      <svg width={svgWidth} height={SVG_H} style={{ overflow: 'visible' }}>

        {/* Baseline */}
        <line
          x1={PAD.left} y1={baselineY}
          x2={PAD.left + chartW} y2={baselineY}
          stroke="#D5D5D2" strokeWidth={1}
        />

        {bridgeRows.map((row, i) => {
          const cx = colCX(i)
          const bx = colLeft(i)
          const [labelLine1, labelLine2] = row.label

          if (row.type === 'total') {
            const barH   = Math.max(2, sc(row.value))
            const barTopY = vy(row.value)
            return (
              <g key={i}>
                <rect x={bx} y={barTopY} width={colW} height={barH} fill="#11110D" rx={2} />
                {/* Value above bar */}
                <text
                  x={cx} y={barTopY - 7}
                  textAnchor="middle"
                  style={{ fontSize: 11, fill: '#11110D', fontWeight: 700 }}
                >
                  {fmt(row.value)}
                </text>
                {/* Label below baseline */}
                <text x={cx} y={baselineY + 14} textAnchor="middle">
                  <tspan x={cx} style={{ fontSize: 11, fill: '#11110D', fontWeight: 700 }}>{labelLine1}</tspan>
                  {labelLine2 && <tspan x={cx} dy={13} style={{ fontSize: 11, fill: '#11110D', fontWeight: 700 }}>{labelLine2}</tspan>}
                </text>
              </g>
            )
          }

          // Floating change bar
          const isPositive  = row.delta >= 0
          const barTopY     = vy(Math.max(row.before, row.after))
          const floatBotY   = vy(Math.min(row.before, row.after))
          const barH        = Math.max(2, floatBotY - barTopY)

          // Connector: horizontal dashed line from prev bar right edge to this bar left, at "before" level
          const connY    = vy(row.before)
          const prevRight = colLeft(i - 1) + colW

          // Delta label: above for positive, below for negative
          const labelY = isPositive ? barTopY - 7 : floatBotY + 14
          const labelColor = isPositive ? '#2D4C33' : '#6C6C68'

          return (
            <g key={i}>
              {/* Connector */}
              <line
                x1={prevRight} y1={connY}
                x2={bx}        y2={connY}
                stroke="#D5D5D2" strokeWidth={1} strokeDasharray="3 3"
              />
              {/* Floating bar */}
              <rect x={bx} y={barTopY} width={colW} height={barH} fill={row.color} rx={2} />
              {/* Delta label */}
              <text
                x={cx} y={labelY}
                textAnchor="middle"
                style={{ fontSize: 11, fill: labelColor, fontWeight: 600 }}
              >
                {fmt(row.delta, true)}
              </text>
              {/* Category label below baseline */}
              <text x={cx} y={baselineY + 14} textAnchor="middle">
                <tspan x={cx} style={{ fontSize: 11, fill: '#6C6C68' }}>{labelLine1}</tspan>
                {labelLine2 && <tspan x={cx} dy={13} style={{ fontSize: 11, fill: '#6C6C68' }}>{labelLine2}</tspan>}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
