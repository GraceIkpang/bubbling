import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { LEVELS, LIVE_MIN_REPORTS } from '../engine.js'
import { Sheet, Bubbles } from '../components.jsx'

export const OPTIONS = [
  { level: 4, label: 'Packed', note: 'Hard to move' },
  { level: 3, label: 'Lively', note: 'Busy, good energy' },
  { level: 2, label: 'Normal', note: 'Comfortable' },
  { level: 1, label: 'Chill', note: 'Plenty of space' },
  { level: 0, label: 'Dead', note: 'Almost empty' },
]

export function ReportSheet() {
  const app = useApp()
  const { sheet, setSheet, venues, addReport, reportsById, showToast, going, setGoing } = app
  const open = sheet?.type === 'report'
  const v = open ? venues.find((x) => x.id === sheet.id) : null
  const [pick, setPick] = useState(null)
  const [closedReport, setClosedReport] = useState(false)
  useEffect(() => {
    setPick(null)
    setClosedReport(false)
  }, [sheet])

  if (!open || !v) return null
  const before = app.pulseOf(v)
  const count = (reportsById[v.id] || []).length

  const submit = () => {
    if (closedReport) {
      showToast(`Thanks. We’ll check whether ${v.name} is closed.`)
    } else {
      addReport(v.id, pick)
      const n = count + 1
      if (n < LIVE_MIN_REPORTS) showToast(`Thanks. ${LIVE_MIN_REPORTS - n} more ${LIVE_MIN_REPORTS - n === 1 ? 'report' : 'reports'} and ${v.name} goes live.`)
      else if (before.state === 'open' && before.level !== pick) showToast(`Thanks. ${v.name}’s live status updated.`)
      else showToast('Thanks. Your report confirms what others said.')
    }
    if (going?.id === v.id) setGoing(null)
    setSheet(null)
  }

  return (
    <Sheet
      open
      onClose={() => setSheet(null)}
      title={`How is it at ${v.name}?`}
      footer={
        <button className="btn btn--primary btn--block" disabled={pick == null && !closedReport} onClick={submit}>
          Send report
        </button>
      }
    >
      <p className="muted small">Your report is anonymous and counts for 45 minutes. {count} {count === 1 ? 'person has' : 'people have'} reported recently.</p>
      <div className="report-opts" role="radiogroup" aria-label="Crowd level">
        {OPTIONS.map((o) => (
          <button
            key={o.level}
            role="radio"
            aria-checked={pick === o.level}
            className={`report-opt lvl-${LEVELS[o.level].id} ${pick === o.level ? 'is-active' : ''}`}
            onClick={() => {
              setPick(o.level)
              setClosedReport(false)
            }}
          >
            <Bubbles level={o.level} size="md" />
            <span className="report-opt__label">{o.label}</span>
            <span className="report-opt__note">{o.note}</span>
          </button>
        ))}
      </div>
      <button
        className={`chip chip--ghost ${closedReport ? 'is-active' : ''}`}
        aria-pressed={closedReport}
        onClick={() => {
          setClosedReport((c) => !c)
          setPick(null)
        }}
      >
        It’s closed
      </button>
    </Sheet>
  )
}

/* Banner shown after "I'm going": the later "How is it there?" prompt. */
export function GoingPrompt() {
  const { going, setGoing, venues, setSheet, sheet } = useApp()
  useEffect(() => {
    if (!going || going.prompted) return
    const t = setTimeout(() => setGoing((g) => (g ? { ...g, prompted: true } : g)), 6000)
    return () => clearTimeout(t)
  }, [going, setGoing])
  if (!going?.prompted || sheet) return null
  const v = venues.find((x) => x.id === going.id)
  return (
    <div className="going-prompt" role="status">
      <span>
        <b>At {v.name}?</b> How is it there?
      </span>
      <button className="btn btn--primary btn--sm" onClick={() => setSheet({ type: 'report', id: v.id })}>
        Report
      </button>
      <button className="icon-btn icon-btn--sm" aria-label="Dismiss" onClick={() => setGoing(null)}>
        ×
      </button>
    </div>
  )
}

/* Inline one-tap crowd check on the venue page. Doubles as forecast-accuracy feedback. */
export function QuickReport({ v, p }) {
  const { addReport, reportsById, setSheet, showToast, going, setGoing } = useApp()
  const [sent, setSent] = useState(null)
  const count = (reportsById[v.id] || []).length

  if (sent != null) {
    // Compare with what the page showed: live reports if we had them, otherwise the forecast
    const { level, shown, source } = sent
    const label = OPTIONS.find((o) => o.level === level).label.toLowerCase()
    return (
      <div className="quick quick--done" role="status">
        <p>
          <b>Thanks.</b> You said <b>{label}</b>; we showed <b>{LEVELS[shown].word}</b>
          {source === 'live' ? ' from live reports' : ' from the forecast'}.
        </p>
        <p className="muted small">{level === shown ? 'Your report confirms what we showed.' : 'Reports like yours correct the status in real time.'}</p>
      </div>
    )
  }
  return (
    <div className="quick">
      <div className="quick__head">
        <p>
          <b>Here now?</b> How busy is it?
        </p>
        <button className="link small" onClick={() => setSheet({ type: 'report', id: v.id })}>
          More options
        </button>
      </div>
      <div className="quick__opts" role="group" aria-label="Report crowd level">
        {OPTIONS.map((o) => (
          <button
            key={o.level}
            className={`quick__opt lvl-${LEVELS[o.level].id}`}
            onClick={() => {
              addReport(v.id, o.level)
              if (going?.id === v.id) setGoing(null)
              setSent({ level: o.level, shown: p.level, source: p.source })
              const n = count + 1
              if (n < LIVE_MIN_REPORTS) showToast(`${LIVE_MIN_REPORTS - n} more ${LIVE_MIN_REPORTS - n === 1 ? 'report' : 'reports'} and ${v.name} goes live.`)
              else if (n === LIVE_MIN_REPORTS) showToast(`${v.name} is now based on live reports.`)
              else showToast('Thanks. Your report updates the live status.')
            }}
          >
            <Bubbles level={o.level} size="xs" />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="muted small">Anonymous. Counts for 45 minutes.</p>
    </div>
  )
}
