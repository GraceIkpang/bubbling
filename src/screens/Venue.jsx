import { useState } from 'react'
import { useApp, resolveWhen } from '../store.jsx'
import {
  LEVELS,
  DAYS,
  DAYS_LONG,
  fmtHour,
  expectedLevel,
  suggestedArrival,
  calmWindow,
  weekOutlook,
  hoursLabel,
  basisLine,
  similarVenues,
  closesLabel,
} from '../engine.js'
import { Icon, PulseBadge, SourceTag, VenueArt, ForecastChart, Price, Bubbles, Sheet } from '../components.jsx'
import { levelId } from '../components.jsx'
import { QuickReport } from './Report.jsx'

export default function Venue({ route }) {
  const app = useApp()
  const { venues, clock, pop, push, saved, toggleSaved, follows, toggleFollow, reportsById, setSheet, going, setGoing, showToast, sheet } = app
  const v = venues.find((x) => x.id === route.id)
  const w = resolveWhen(route.when || 'now', clock)
  const [day, setDay] = useState(w.day)
  const ctx = { day: w.day, h: w.h, live: w.live, reportsById }
  const p = app.pulseOf(v, ctx)
  const isGoing = going?.id === v.id

  const next = w.live
    ? [0, 1, 2, 3, 4, 5]
        .map((k) => Math.floor(w.h) + k)
        .map((h, i) => ({ h, level: i === 0 && p.state === 'open' ? p.level : expectedLevel(v, w.day, h + 0.5) }))
        .filter((x) => x.level != null)
    : []

  const arrive = suggestedArrival(v, day)
  const calm = calmWindow(v, day)
  const week = weekOutlook(v)
  const ev = v.events?.[w.day]
  const similar = p.state !== 'open' ? similarVenues(venues, v, ctx) : []
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.area} Abuja`)}`

  return (
    <div className="screen venue">
      <VenueArt v={v} className="venue__hero">
        <div className="venue__herobar">
          <button className="icon-btn icon-btn--glass" onClick={pop} aria-label="Back">
            <Icon name="back" />
          </button>
          <div className="hero-pill">
            <button
              className={`icon-btn icon-btn--glass ${follows.has(v.id) ? 'is-on' : ''}`}
              aria-pressed={follows.has(v.id)}
              aria-label={follows.has(v.id) ? 'Stop alerts for this venue' : 'Alert me when it gets busy'}
              onClick={() => {
                toggleFollow(v.id)
                showToast(follows.has(v.id) ? 'Alerts off' : `We’ll tell you when ${v.name} gets busy`)
              }}
            >
              <Icon name="bell" />
            </button>
            <button
              className={`icon-btn icon-btn--glass ${saved.has(v.id) ? 'is-on' : ''}`}
              aria-pressed={saved.has(v.id)}
              aria-label={saved.has(v.id) ? 'Remove from saved' : 'Save'}
              onClick={() => toggleSaved(v.id)}
            >
              <Icon name="heart" />
            </button>
          </div>
        </div>
      </VenueArt>

      <div className="venue__body">
        <div className="venue__title">
          <p className="eyebrow">
            {v.category} · {v.area}
          </p>
          <h1 className="display display--md">{v.name}</h1>
          <div className="venue__sub">
            <span className="rating">★ {v.rating.toFixed(1)}</span>
            <Price n={v.price} />
            <span>{v.mins} min away</span>
          </div>
          <p className="venue__blurb">{v.blurb}</p>
        </div>

        {/* STATUS: the most important block */}
        {p.state === 'reported_closed' ? (
          <section className="status status--warn">
            <div className="status__head">
              <Icon name="alert" />
              <h2>Reported closed tonight</h2>
            </div>
            <p>{p.note}</p>
            <p className="muted small">Community reported · we’ll confirm with the venue.</p>
          </section>
        ) : p.state === 'closed' ? (
          <section className="status">
            <p className="eyebrow">{w.live ? 'Right now' : w.long}</p>
            <h2 className="status__big">Closed</h2>
            <p className="muted">{p.opens}</p>
          </section>
        ) : (
          <section className={`status lvl-${levelId(p.level)}`}>
            <p className="eyebrow">{w.live ? 'Right now' : `Forecast · ${w.long}`}</p>
            <div className="status__row">
              <h2 className="status__big">{p.confidence === 'Low' ? `Likely ${LEVELS[p.level].word}` : LEVELS[p.level].label}</h2>
              <Bubbles level={p.level} live={p.source === 'live'} size="lg" />
            </div>
            <div className="status__tags">
              <SourceTag p={p} />
              {ev && <span className="src">Venue reported event</span>}
            </div>
            {p.divergent && (
              <div className="diverge">
                <span>
                  <small>Expected</small>
                  <b>{LEVELS[p.expected].label}</b>
                </span>
                <Icon name="chev" />
                <span>
                  <small>Currently</small>
                  <b>{LEVELS[p.level].label}</b>
                </span>
              </div>
            )}
            <p className="status__basis">{basisLine(v, p, ctx)}</p>
            {p.confidence === 'Low' && <p className="status__warn">Not enough live data to be sure. Treat this as a rough guide.</p>}
          </section>
        )}

        {similar.length > 0 && (
          <section className="section">
            <h2 className="h-sm">{p.state === 'reported_closed' ? 'Similar places nearby' : 'Open now instead'}</h2>
            <div className="mini-list">
              {similar.map(({ v: s, p: sp }) => (
                <button key={s.id} className="mini-row" onClick={() => push({ name: 'venue', id: s.id, when: route.when })}>
                  <VenueArt v={s} className="mini-row__art" />
                  <span className="mini-row__body">
                    <b>{s.name}</b>
                    <span className="muted small">
                      {s.area} · {s.mins} min · {closesLabel(s, ctx.day)}
                    </span>
                  </span>
                  <PulseBadge p={sp} size="sm" />
                </button>
              ))}
            </div>
          </section>
        )}

        {next.length > 0 && p.state === 'open' && (
          <section className="section">
            <h2 className="h-sm">Next few hours</h2>
            <div className="next-hours">
              {next.map((x, i) => (
                <div key={x.h} className={`next-hours__cell lvl-${levelId(x.level)}`}>
                  <span className="mono">{i === 0 ? 'Now' : fmtHour(x.h, { short: true })}</span>
                  <Bubbles level={x.level} size="xs" live={i === 0 && p.source === 'live'} />
                  <span className="small">{LEVELS[x.level].short}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section__head">
            <h2 className="h-sm">How busy is it usually?</h2>
          </div>
          <div className="day-tabs" role="tablist" aria-label="Day">
            {DAYS.map((d, i) => (
              <button key={d} role="tab" aria-selected={day === i} className={`day-tab ${day === i ? 'is-active' : ''} ${!v.hours[i] ? 'is-off' : ''}`} onClick={() => setDay(i)}>
                {d}
              </button>
            ))}
          </div>
          <ForecastChart v={v} day={day} nowH={w.h} live={w.live && day === w.day} liveLevel={p.state === 'open' && p.source === 'live' ? p.level : null} />
          {arrive && (
            <div className="arrive">
              <div>
                <small>Suggested arrival for the peak</small>
                <b>
                  {fmtHour(arrive.from)} – {fmtHour(arrive.to)}
                </b>
              </div>
              {calm && calm.level < 2 && (
                <div>
                  <small>Calmest</small>
                  <b>
                    {fmtHour(calm.from)} – {fmtHour(calm.to)}
                  </b>
                </div>
              )}
            </div>
          )}
          <div className="week">
            {week.map((d) => (
              <button key={d.day} className={`week__day ${d.day === day ? 'is-active' : ''}`} onClick={() => setDay(d.day)} aria-label={`${DAYS_LONG[d.day]}: ${d.level == null ? 'closed' : 'peaks ' + LEVELS[d.level].word}`}>
                <span className="mono">{d.label[0]}</span>
                {d.level == null ? <span className="week__off">–</span> : <Bubbles level={d.level} size="xs" />}
              </button>
            ))}
          </div>
        </section>

        {ev && (
          <section className="event">
            <p className="eyebrow">{w.live ? 'Tonight' : DAYS_LONG[w.day]} · venue reported</p>
            <h3>{ev.title}</h3>
            <p className="muted">
              From {ev.time} · {ev.by}
            </p>
          </section>
        )}

        <section className="section">
          <h2 className="h-sm">The vibe</h2>
          <dl className="traits">
            <div>
              <dt>Energy</dt>
              <dd>{v.energy}</dd>
            </div>
            <div>
              <dt>Noise</dt>
              <dd>{v.noise}</dd>
            </div>
            <div>
              <dt>Conversation</dt>
              <dd>{v.conversation}</dd>
            </div>
            <div>
              <dt>Typical crowd</dt>
              <dd>{v.age}</dd>
            </div>
            <div className="traits__wide">
              <dt>Best for</dt>
              <dd>{v.bestFor.join(' · ')}</dd>
            </div>
          </dl>
        </section>

        <section className="section">
          <h2 className="h-sm">Details</h2>
          <ul className="details">
            <li>
              <Icon name="clock" />
              <span>
                <b>{DAYS_LONG[day]}</b> {hoursLabel(v, day)}
              </span>
            </li>
            <li>
              <Icon name="music" />
              <span>{v.music.join(', ')}</span>
            </li>
            <li>
              <Icon name="shirt" />
              <span>{v.dress}</span>
            </li>
            <li>
              <Icon name="phone" />
              <span className="mono selectable">{v.phone}</span>
            </li>
          </ul>
          <p className="fineprint">Sample details · verify with the venue before you go.</p>
        </section>

        {w.live && p.state === 'open' ? (
          <QuickReport key={v.id} v={v} p={p} />
        ) : (
          <button className="report-link" onClick={() => setSheet({ type: 'report', id: v.id })}>
            <span>
              <b>Here now?</b> Tell others how it is
            </span>
            <Icon name="chev" />
          </button>
        )}
      </div>

      <div className="actionbar">
        <a className="btn btn--ghost" href={mapsUrl} target="_blank" rel="noreferrer" title="Directions">
          <Icon name="nav" size={20} />
          <span className="sr-only">Directions</span>
        </a>
        <button className="btn btn--ghost" onClick={() => setSheet({ type: 'contact', id: v.id })} title={v.reserve ? 'Reserve' : 'Contact'}>
          <Icon name="phone" size={20} />
          <span className="sr-only">{v.reserve ? 'Reserve' : 'Contact'}</span>
        </button>
        <button
          className={`btn ${isGoing ? 'btn--done' : 'btn--primary'}`}
          disabled={p.state === 'reported_closed'}
          onClick={() => {
            if (isGoing) {
              setGoing(null)
              showToast('Plan cancelled')
            } else {
              setGoing({ id: v.id, prompted: false })
              showToast('Have a good night. We’ll ask how it was in a bit.')
            }
          }}
        >
          {isGoing ? (
            <>
              <Icon name="check" size={18} /> Going
            </>
          ) : (
            'I’m going'
          )}
        </button>
      </div>

      <ContactSheet open={sheet?.type === 'contact' && sheet.id === v.id} v={v} onClose={() => setSheet(null)} />
    </div>
  )
}

function ContactSheet({ open, v, onClose }) {
  const { showToast } = useApp()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v.phone)
      showToast('Number copied')
    } catch {
      showToast('Select the number to copy it')
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={v.reserve ? 'Reserve a table' : 'Contact'}>
      <p className="muted">{v.reserve ? `${v.name} takes reservations by phone or WhatsApp.` : `${v.name} doesn’t take reservations. Walk-ins only.`}</p>
      <div className="contact-row">
        <span className="mono selectable">{v.phone}</span>
        <button className="btn btn--ghost btn--sm" onClick={copy}>
          Copy
        </button>
      </div>
      <p className="fineprint">Sample number for the prototype.</p>
    </Sheet>
  )
}
