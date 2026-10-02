import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { VENUES } from './data.js'
import { DAYS, fmtHour, pulse } from './engine.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const seedReports = () => Object.fromEntries(VENUES.map((v) => [v.id, v.seedReports ? [...v.seedReports] : []]))

export const DEMO_START = { day: 5, h: 22.5 } // Friday 10:30 PM

export function resolveWhen(when, clock) {
  const { day, h } = clock
  switch (when) {
    case 'tonight': {
      const th = Math.min(Math.max(h + 1, 22.5), 27)
      return { day, h: th, live: false, label: 'Tonight', long: `Tonight · ${fmtHour(th)}` }
    }
    case 'tomorrow':
      return { day: (day + 1) % 7, h: 23, live: false, label: 'Tomorrow', long: `${DAYS[(day + 1) % 7]} · 11 PM` }
    case 'fri':
      return { day: 5, h: 23, live: false, label: 'Fri', long: 'Friday · 11 PM' }
    case 'sat':
      return { day: 6, h: 23, live: false, label: 'Sat', long: 'Saturday · 11 PM' }
    case 'sat-brunch':
      return { day: 6, h: 12.5, live: false, label: 'Sat brunch', long: 'Saturday · 12:30 PM' }
    case 'sun-brunch':
      return { day: 0, h: 13, live: false, label: 'Sun brunch', long: 'Sunday · 1 PM' }
    default:
      return { day, h, live: true, label: 'Now', long: `Now · ${DAYS[day]} ${fmtHour(h)}` }
  }
}

export function whenOptions(clock, brunch) {
  if (brunch) return ['now', 'sat-brunch', 'sun-brunch']
  const opts = ['now', 'tonight', 'tomorrow']
  const tomorrow = (clock.day + 1) % 7
  if (clock.day !== 5 && tomorrow !== 5) opts.push('fri')
  if (clock.day !== 6 && tomorrow !== 6) opts.push('sat')
  return opts
}

export function AppProvider({ children }) {
  const [clock, setClock] = useState(DEMO_START)
  const [tab, setTabRaw] = useState('discover')
  const [stack, setStack] = useState([])
  const [reportsById, setReports] = useState(seedReports)
  const [saved, setSaved] = useState(() => new Set(['guava', 'tokyo-nightlife']))
  const [follows, setFollows] = useState(() => new Set(['tokyo-nightlife', 'boom-boom-room']))
  const [going, setGoing] = useState(null) // { id, prompted }
  const [sheet, setSheet] = useState(null)
  const [toast, setToastMsg] = useState(null)
  const toastTimer = useRef()

  const showToast = useCallback((m) => {
    clearTimeout(toastTimer.current)
    setToastMsg(m)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800)
  }, [])

  const push = useCallback((route) => setStack((s) => [...s, route]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const setTab = useCallback((t) => {
    setTabRaw(t)
    setStack([])
  }, [])

  const toggleSaved = useCallback(
    (id) =>
      setSaved((s) => {
        const n = new Set(s)
        n.has(id) ? n.delete(id) : n.add(id)
        return n
      }),
    [],
  )
  const toggleFollow = useCallback(
    (id) =>
      setFollows((s) => {
        const n = new Set(s)
        n.has(id) ? n.delete(id) : n.add(id)
        return n
      }),
    [],
  )
  const addReport = useCallback((id, level) => setReports((r) => ({ ...r, [id]: [...(r[id] || []), level] })), [])
  const resetReports = useCallback(() => setReports(seedReports()), [])

  const pulseOf = useCallback((v, ctx = { ...clock, live: true }) => pulse(v, { ...ctx, reports: reportsById[v.id] }), [clock, reportsById])

  const value = useMemo(
    () => ({
      venues: VENUES,
      clock,
      setClock,
      tab,
      setTab,
      stack,
      push,
      pop,
      reportsById,
      addReport,
      resetReports,
      saved,
      toggleSaved,
      follows,
      toggleFollow,
      going,
      setGoing,
      sheet,
      setSheet,
      toast,
      showToast,
      pulseOf,
    }),
    [clock, tab, setTab, stack, push, pop, reportsById, addReport, resetReports, saved, toggleSaved, follows, toggleFollow, going, sheet, toast, showToast, pulseOf],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
