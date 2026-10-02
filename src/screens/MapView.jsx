import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { LEVELS } from '../engine.js'
import { PulseBadge, SourceTag, Icon, VenueArt, Bubbles } from '../components.jsx'
import { levelId } from '../components.jsx'

// Illustrative, not-to-scale schematic of Abuja districts.
const DISTRICTS = {
  Gwarinpa: { x: 70, y: 62, r: 44 },
  Maitama: { x: 228, y: 92, r: 54 },
  Jabi: { x: 82, y: 196, r: 50 },
  'Wuse II': { x: 198, y: 206, r: 58 },
  Garki: { x: 182, y: 330, r: 52 },
  Asokoro: { x: 300, y: 300, r: 46 },
}

const OFFSETS = [
  [0, 0],
  [26, -14],
  [-24, 16],
  [18, 26],
  [-26, -20],
  [32, 10],
]

export default function MapView({ items, ctx }) {
  const { push } = useApp()
  const [sel, setSel] = useState(items[0]?.v.id ?? null)
  const byArea = {}
  const pins = items.map((it) => {
    const d = DISTRICTS[it.v.area] || DISTRICTS['Wuse II']
    const k = (byArea[it.v.area] = (byArea[it.v.area] ?? -1) + 1)
    const [dx, dy] = OFFSETS[k % OFFSETS.length]
    return { ...it, x: d.x + dx, y: d.y + dy }
  })
  const railRef = useRef()
  const fromRail = useRef(false)

  // Keep the selection valid when the item set changes (filters)
  useEffect(() => {
    if (!items.some((it) => it.v.id === sel)) setSel(items[0]?.v.id ?? null)
  }, [items, sel])

  // Pin tap or filter change → bring the selected card into view
  const idsKey = items.map((it) => it.v.id).join()
  useEffect(() => {
    if (fromRail.current) {
      fromRail.current = false
      return
    }
    const card = railRef.current?.querySelector(`[data-id="${sel}"]`)
    if (card) railRef.current.scrollTo({ left: card.offsetLeft - railRef.current.offsetLeft - 16, behavior: 'smooth' })
  }, [sel, idsKey])

  // Card swipe → select the card that is most in view
  const onRailScroll = () => {
    const rail = railRef.current
    clearTimeout(rail._t)
    rail._t = setTimeout(() => {
      const mid = rail.scrollLeft + rail.clientWidth / 2
      let best = null
      let bestD = Infinity
      for (const el of rail.children) {
        const d = Math.abs(el.offsetLeft - rail.offsetLeft + el.clientWidth / 2 - mid)
        if (d < bestD) [best, bestD] = [el.dataset.id, d]
      }
      if (best && best !== sel) {
        fromRail.current = true
        setSel(best)
      }
    }, 90)
  }

  return (
    <div className="mapview">
      <div className="map">
        <svg viewBox="0 0 360 420" role="img" aria-label="Schematic map of Abuja districts with venue pins coloured by crowd level">
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--map-glow)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--map-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="360" height="420" fill="var(--map-bg)" />
          {/* major roads, schematic */}
          <path d="M-10 250 C 90 230, 180 240, 370 160" stroke="var(--map-road)" strokeWidth="7" fill="none" />
          <path d="M120 -10 C 150 120, 170 260, 230 430" stroke="var(--map-road)" strokeWidth="6" fill="none" />
          <path d="M-10 120 C 100 140, 250 120, 370 60" stroke="var(--map-road)" strokeWidth="4" fill="none" />
          <path d="M40 430 C 120 360, 250 340, 370 380" stroke="var(--map-road)" strokeWidth="4" fill="none" />
          {/* Jabi lake */}
          <ellipse cx="44" cy="232" rx="26" ry="16" fill="var(--map-water)" />
          {Object.entries(DISTRICTS).map(([name, d]) => (
            <g key={name}>
              <circle cx={d.x} cy={d.y} r={d.r} fill="var(--map-district)" stroke="var(--map-line)" />
              <text x={d.x} y={d.y - d.r + 14} textAnchor="middle" className="map__label">
                {name.toUpperCase()}
              </text>
            </g>
          ))}
          {pins.map((pn) => {
            const open = pn.p.state === 'open'
            const id = open ? levelId(pn.p.level) : pn.p.state === 'reported_closed' ? 'warn' : 'none'
            const isSel = pn.v.id === sel
            return (
              <g
                key={pn.v.id}
                className={`pin lvl-${id} ${isSel ? 'is-sel' : ''} ${open && pn.p.level >= 3 ? 'is-hot' : ''}`}
                transform={`translate(${pn.x} ${pn.y})`}
                onClick={() => setSel(pn.v.id)}
                role="button"
                tabIndex={0}
                aria-label={`${pn.v.name}, ${open ? LEVELS[pn.p.level].label : 'closed'}`}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(pn.v.id)}
              >
                {open && pn.p.level >= 3 && <circle r="20" fill="url(#glow)" className="pin__glow" />}
                <circle r={isSel ? 11 : 8} className="pin__dot" />
                {isSel && <circle r="15" className="pin__ring" fill="none" />}
              </g>
            )
          })}
        </svg>
        <p className="map__note">Schematic map · not to scale</p>
      </div>

      {pins.length > 0 ? (
        <div className="map-rail" ref={railRef} onScroll={onRailScroll} aria-label="Venues on the map">
          {pins.map((it) => (
            <button
              key={it.v.id}
              data-id={it.v.id}
              className={`map-card ${it.v.id === sel ? 'is-sel' : ''}`}
              onClick={() => (it.v.id === sel ? push({ name: 'venue', id: it.v.id, when: ctx.whenKey }) : setSel(it.v.id))}
            >
              <VenueArt v={it.v} className="map-card__art" />
              <span className="map-card__body">
                <b>{it.v.name}</b>
                <PulseBadge p={it.p} size="sm" />
                <SourceTag p={it.p} />
                <span className="muted small">
                  {it.v.category} · {it.v.area} · {it.v.mins} min
                </span>
              </span>
              <Icon name="chev" />
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small map-empty">No venues match. Try another filter.</p>
      )}
      <div className="map-legend">
        {[...LEVELS].reverse().map((L, i) => (
          <span key={L.id}>
            <Bubbles level={4 - i} size="xs" />
            {L.short}
          </span>
        ))}
      </div>
    </div>
  )
}
