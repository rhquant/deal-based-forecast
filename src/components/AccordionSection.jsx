function ChevronSVG({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-sesame-500 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export default function AccordionSection({ title, open, onToggle, children, action }) {
  return (
    <div className="border-b border-sesame-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-3 bg-sesame-100 hover:bg-sesame-200 transition-colors"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-sesame-500">{title}</span>
        <div className="flex items-center gap-3">
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          <ChevronSVG open={open} />
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}
