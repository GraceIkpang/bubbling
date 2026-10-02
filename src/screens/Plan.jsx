import { useState } from 'react'
import { useApp, resolveWhen, whenOptions } from '../store.jsx'
import { AREAS, MUSIC } from '../data.js'
import { rank, fmtHour } from '../engine.js'
import { Chip, Icon } from '../components.jsx'
import { VenueCard } from './Results.jsx'

const CROWD = [
  { id: 'popping', label: 'Busy', note: 'Packed, dancing' },
  { id: 'social', label: 'Social', note: 'Buzzing, can mingle' },
  { id: 'chill', label: 'Relaxed', note: 'Easy to talk' },
]
const GROUPS = ['Just me', '2 people', '3–5 people', '6+ people']

const STEPS = ['When', 'Crowd', 'Music', 'Budget', 'Area', 'Group']

export default function Plan() {
  const app = useApp()
  const { clock, venues, reportsById, push } = app
  const [step, setStep] = useState(0)
  const [a, setA] = useState({ when: 'now', crowd: 'popping', music: [], budget: [], area: [], group: '3–5 people' })
  const done = step >= STEPS.length

  const toggle = (k, val) => setA((s) => ({ ...s, [k]: s[k].includes(val) ? s[k].filter((x) => x !== val) : [...s[k], val] }))

  if (done) {
    const w = resolveWhen(a.when, clock)
    const ctx = { ...w, vibe: a.crowd, reportsById }
    const big = a.group === '6+ people'
    let { open } = rank(venues, { ...ctx, filters: { music: a.music, budget: a.budget, area: a.area } })
    let relaxed = false
    if (open.length === 0) {
      relaxed = true
      open = rank(venues, { ...ctx, filters: { area: a.area } }).open
    }
    if (big) open = [...open].sort((x, y) => (y.v.reserve ? 1 : 0) - (x.v.reserve ? 1 : 0))
    const shortlist = open.slice(0, 4).map((it) => ({ ...it, fit: { ...it.fit, reasons: big && it.v.reserve ? ['Takes group bookings', ...it.fit.reasons].slice(0, 3) : it.fit.reasons } }))
    return (
      <div className="screen plan">
        <header className="navbar">
          <button className="icon-btn" onClick={() => setStep(STEPS.length - 1)} aria-label="Back">
            <Icon name="back" />
          </button>
          <div className="navbar__title">
            <span className="eyebrow">Your shortlist</span>
            <h2>{w.live ? `Tonight · Abuja · ${fmtHour(w.h)} onward` : `${w.long} · Abuja`}</h2>
          </div>
          <span style={{ width: 40 }} />
        </header>
        <div className="plan__summary">
          {[CROWD.find((c) => c.id === a.crowd).label, a.music.join(', ') || 'Any music', a.budget.length ? a.budget.map((n) => '₦'.repeat(n)).join(' / ') : 'Any budget', a.area.join(', ') || 'Anywhere', a.group].map((t) => (
            <span key={t} className="reason">
              {t}
            </span>
          ))}
        </div>
        <div className="results__list">
          <p className="results__count">
            {shortlist.length} good options. There’s no single best place, so pick the one that suits your group.
          </p>
          {relaxed && (
            <div className="banner banner--info">
              <Icon name="info" size={18} />
              <span>Nothing matched every answer, so we loosened music and budget.</span>
            </div>
          )}
          {shortlist.length === 0 && <p className="empty-note">Nothing is open for that time. Try a later time or a different crowd.</p>}
          {shortlist.map(({ v, p, fit }) => (
            <VenueCard key={v.id} v={v} p={p} fit={fit} ctx={ctx} onOpen={() => push({ name: 'venue', id: v.id, when: a.when })} />
          ))}
          <button className="btn btn--ghost btn--block" onClick={() => setStep(0)}>
            Start over
          </button>
        </div>
      </div>
    )
  }

  const opts = whenOptions(clock, false)
  return (
    <div className="screen plan">
      <header className="navbar">
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Back">
            <Icon name="back" />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="navbar__title">
          <span className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </span>
          <h2>Where should we go?</h2>
        </div>
        <button className="link" onClick={() => setStep(STEPS.length)}>
          Skip
        </button>
      </header>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="plan__step">
        {step === 0 && (
          <>
            <h1 className="display display--md">When are you heading out?</h1>
            <div className="choice-list">
              {opts.map((o) => {
                const w = resolveWhen(o, clock)
                return (
                  <button key={o} className={`choice ${a.when === o ? 'is-active' : ''}`} aria-pressed={a.when === o} onClick={() => setA({ ...a, when: o })}>
                    <b>{w.label === 'Now' ? 'Right now' : w.label}</b>
                    <span>{w.live ? 'Live reports where available' : `${w.long} · forecast`}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="display display--md">What kind of crowd?</h1>
            <div className="choice-list">
              {CROWD.map((c) => (
                <button key={c.id} className={`choice ${a.crowd === c.id ? 'is-active' : ''}`} aria-pressed={a.crowd === c.id} onClick={() => setA({ ...a, crowd: c.id })}>
                  <b>{c.label}</b>
                  <span>{c.note}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="display display--md">Any music you want?</h1>
            <p className="muted">Pick as many as you like, or none.</p>
            <div className="chips">
              {MUSIC.map((m) => (
                <Chip key={m} active={a.music.includes(m)} onClick={() => toggle('music', m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="display display--md">What’s the budget?</h1>
            <div className="chips">
              {[1, 2, 3, 4].map((n) => (
                <Chip key={n} active={a.budget.includes(n)} onClick={() => toggle('budget', n)}>
                  {'₦'.repeat(n)}
                </Chip>
              ))}
            </div>
            <p className="muted small">₦ casual · ₦₦₦₦ bottle-service territory</p>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="display display--md">Which part of town?</h1>
            <div className="chips">
              <Chip active={a.area.length === 0} onClick={() => setA({ ...a, area: [] })}>
                Anywhere
              </Chip>
              {AREAS.map((ar) => (
                <Chip key={ar} active={a.area.includes(ar)} onClick={() => toggle('area', ar)}>
                  {ar}
                </Chip>
              ))}
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <h1 className="display display--md">How many of you?</h1>
            <div className="choice-list">
              {GROUPS.map((g) => (
                <button key={g} className={`choice ${a.group === g ? 'is-active' : ''}`} aria-pressed={a.group === g} onClick={() => setA({ ...a, group: g })}>
                  <b>{g}</b>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="plan__foot">
        <button className="btn btn--primary btn--block" onClick={() => setStep(step + 1)}>
          {step === STEPS.length - 1 ? 'Show options' : 'Next'}
        </button>
      </div>
    </div>
  )
}
