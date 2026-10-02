import { useEffect, useRef, useState } from 'react'
import { AppProvider, useApp, DEMO_START } from './store.jsx'
import { DAYS_LONG, fmtHour } from './engine.js'
import { Icon, Toast } from './components.jsx'
import Home from './screens/Home.jsx'
import Results from './screens/Results.jsx'
import Venue from './screens/Venue.jsx'
import Plan from './screens/Plan.jsx'
import Saved from './screens/Saved.jsx'
import MapTab from './screens/MapTab.jsx'
import { AlertsSheet } from './screens/Alerts.jsx'
import { ReportSheet, GoingPrompt } from './screens/Report.jsx'

const TABS = [
  { id: 'discover', label: 'Discover', icon: 'compass' },
  { id: 'map', label: 'Map', icon: 'map' },
  { id: 'plan', label: 'Plan', icon: 'users' },
  { id: 'saved', label: 'Saved', icon: 'heart' },
]

function Screen() {
  const { tab, stack } = useApp()
  const top = stack[stack.length - 1]
  if (top?.name === 'venue') return <Venue key={`${top.id}-${stack.length}`} route={top} />
  if (top?.name === 'results') return <Results key={stack.length + top.vibe + (top.query || '')} route={top} />
  if (tab === 'map') return <MapTab />
  if (tab === 'plan') return <Plan />
  if (tab === 'saved') return <Saved />
  return <Home />
}

function Phone() {
  const { tab, setTab, stack, toast } = useApp()
  const scrollRef = useRef()
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab, stack.length, stack[stack.length - 1]?.id])
  const top = stack[stack.length - 1]
  const hideTabs = top?.name === 'venue'
  return (
    <div className="phone">
      <div className="phone__scroll" ref={scrollRef}>
        <Screen />
      </div>
      <GoingPrompt />
      {!hideTabs && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={`tabbar__btn ${tab === t.id && !stack.length ? 'is-active' : tab === t.id ? 'is-parent' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="tabbar__ic">
                <Icon name={t.icon} size={22} />
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
      <ReportSheet />
      <AlertsSheet />
      <Toast msg={toast} />
    </div>
  )
}

const PRESETS = [
  { label: 'Fri 10:30 PM · big night', day: 5, h: 22.5 },
  { label: 'Sat 1 AM · peak clubbing', day: 6, h: 25 },
  { label: 'Tue 9 PM · quiet weeknight', day: 2, h: 21 },
  { label: 'Sat 1 PM · brunch', day: 6, h: 13 },
]

function DemoPanel({ open, onClose }) {
  const { clock, setClock, resetReports, going, setGoing, setSheet, setTab, push, showToast } = useApp()
  const realNow = () => {
    const d = new Date()
    let h = d.getHours() + d.getMinutes() / 60
    let day = d.getDay()
    if (h < 6) {
      h += 24
      day = (day + 6) % 7
    }
    setClock({ day, h: Math.round(h * 2) / 2 })
  }
  return (
    <aside className={`demo ${open ? 'is-open' : ''}`} aria-label="Prototype controls">
      <div className="demo__head">
        <div>
          <p className="eyebrow">Prototype controls</p>
          <h2>Simulate the night</h2>
        </div>
        <button className="icon-btn demo__close" onClick={onClose} aria-label="Close controls">
          <Icon name="x" />
        </button>
      </div>
      <p className="muted small">Change the clock to see how the Vibe Engine shifts. The app treats 6 AM as the start of a new night.</p>
      <div className="demo__clock">
        <b>
          {DAYS_LONG[clock.day]}, {fmtHour(clock.h)}
        </b>
        <label htmlFor="demo-day">Day</label>
        <select id="demo-day" value={clock.day} onChange={(e) => setClock({ ...clock, day: Number(e.target.value) })}>
          {DAYS_LONG.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <label htmlFor="demo-time">Time</label>
        <input id="demo-time" type="range" min="6" max="29.5" step="0.5" value={clock.h} onChange={(e) => setClock({ ...clock, h: Number(e.target.value) })} />
        <div className="demo__ticks mono">
          <span>6a</span>
          <span>noon</span>
          <span>6p</span>
          <span>mid</span>
          <span>5a</span>
        </div>
      </div>
      <div className="demo__presets">
        {PRESETS.map((p) => (
          <button key={p.label} className={`chip ${clock.day === p.day && clock.h === p.h ? 'is-active' : ''}`} onClick={() => setClock({ day: p.day, h: p.h })}>
            {p.label}
          </button>
        ))}
        <button className="chip" onClick={realNow}>
          Use my real time
        </button>
      </div>
      <h3 className="demo__sub">Jump to a flow</h3>
      <div className="demo__flows">
        <button className="link" onClick={() => { setTab('discover'); push({ name: 'results', vibe: 'popping' }) }}>Popping tonight →</button>
        <button className="link" onClick={() => { setTab('discover'); push({ name: 'venue', id: 'cue-bar' }) }}>Expected vs live (Cue Bar) →</button>
        <button className="link" onClick={() => { setTab('discover'); push({ name: 'venue', id: 'aura-lounge' }) }}>Reported closed (Aura) →</button>
        <button className="link" onClick={() => { setTab('discover'); push({ name: 'venue', id: 'moscow-underground' }) }}>Low confidence (Moscow) →</button>
        <button className="link" onClick={() => setTab('plan')}>Plan for the group →</button>
        <button className="link" onClick={() => { setClock({ day: 6, h: 12.5 }); setTab('discover'); push({ name: 'results', vibe: 'brunch' }) }}>Brunch mode →</button>
      </div>
      <h3 className="demo__sub">Reports</h3>
      <div className="demo__presets">
        <button
          className="chip"
          onClick={() => {
            const id = going?.id || 'tokyo-nightlife'
            setGoing({ id, prompted: true })
            setSheet(null)
          }}
        >
          Trigger “How is it there?”
        </button>
        <button
          className="chip"
          onClick={() => {
            resetReports()
            setClock(DEMO_START)
            showToast('Reset to Friday 10:30 PM')
          }}
        >
          Reset demo
        </button>
      </div>
    </aside>
  )
}

function Shell() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { sheet } = useApp()
  return (
    <div className="stage">
      <div className="stage__intro">
        <p className="eyebrow">Frontend prototype</p>
        <h1 className="display">Know where to go before you leave home.</h1>
        <p className="muted">A live social map and vibe forecast for Abuja. Every crowd estimate says whether it is live, expected, venue reported or community reported.</p>
      </div>
      <Phone />
      <DemoPanel open={demoOpen} onClose={() => setDemoOpen(false)} />
      <button className="demo-fab" hidden={!!sheet || demoOpen} onClick={() => setDemoOpen(true)} aria-label="Open prototype controls">
        <Icon name="clock" size={18} />
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
