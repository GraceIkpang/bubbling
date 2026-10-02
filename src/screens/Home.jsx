import { useState } from 'react'
import { useApp } from '../store.jsx'
import { VIBES, AREAS, MUSIC } from '../data.js'
import { DAYS, fmtHour, rank, parseQuery, LEVELS, closesLabel } from '../engine.js'
import { Icon, Bubbles, VenueArt } from '../components.jsx'
import { levelId } from '../components.jsx'
import { buildAlerts } from './Alerts.jsx'

const EXAMPLES = ['🎶 Amapiano, packed, Wuse II', '🕯️ Quiet date in Maitama', '💸 Cheap drinks with friends', '🥂 Bottomless brunch outdoors']

// Brunch sinks to the end of the chip row at night and leads during the day.
// The clock runs 6–29.5 (6 AM to 5:30 AM next day).
const ordered = (h) => {
  const night = h >= 17
  const day = (vb) => (vb.id === 'brunch' ? 1 : 0)
  return [...VIBES].sort((a, b) => (night ? day(a) - day(b) : day(b) - day(a)))
}

const greeting = (h) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

export default function Home() {
  const app = useApp()
  const { clock, venues, push, reportsById, setTab, setSheet } = app
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [vibe, setVibe] = useState('all')
  const [area, setArea] = useState('Anywhere')
  const ctx = { ...clock, live: true, reportsById }

  // Feed: open venues ranked by fit for the chosen vibe, or by how busy they are for "All"
  const inArea = (v) => area === 'Anywhere' || v.area === area
  const feed =
    vibe === 'all'
      ? venues
          .map((v) => ({ v, p: app.pulseOf(v) }))
          .filter((x) => x.p.state === 'open' && inArea(x.v))
          .sort((a, b) => b.p.level - a.p.level || b.v.rating - a.v.rating)
      : rank(venues, { ...ctx, vibe }).open.filter((x) => inArea(x.v))
  const busyCount = (id) => rank(venues, { ...ctx, vibe: id }).open.filter((x) => inArea(x.v) && x.p.level >= 3).length

  const alerts = buildAlerts(app)
  const topAlert = alerts[0]
  const chips = ordered(clock.h)

  const submit = (e) => {
    e.preventDefault()
    const text = q.trim()
    if (!text) return
    const parsed = parseQuery(text, { areas: AREAS, music: MUSIC })
    push({
      name: 'results',
      vibe: parsed.vibe || 'social',
      query: text,
      filters: { area: parsed.area?.length ? parsed.area : area === 'Anywhere' ? [] : [area], music: parsed.music, budget: parsed.budget, tags: parsed.tags },
    })
  }

  return (
    <div className="screen home">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand__name">bubbling</span>
        </div>
        <button className="icon-btn has-badge" aria-label={`Alerts, ${alerts.length} new`} onClick={() => setSheet({ type: 'alerts' })}>
          <Icon name="bell" />
          {alerts.length > 0 && <span className="badge">{alerts.length}</span>}
        </button>
      </header>

      <div className="home__intro">
        <p className="home__hi">
          {greeting(clock.h % 24)}, Abuja · {DAYS[clock.day]} {fmtHour(clock.h)}
        </p>
        <h1 className="display">Where’s the vibe tonight?</h1>
      </div>

      <form className="describe" onSubmit={submit} role="search">
        <div className="describe__field">
          <Icon name="search" size={18} />
          <label htmlFor="describe-input" className="sr-only">
            Describe your night
          </label>
          <input
            id="describe-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Describe your night…"
            autoComplete="off"
          />
          {q.trim() ? (
            <button type="submit" className="describe__go" aria-label="Search">
              <Icon name="chev" size={18} />
            </button>
          ) : (
            <label className="area-pick">
              <span className="sr-only">Area</span>
              <span className="area-pick__dot" aria-hidden="true">
                <Icon name="nav" size={12} />
              </span>
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                {['Anywhere', ...AREAS].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {(focused || q) && (
          <div className="describe__examples">
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="chip chip--soft" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ(ex.replace(/^\S+\s/, ''))}>
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="scroller vibe-chips" role="radiogroup" aria-label="What vibe are you looking for?">
        <button role="radio" aria-checked={vibe === 'all'} className={`chip chip--lg ${vibe === 'all' ? 'is-active' : ''}`} onClick={() => setVibe('all')}>
          Right now
        </button>
        {chips.map((vb) => {
          const n = busyCount(vb.id)
          return (
            <button key={vb.id} role="radio" aria-checked={vibe === vb.id} className={`chip chip--lg ${vibe === vb.id ? 'is-active' : ''}`} onClick={() => setVibe(vb.id)}>
              <span aria-hidden="true">{vb.glyph}</span> {vb.label}
              {vb.id === 'popping' && n > 0 && <span className="chip__count">{n}</span>}
            </button>
          )
        })}
      </div>

      {topAlert && (
        <button className="promo" onClick={() => push({ name: 'venue', id: topAlert.v.id })}>
          <Bubbles level={topAlert.tone === 'popping' ? 4 : 3} size="xs" live />
          <span>
            <b>{topAlert.title}.</b> {topAlert.body}
          </span>
          <Icon name="chev" size={16} />
        </button>
      )}

      <section className="feed" aria-live="polite">
        <div className="section__head">
          <h2>{vibe === 'all' ? 'Busiest right now' : `${VIBES.find((x) => x.id === vibe).label} · ${VIBES.find((x) => x.id === vibe).note.toLowerCase()}`}</h2>
          {vibe !== 'all' && (
            <button className="link" onClick={() => push({ name: 'results', vibe, filters: area === 'Anywhere' ? undefined : { area: [area] } })}>
              See all
            </button>
          )}
        </div>
        {feed.length === 0 ? (
          <p className="empty-note">
            {vibe === 'brunch' ? 'Brunch is a daytime thing. Try Saturday or Sunday from 11 AM.' : 'Nothing open matches here right now. Try another vibe or area.'}
          </p>
        ) : (
          feed.slice(0, 4).map(({ v, p }) => <FeedCard key={v.id} v={v} p={p} day={clock.day} />)
        )}
        {feed.length > 4 && (
          <button className="btn btn--ghost btn--block" onClick={() => push({ name: 'results', vibe: vibe === 'all' ? 'popping' : vibe })}>
            See {feed.length - 4} more
          </button>
        )}
      </section>

      <button className="plan-card" onClick={() => setTab('plan')}>
        <span className="plan-card__icon" aria-hidden="true">
          <Icon name="users" size={22} />
        </span>
        <span>
          <b>Going out as a group?</b>
          <span>Five quick questions, one short list.</span>
        </span>
        <span className="plan-card__cta">Start</span>
      </button>

      <section className="section legend-section">
        <h2>How to read the bubbles</h2>
        <ul className="legend">
          {[...LEVELS].reverse().map((L, i) => (
            <li key={L.id}>
              <Bubbles level={4 - i} size="sm" />
              <span>{L.label}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Busy isn’t the same as good. Solid bubbles are live community reports; outlined bubbles are forecasts from typical activity.
        </p>
      </section>
      <p className="fineprint">Prototype · sample venue data. Hours, areas and events are placeholders.</p>
    </div>
  )
}

/* TickPick-style image card: name + live status over the art, heart top-right */
function FeedCard({ v, p, day }) {
  const { push, saved, toggleSaved } = useApp()
  const L = LEVELS[p.level]
  const live = p.source === 'live'
  return (
    <article className="feed-card">
      <button className="feed-card__hit" onClick={() => push({ name: 'venue', id: v.id })} aria-label={`Open ${v.name}`} />
      <VenueArt v={v} className="feed-card__art">
        <button
          className={`heart-btn ${saved.has(v.id) ? 'is-on' : ''}`}
          aria-label={saved.has(v.id) ? `Remove ${v.name} from saved` : `Save ${v.name}`}
          aria-pressed={saved.has(v.id)}
          onClick={() => toggleSaved(v.id)}
        >
          <Icon name="heart" size={18} />
        </button>
        <span className="feed-card__text">
          <b>{v.name}</b>
          <span className={`feed-card__status lvl-${levelId(p.level)}`}>
            <i className="feed-card__dot" />
            {live ? `${L.label} now` : p.confidence === 'Low' ? `Likely ${L.word}` : `Expected ${L.word}`} · {v.area} · {v.mins} min
          </span>
        </span>
      </VenueArt>
      <span className="feed-card__foot">
        <span>{v.category}</span>
        <span>{live ? `Live · ${p.reports} reports` : `${p.confidence} confidence`}</span>
        <span>{closesLabel(v, day)}</span>
      </span>
    </article>
  )
}
