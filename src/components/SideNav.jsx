const ForecastIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const PipelineIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)

const NAV_ITEMS = [
  { id: 'forecast', label: 'Forecast', Icon: ForecastIcon },
  { id: 'pipeline', label: 'Pipeline Changes', Icon: PipelineIcon },
]

export default function SideNav({ activeTab, onTabChange }) {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-40 bg-sesame-100 border-r border-sesame-300 flex flex-col z-30">
      <div className="px-4 py-4 border-b border-sesame-300">
        <span className="text-xs text-sesame-500 font-medium tracking-wide">GTM Intel</span>
      </div>
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors border-l-2 ${
                isActive
                  ? 'border-matcha bg-coconut text-licorice font-semibold'
                  : 'border-transparent text-sesame-500 hover:text-licorice hover:bg-sesame-200'
              }`}
            >
              <Icon />
              <span className="text-xs leading-tight">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
