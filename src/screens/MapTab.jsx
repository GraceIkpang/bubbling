import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import { DAYS, fmtHour } from '../engine.js'
import MapView from './MapView.jsx'

// Crowd filters for the map; "quiet" is a choice, not a bad result
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'open', label: 'Open now', test: (p) => p.state === 'open' },
  { id: 'busy', label: 'Busy', test: (p) => p.state === 'open' && p.level >= 3 },
  { id: 'relaxed', label: 'Relaxed', test: (p) => p.state === 'open' && p.level <= 2 },
  { id: 'live', label: 'Live data', test: (p) => p.state === 'open' && p.source === 'live' },
]

export default function MapTab() {
  const app = useApp()
  const { venues, clock } = app
  const [filter, setFilter] = useState('all')
  // Open venues first, busiest first, so the card rail opens on something useful
  const rank = (p) => (p.state === 'open' ? p.level : -1)
  const all = useMemo(() => venues.map((v) => ({ v, p: app.pulseOf(v) })).sort((a, b) => rank(b.p) - rank(a.p)), [venues, app])
  const openCount = all.filter((x) => x.p.state === 'open').length
  const items = useMemo(() => all.filter(({ p }) => FILTERS.find((f) => f.id === filter).test(p)), [all, filter])
  return (
    <div className="screen maptab">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            {DAYS[clock.day]} {fmtHour(clock.h)} · {openCount} open
          </p>
          <h1 className="display display--md">Abuja right now</h1>
        </div>
      </header>
      <div className="scroller map-filters" role="radiogroup" aria-label="Filter the map">
        {FILTERS.map((f) => (
          <button key={f.id} role="radio" aria-checked={filter === f.id} className={`chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <MapView items={items} ctx={{ ...clock, live: true }} />
    </div>
  )
}
