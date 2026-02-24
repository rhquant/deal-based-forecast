import { useRef, useEffect, useState, useMemo } from 'react'

const CHANGE_TYPE_ORDER = [
  'Closed Won', 'Closed Lost', 'Slipped', 'Pushed',
  'New', 'ARR Increase', 'ARR Decrease', 'Active',
]

// Hex colors matching the tailwind brand palette
const CHANGE_COLORS_HEX = {
  'Closed Won':   '#A1D78F',  // cactus
  'Closed Lost':  '#D5D5D2',  // sesame-300
  'Slipped':      '#FEEB7E',  // pineapple
  'Pushed':       '#E5E5E2',  // sesame-200
  'New':          '#D1F470',  // matcha
  'ARR Increase': '#E6FAAB',  // matcha-000
  'ARR Decrease': '#FEEB7E',  // pineapple
  'Active':       '#F5F5F2',  // sesame-100
}

const fmt = (v) => {
  if (!v) return '$0'
  return v >= 1_000_000 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}K`
}

const NODE_W = 14
const NODE_GAP = 8
const SVG_H = 320
const PAD = { top: 24, bottom: 24, left: 160, right: 150 }

export default function PipelineSankey({ rows }) {
  const containerRef = useRef(null)
  const [svgWidth, setSvgWidth] = useState(800)
  const [hoveredIdx, setHoveredIdx] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSvgWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (!rows.length) return null

    // For each row: flow value = snapshot_arr if it existed at snapshot, else current_arr (new deals)
    const enriched = rows.map(d => ({
      ...d,
      source: d.snapshot_stage?.trim() || '(New Deal)',
      target: d.change_type || 'Active',
      flowValue: d.snapshot_arr > 0 ? d.snapshot_arr : d.current_arr,
    }))

    // Aggregate into maps
    const sourceMap = new Map()
    const targetMap = new Map()
    const linkMap = new Map()

    enriched.forEach(({ source, target, flowValue }) => {
      sourceMap.set(source, (sourceMap.get(source) || 0) + flowValue)
      targetMap.set(target, (targetMap.get(target) || 0) + flowValue)
      const key = `${source}||${target}`
      linkMap.set(key, (linkMap.get(key) || 0) + flowValue)
    })

    const totalValue = [...sourceMap.values()].reduce((s, v) => s + v, 0)
    if (totalValue === 0) return null

    const availH = SVG_H - PAD.top - PAD.bottom

    // Left nodes — sorted by value desc
    const sortedSources = [...sourceMap.entries()].sort((a, b) => b[1] - a[1])
    const leftGapTotal = NODE_GAP * (sortedSources.length - 1)
    const leftBarH = availH - leftGapTotal

    let y = PAD.top
    const leftNodes = sortedSources.map(([name, value]) => {
      const h = Math.max(4, (value / totalValue) * leftBarH)
      const node = { name, value, y, h }
      y += h + NODE_GAP
      return node
    })

    // Right nodes — fixed change_type priority order, only those present in data
    const orderedTargets = CHANGE_TYPE_ORDER.filter(ct => targetMap.has(ct))
    const rightGapTotal = NODE_GAP * (orderedTargets.length - 1)
    const rightBarH = availH - rightGapTotal

    y = PAD.top
    const rightNodes = orderedTargets.map(name => {
      const value = targetMap.get(name)
      const h = Math.max(4, (value / totalValue) * rightBarH)
      const node = { name, value, y, h }
      y += h + NODE_GAP
      return node
    })

    // Track per-node offsets for stacking links
    const leftOffsets = new Map(leftNodes.map(n => [n.name, 0]))
    const rightOffsets = new Map(rightNodes.map(n => [n.name, 0]))

    // Build links in change_type priority order → clean stacking on right nodes
    const links = []
    CHANGE_TYPE_ORDER.forEach(target => {
      if (!targetMap.has(target)) return

      // Collect all source links for this target, sorted by value desc
      const sourceLinks = []
      linkMap.forEach((value, key) => {
        const [src, tgt] = key.split('||')
        if (tgt !== target) return
        sourceLinks.push({ source: src, value })
      })
      sourceLinks.sort((a, b) => b.value - a.value)

      sourceLinks.forEach(({ source, value }) => {
        const ln = leftNodes.find(n => n.name === source)
        const rn = rightNodes.find(n => n.name === target)
        if (!ln || !rn) return

        const leftH = (value / totalValue) * leftBarH
        const rightH = (value / totalValue) * rightBarH

        const lo = leftOffsets.get(source) || 0
        const ro = rightOffsets.get(target) || 0

        links.push({
          source, target, value,
          y0top: ln.y + lo,
          y0bot: ln.y + lo + leftH,
          y1top: rn.y + ro,
          y1bot: rn.y + ro + rightH,
        })

        leftOffsets.set(source, lo + leftH)
        rightOffsets.set(target, ro + rightH)
      })
    })

    return { leftNodes, rightNodes, links }
  }, [rows])

  if (!layout) {
    return (
      <div ref={containerRef} className="w-full px-6 py-8 text-center text-sesame-400 text-sm italic">
        No data to display
      </div>
    )
  }

  const { leftNodes, rightNodes, links } = layout
  const leftX = PAD.left
  const rightX = svgWidth - PAD.right - NODE_W
  const midX = (leftX + NODE_W + rightX) / 2

  return (
    <div ref={containerRef} className="w-full px-6 py-4 bg-coconut border-b border-sesame-200">
      <svg width={svgWidth} height={SVG_H} style={{ overflow: 'visible' }}>

        {/* Ribbons */}
        {links.map((link, i) => {
          const x0 = leftX + NODE_W
          const x1 = rightX
          const d = [
            `M ${x0} ${link.y0top}`,
            `C ${midX} ${link.y0top}, ${midX} ${link.y1top}, ${x1} ${link.y1top}`,
            `L ${x1} ${link.y1bot}`,
            `C ${midX} ${link.y1bot}, ${midX} ${link.y0bot}, ${x0} ${link.y0bot}`,
            'Z',
          ].join(' ')
          const color = CHANGE_COLORS_HEX[link.target] ?? '#E5E5E2'
          return (
            <path
              key={i}
              d={d}
              fill={color}
              stroke="none"
              opacity={hoveredIdx === i ? 0.65 : 0.35}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
            >
              <title>{`${link.source} → ${link.target}: ${fmt(link.value)}`}</title>
            </path>
          )
        })}

        {/* Left nodes (stages) */}
        {leftNodes.map(node => {
          const midY = node.y + node.h / 2
          const showArr = node.h > 22
          return (
            <g key={node.name}>
              <rect x={leftX} y={node.y} width={NODE_W} height={node.h} fill="#11110D" opacity={0.85} rx={2} />
              <text
                x={leftX - 8}
                y={showArr ? midY - 6 : midY}
                textAnchor="end"
                dominantBaseline="middle"
                style={{ fontSize: 11, fill: '#6C6C68' }}
              >
                {node.name}
              </text>
              {showArr && (
                <text
                  x={leftX - 8}
                  y={midY + 8}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fill: '#90918C' }}
                >
                  {fmt(node.value)}
                </text>
              )}
            </g>
          )
        })}

        {/* Right nodes (change types) */}
        {rightNodes.map(node => {
          const midY = node.y + node.h / 2
          const showArr = node.h > 22
          const color = CHANGE_COLORS_HEX[node.name] ?? '#E5E5E2'
          return (
            <g key={node.name}>
              <rect x={rightX} y={node.y} width={NODE_W} height={node.h} fill={color} rx={2} />
              <text
                x={rightX + NODE_W + 8}
                y={showArr ? midY - 6 : midY}
                textAnchor="start"
                dominantBaseline="middle"
                style={{ fontSize: 11, fill: '#6C6C68' }}
              >
                {node.name}
              </text>
              {showArr && (
                <text
                  x={rightX + NODE_W + 8}
                  y={midY + 8}
                  textAnchor="start"
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fill: '#90918C' }}
                >
                  {fmt(node.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
