import { useApp } from '../store.jsx'
import { LEVELS, expectedLevel, fmtHour } from '../engine.js'
import { Icon, Sheet } from '../components.jsx'

export function buildAlerts(app) {
  const { venues, clock, follows, pulseOf } = app
  const out = []
  for (const v of venues) {
    const p = pulseOf(v)
    if (follows.has(v.id) && p.state === 'open') {
      for (const dh of [0.5, 1, 1.5, 2]) {
        const later = expectedLevel(v, clock.day, clock.h + dh)
        if (later != null && later > p.level && later >= 3) {
          out.push({
            v,
            icon: 'spark',
            tone: LEVELS[later].id,
            title: `${v.name} is getting busy`,
            body: `${LEVELS[p.level].label} now, expected ${LEVELS[later].word} by ${fmtHour(Math.floor(clock.h + dh))}.`,
            kind: 'busy',
          })
          break
        }
      }
    }
    if (p.state === 'reported_closed') {
      out.push({ v, icon: 'alert', tone: 'warn', title: `${v.name} reported closed tonight`, body: 'Tap to see similar places nearby.', kind: 'closed' })
    }
    if (p.state === 'open' && p.divergent) {
      const quieter = p.level < p.expected
      out.push({
        v,
        icon: 'info',
        tone: LEVELS[p.level].id,
        title: `${v.name} is ${quieter ? 'quieter' : 'busier'} than usual`,
        body: `Expected ${LEVELS[p.expected].word}, ${p.reports} people say ${LEVELS[p.level].word}.`,
        kind: 'diverge',
      })
    }
  }
  const order = { busy: 0, closed: 1, diverge: 2 }
  return out.sort((a, b) => order[a.kind] - order[b.kind])
}

export function AlertsSheet() {
  const app = useApp()
  const { sheet, setSheet, push, follows } = app
  const open = sheet?.type === 'alerts'
  const alerts = open ? buildAlerts(app) : []
  return (
    <Sheet open={open} onClose={() => setSheet(null)} title="Alerts">
      {alerts.length === 0 ? (
        <p className="muted">No alerts right now. Follow a venue to hear when it gets busy.</p>
      ) : (
        <ul className="alert-list">
          {alerts.map((a, i) => (
            <li key={i}>
              <button
                className="alert-row"
                onClick={() => {
                  setSheet(null)
                  push({ name: 'venue', id: a.v.id })
                }}
              >
                <span className={`alert-card__icon lvl-${a.tone}`}>
                  <Icon name={a.icon} size={18} />
                </span>
                <span className="alert-card__text">
                  <b>{a.title}</b>
                  <span>{a.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">You follow {follows.size} venues. Manage alerts in Saved.</p>
    </Sheet>
  )
}
