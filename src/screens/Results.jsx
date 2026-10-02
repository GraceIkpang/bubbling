import { useMemo, useState } from 'react'
import { useApp, resolveWhen, whenOptions } from '../store.jsx'
import { VIBES, AREAS, MUSIC } from '../data.js'
import { rank, peakWindow, calmWindow, closesLabel, fmtHour, LEVELS, DAYS } from '../engine.js'
import { Chip, Icon, PulseBadge, SourceTag, VenueArt, Sheet, Price } from '../components.jsx'
import MapView from './MapView.jsx'

const TITLES = {
  popping: 'Popping',
  social: 'Social',
  chill: 'Chill',
  date: 'Date night',
  dinner: 'Dinner',
  brunch: 'Brunch',
}

const BRUNCH_QUICK = [
  { id: 'buzzing', label: 'Buzzing', crowd: ['lively', 'popping'] },
  { id: 'quiet', label: 'Quiet', crowd: ['quiet', 'chill', 'moderate'] },
  { id: 'outdoor', label: 'Outdoor', tag: 'outdoor' },
  { id: 'groups', label: 'Good for groups', tag: 'groups' },
  { id: 'family', label: 'Family', tag: 'family' },
  { id: 'bottomless', label: 'Bottomless', tag: 'bottomless' },
]

const empty = { area: [], music: [], budget: [], tags: [], crowd: [] }

export function VenueCard({ v, p, fit, ctx, onOpen }) {
  const { saved, toggleSaved } = useApp()
  const peak = peakWindow(v, ctx.day)
  const calm = calmWindow(v, ctx.day)
  const wantsCalm = ['chill', 'date'].includes(ctx.vibe)
  const win = wantsCalm ? calm : peak
  const dim = p.state !== 'open'
  return (
    <article className={`vcard ${dim ? 'is-dim' : ''}`}>
      <button className="vcard__hit" onClick={onOpen} aria-label={`Open ${v.name}`} />
      <VenueArt v={v} className="vcard__art">
        <button
          className={`heart-btn ${saved.has(v.id) ? 'is-on' : ''}`}
          aria-label={saved.has(v.id) ? `Remove ${v.name} from saved` : `Save ${v.name}`}
          aria-pressed={saved.has(v.id)}
          onClick={() => toggleSaved(v.id)}
        >
          <Icon name="heart" size={18} />
        </button>
        <span className="vcard__over">
          <h3 className="vcard__name">{v.name}</h3>
          <span className="vcard__cat">
            {v.category} · {v.area} · {v.mins} min
          </span>
        </span>
      </VenueArt>
      <div className="vcard__body">
        <div className="vcard__top">
          <PulseBadge p={p} />
          <Price n={v.price} />
        </div>
        {p.state === 'open' && (
          <div className="vcard__src">
            <SourceTag p={p} />
            {p.divergent && (
              <span className="diverge-mini">
                Expected {LEVELS[p.expected].short} → now {LEVELS[p.level].short}
              </span>
            )}
          </div>
        )}
        {p.state === 'open' && (
          <div className="vcard__times">
            {win && (
              <span>
                {wantsCalm ? 'Calmest' : 'Best'} <b className="mono">{fmtHour(win.from)}–{fmtHour(win.to)}</b>
              </span>
            )}
            <span>{closesLabel(v, ctx.day)}</span>
          </div>
        )}
        {fit?.reasons?.length > 0 && p.state === 'open' && (
          <div className="vcard__reasons">
            {fit.reasons.map((r) => (
              <span key={r} className="reason">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default function Results({ route }) {
  const app = useApp()
  const { clock, venues, push, pop, reportsById, setSheet, sheet } = app
  const [vibe, setVibe] = useState(route.vibe)
  const brunch = vibe === 'brunch'
  const [when, setWhen] = useState(() => (route.vibe === 'brunch' && (clock.h < 9 || clock.h > 16) ? 'sat-brunch' : 'now'))
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState(() => ({ ...empty, ...(route.filters || {}) }))
  const [quick, setQuick] = useState([])
  const [showLater, setShowLater] = useState(false)

  const opts = whenOptions(clock, brunch)
  const w = resolveWhen(opts.includes(when) ? when : 'now', clock)

  const merged = useMemo(() => {
    const f = { ...filters, tags: [...filters.tags], crowd: [...filters.crowd] }
    for (const id of quick) {
      const q = BRUNCH_QUICK.find((x) => x.id === id)
      if (q?.tag) f.tags.push(q.tag)
      if (q?.crowd) f.crowd.push(...q.crowd)
    }
    return f
  }, [filters, quick])

  const ctx = { ...w, vibe, reportsById, whenKey: when }
  const { open, later, flagged } = rank(venues, { ...ctx, filters: merged })
  const filterCount = filters.area.length + filters.music.length + filters.budget.length + filters.tags.length + filters.crowd.length

  const switchVibe = (id) => {
    setVibe(id)
    setQuick([])
    if (id === 'brunch' && (clock.h < 9 || clock.h > 16)) setWhen('sat-brunch')
    else if (vibe === 'brunch') setWhen('now')
  }

  const title = brunch ? 'Brunch in Abuja' : w.live ? `${TITLES[vibe]} · ${w.h < 17 ? 'today' : 'tonight'} in Abuja` : `${TITLES[vibe]} · ${w.long}`

  return (
    <div className={`screen results ${brunch ? 'is-brunch' : ''}`}>
      <header className="navbar">
        <button className="icon-btn" onClick={pop} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="navbar__title">
          <span className="eyebrow">{w.live ? `${DAYS[w.day]} ${fmtHour(w.h)} · live + expected` : 'Forecast only'}</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-btn" onClick={() => setView(view === 'list' ? 'map' : 'list')} aria-label={view === 'list' ? 'Show map' : 'Show list'}>
          <Icon name={view === 'list' ? 'map' : 'list'} />
        </button>
      </header>

      <div className="results__controls">
        <div className="scroller" role="group" aria-label="Vibe">
          {VIBES.map((vb) => (
            <Chip key={vb.id} active={vibe === vb.id} onClick={() => switchVibe(vb.id)}>
              <span aria-hidden="true">{vb.glyph}</span> {vb.label}
            </Chip>
          ))}
        </div>
        <div className="seg" role="group" aria-label="When">
          {opts.map((o) => (
            <button key={o} className={`seg__btn ${when === o ? 'is-active' : ''}`} aria-pressed={when === o} onClick={() => setWhen(o)}>
              {resolveWhen(o, clock).label}
            </button>
          ))}
        </div>
        <div className="scroller">
          <button className={`chip chip--filter ${filterCount ? 'is-active' : ''}`} onClick={() => setSheet({ type: 'filters' })}>
            <Icon name="sliders" size={16} /> Filters{filterCount ? ` · ${filterCount}` : ''}
          </button>
          {brunch
            ? BRUNCH_QUICK.map((q) => (
                <Chip key={q.id} active={quick.includes(q.id)} onClick={() => setQuick((s) => (s.includes(q.id) ? s.filter((x) => x !== q.id) : [...s, q.id]))}>
                  {q.label}
                </Chip>
              ))
            : [
                ['Afrobeats', 'music'],
                ['Amapiano', 'music'],
                ['Wuse II', 'area'],
                ['Maitama', 'area'],
              ].map(([val, key]) => (
                <Chip
                  key={val}
                  active={filters[key].includes(val)}
                  onClick={() => setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }))}
                >
                  {val}
                </Chip>
              ))}
        </div>
        {route.query && (
          <p className="query-echo">
            Showing matches for “{route.query}”
            <button
              className="link"
              onClick={() => {
                setFilters(empty)
              }}
            >
              Clear
            </button>
          </p>
        )}
      </div>

      {view === 'map' ? (
        <MapView items={[...open, ...flagged, ...later]} ctx={ctx} />
      ) : (
        <div className="results__list">
          {!w.live && (
            <div className="banner banner--info">
              <Icon name="clock" size={18} />
              <span>
                These are forecasts for {w.long}, based on typical activity and listed events. Live reports appear on the night.
              </span>
            </div>
          )}
          <p className="results__count">
            {open.length} {open.length === 1 ? 'place' : 'places'} {w.live ? 'open now' : 'open then'} · sorted by fit, not popularity
          </p>
          {open.length === 0 && (
            <div className="empty">
              <p>
                <b>Nothing open matches right now.</b>
              </p>
              <p className="muted">
                {brunch ? 'Brunch spots are daytime venues. Try Saturday or Sunday brunch.' : 'Try another time, or remove a filter.'}
              </p>
              {filterCount > 0 && (
                <button className="btn btn--ghost" onClick={() => setFilters(empty)}>
                  Clear filters
                </button>
              )}
            </div>
          )}
          {open.map(({ v, p, fit }) => (
            <VenueCard key={v.id} v={v} p={p} fit={fit} ctx={ctx} onOpen={() => push({ name: 'venue', id: v.id, when })} />
          ))}
          {flagged.length > 0 && (
            <>
              <h4 className="list-sep">Heads up</h4>
              {flagged.map(({ v, p, fit }) => (
                <VenueCard key={v.id} v={v} p={p} fit={fit} ctx={ctx} onOpen={() => push({ name: 'venue', id: v.id, when })} />
              ))}
            </>
          )}
          {later.length > 0 && (
            <>
              <button className="list-sep list-sep--btn" onClick={() => setShowLater((s) => !s)} aria-expanded={showLater}>
                Opening later · {later.length}
                <Icon name="chev" size={16} />
              </button>
              {showLater &&
                later.map(({ v, p, fit }) => <VenueCard key={v.id} v={v} p={p} fit={fit} ctx={ctx} onOpen={() => push({ name: 'venue', id: v.id, when })} />)}
            </>
          )}
        </div>
      )}

      <FiltersSheet open={sheet?.type === 'filters'} onClose={() => setSheet(null)} filters={filters} setFilters={setFilters} resultCount={open.length} />
    </div>
  )
}

function FiltersSheet({ open, onClose, filters, setFilters, resultCount }) {
  const toggle = (key, val) => setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      tall
      footer={
        <>
          <button className="btn btn--ghost" onClick={() => setFilters(empty)}>
            Clear all
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'place' : 'places'}
          </button>
        </>
      }
    >
      <fieldset className="fgroup">
        <legend>Crowd right now</legend>
        <div className="chips">
          {[...LEVELS].reverse().map((L) => (
            <Chip key={L.id} active={filters.crowd.includes(L.id)} onClick={() => toggle('crowd', L.id)}>
              <span className={`dot lvl-${L.id}`} /> {L.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="fgroup">
        <legend>Music</legend>
        <div className="chips">
          {MUSIC.map((m) => (
            <Chip key={m} active={filters.music.includes(m)} onClick={() => toggle('music', m)}>
              {m}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="fgroup">
        <legend>Budget</legend>
        <div className="chips">
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} active={filters.budget.includes(n)} onClick={() => toggle('budget', n)}>
              {'₦'.repeat(n)}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="fgroup">
        <legend>Area</legend>
        <div className="chips">
          {AREAS.map((a) => (
            <Chip key={a} active={filters.area.includes(a)} onClick={() => toggle('area', a)}>
              {a}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="fgroup">
        <legend>Extras</legend>
        <div className="chips">
          {['outdoor', 'live music', 'shisha', 'romantic', 'groups'].map((t) => (
            <Chip key={t} active={filters.tags.includes(t)} onClick={() => toggle('tags', t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </div>
      </fieldset>
    </Sheet>
  )
}
