// Vibe Engine (prototype). Combines historical pattern + day/time + events + recent
// community reports into an estimated crowd level, and is explicit about where each
// estimate comes from. It never presents a prediction as an observation.

export const LEVELS = [
  { id: 'quiet', label: 'Very quiet', short: 'Quiet', word: 'quiet' },
  { id: 'chill', label: 'Chill', short: 'Chill', word: 'chill' },
  { id: 'moderate', label: 'Moderate', short: 'Moderate', word: 'moderate' },
  { id: 'lively', label: 'Lively', short: 'Lively', word: 'lively' },
  { id: 'popping', label: 'Popping', short: 'Popping', word: 'popping' },
]

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const LIVE_MIN_REPORTS = 3

const gauss = (h, mu, s) => Math.exp(-((h - mu) ** 2) / (2 * s * s))

const NIGHT_DAY = [0.55, 0.32, 0.38, 0.52, 0.74, 1, 1]
const FOOD_DAY = [0.85, 0.5, 0.55, 0.6, 0.72, 0.95, 1]
const CAFE_DAY = [0.95, 0.6, 0.6, 0.62, 0.65, 0.75, 1]

export function parseHour(str) {
  if (!str) return null
  if (/midnight/i.test(str)) return 24
  const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!m) return null
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'PM') h += 12
  h += m[2] ? Number(m[2]) / 60 : 0
  if (h < 6) h += 24
  return h
}

export function fmtHour(h, { short = false } = {}) {
  const hh = ((Math.floor(h) % 24) + 24) % 24
  const mm = Math.round((h - Math.floor(h)) * 60)
  if (hh === 0 && mm === 0 && !short) return 'Midnight'
  const ap = hh < 12 ? 'AM' : 'PM'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const t = mm ? `${h12}:${String(mm).padStart(2, '0')}` : `${h12}`
  return short ? `${t}${ap[0].toLowerCase()}` : `${t} ${ap}`
}

export function isOpen(v, day, h) {
  const r = v.hours[day]
  return !!r && h >= r[0] && h < r[1]
}

function intensity(v, day, h) {
  let base = 0
  let mult = 1
  switch (v.kind) {
    case 'club':
      base = gauss(h, 25.6, 1.7)
      mult = NIGHT_DAY[day]
      break
    case 'lounge':
      base = gauss(h, 23.6, 2.1)
      mult = NIGHT_DAY[day]
      break
    case 'cocktail':
      base = gauss(h, 21.8, 2.0)
      mult = NIGHT_DAY[day] * 0.9 + 0.1
      break
    case 'restaurant': {
      base = Math.max(gauss(h, 20, 1.3), 0.5 * gauss(h, 13.5, 1))
      if (v.brunch && (day === 0 || day === 6)) base = Math.max(base, gauss(h, 13.2, 1.3))
      mult = FOOD_DAY[day]
      break
    }
    case 'cafe':
      base = Math.max(gauss(h, 11.5, 1.8), 0.55 * gauss(h, 15.5, 1.2))
      mult = CAFE_DAY[day]
      break
    default:
      base = 0.3
  }
  let x = base * mult * (v.weight ?? 1)
  const ev = v.events?.[day]
  const evh = parseHour(ev?.time)
  if (evh != null && h >= evh - 0.5 && h <= evh + 3) x += 0.22
  return x
}

const KIND_CAP = { club: 4, lounge: 4, cocktail: 3, restaurant: 3, cafe: 3 }

const toLevel = (x) => (x >= 0.8 ? 4 : x >= 0.58 ? 3 : x >= 0.36 ? 2 : x >= 0.16 ? 1 : 0)

/** Expected level at a given service-day hour, or null when closed. */
export function expectedLevel(v, day, h) {
  if (!isOpen(v, day, h)) return null
  const cap = (v.maxLevel ?? KIND_CAP[v.kind] ?? 4) + (v.events?.[day] ? 1 : 0)
  return Math.min(toLevel(intensity(v, day, h)), cap, 4)
}

/** Hourly forecast for the hours a venue is open on a day (half-hour granularity → hourly). */
export function dayForecast(v, day) {
  const r = v.hours[day]
  if (!r) return []
  const out = []
  for (let h = Math.ceil(r[0]); h < r[1]; h++) out.push({ h, level: expectedLevel(v, day, h + 0.5) ?? 0 })
  return out
}

export function peakWindow(v, day) {
  const f = dayForecast(v, day)
  if (!f.length) return null
  const max = Math.max(...f.map((x) => x.level))
  const i = f.findIndex((x) => x.level === max)
  let j = i
  while (j + 1 < f.length && f[j + 1].level === max) j++
  return { from: f[i].h, to: f[j].h + 1, level: max }
}

export function calmWindow(v, day) {
  const f = dayForecast(v, day)
  if (!f.length) return null
  const min = Math.min(...f.map((x) => x.level))
  const i = f.findIndex((x) => x.level === min)
  let j = i
  while (j + 1 < f.length && f[j + 1].level === min) j++
  return { from: f[i].h, to: f[j].h + 1, level: min }
}

export function suggestedArrival(v, day) {
  const p = peakWindow(v, day)
  if (!p) return null
  const r = v.hours[day]
  const from = Math.max(r[0], p.from - 0.5)
  return { from, to: Math.min(from + 1, r[1]) }
}

export function weekOutlook(v) {
  return DAYS.map((d, day) => {
    const p = peakWindow(v, day)
    return { day, label: d, level: p ? p.level : null }
  })
}

export function nextOpening(v, day, h) {
  const r = v.hours[day]
  if (r && h < r[0]) return { day, h: r[0], today: true }
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7
    if (v.hours[d]) return { day: d, h: v.hours[d][0], today: false, tomorrow: k === 1 }
  }
  return null
}

export function opensLabel(v, day, h) {
  const n = nextOpening(v, day, h)
  if (!n) return 'Hours not confirmed'
  if (n.today) return `Opens ${fmtHour(n.h)}`
  if (n.tomorrow) return `Opens tomorrow ${fmtHour(n.h)}`
  return `Opens ${DAYS[n.day]} ${fmtHour(n.h)}`
}

export function closesLabel(v, day) {
  const r = v.hours[day]
  return r ? `Closes ${fmtHour(r[1])}` : 'Closed today'
}

export function hoursLabel(v, day) {
  const r = v.hours[day]
  return r ? `${fmtHour(r[0])} – ${fmtHour(r[1])}` : 'Closed'
}

/**
 * Current pulse for a venue.
 * ctx = { day, h, live: boolean (true only for "Now"), reports: number[] }
 */
export function pulse(v, ctx) {
  const { day, h, live, reports = [] } = ctx
  if (live && v.reportedClosed) {
    return { state: 'reported_closed', note: v.reportedClosed.note }
  }
  if (!isOpen(v, day, h)) {
    return { state: 'closed', opens: opensLabel(v, day, h) }
  }
  const expected = expectedLevel(v, day, h)
  const hasEvent = !!v.events?.[day]
  if (live && reports.length >= LIVE_MIN_REPORTS) {
    const recent = reports.slice(-8)
    const level = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    return {
      state: 'open',
      level,
      expected,
      source: 'live',
      confidence: reports.length >= 5 ? 'High' : 'Medium',
      reports: reports.length,
      divergent: Math.abs(level - expected) >= 1,
      hasEvent,
    }
  }
  const confidence = v.history === 'strong' ? (live ? 'Medium' : 'High') : v.history === 'medium' ? 'Medium' : 'Low'
  return {
    state: 'open',
    level: expected,
    expected,
    source: 'expected',
    confidence,
    reports: reports.length,
    divergent: false,
    hasEvent,
    lowData: v.history === 'thin' || (live && reports.length === 0 && v.history !== 'strong'),
  }
}

/** Plain sentence describing how sure we are. */
export function basisLine(v, p, { day, live }) {
  if (p.state !== 'open') return ''
  const dname = DAYS_LONG[day]
  if (p.source === 'live') return `Based on ${p.reports} community reports in the last 45 min.`
  const parts = [`typical ${dname} activity`]
  if (p.hasEvent) parts.push(`tonight's event`)
  const basis = `Based on ${parts.join(' and ')}.`
  if (!live) return `Forecast. ${basis}`
  if (v.history === 'thin') return `Limited live reports. ${basis}`
  return `No live reports yet. ${basis}`
}

// ---- Matching ----------------------------------------------------------------

const CLUBBY = ['club', 'lounge']

export function vibeFit(v, p, vibe, day) {
  // returns { score, reasons[] } or null when the venue doesn't fit at all
  const lvl = p.state === 'open' ? p.level : null
  const reasons = []
  let score = v.rating
  switch (vibe) {
    case 'popping':
      if (!CLUBBY.includes(v.kind) && v.kind !== 'cocktail') return null
      if (lvl != null) score += lvl * 2.2
      if (v.kind === 'club') (score += 1.5), reasons.push('Dance floor')
      if (lvl >= 3) reasons.push(p.source === 'live' ? (lvl === 4 ? 'Packed right now' : 'Busy right now') : lvl === 4 ? 'Usually packed now' : 'Usually busy now')
      break
    case 'social':
      if (!['lounge', 'cocktail', 'restaurant'].includes(v.kind)) return null
      if (lvl != null) score += 5 - Math.abs(lvl - 3) * 1.6
      if (v.tags.includes('social')) (score += 1), reasons.push('Easy to mingle')
      if (lvl === 2 || lvl === 3) reasons.push('Busy, not rammed')
      break
    case 'chill':
      if (v.kind === 'club') return null
      if (lvl != null) score += (4 - lvl) * 1.5
      if (v.conversation === 'Easy') (score += 1.2), reasons.push('Easy to talk')
      if (lvl != null && lvl <= 2) reasons.push('Room to breathe')
      break
    case 'date':
      if (v.kind === 'club') return null
      if (!v.tags.some((t) => ['romantic', 'conversation', 'cocktails', 'tapas'].includes(t))) return null
      if (lvl != null) score += 4 - Math.abs(lvl - 2) * 1.5
      if (v.tags.includes('romantic')) (score += 1.5), reasons.push('Good for two')
      if (v.noise.startsWith('Low')) reasons.push('Low noise')
      break
    case 'dinner':
      if (!(v.kind === 'restaurant' || v.tags.includes('tapas'))) return null
      if (lvl != null) score += 2
      reasons.push(v.kind === 'restaurant' ? 'Full menu' : 'Small plates')
      if (v.reserve) reasons.push('Takes reservations')
      break
    case 'brunch':
      if (!v.brunch) return null
      if (lvl != null) score += 2
      if (v.tags.includes('bottomless') && !/bottomless/i.test(v.events?.[day]?.title || '')) reasons.push('Bottomless option')
      if (v.tags.includes('outdoor')) reasons.push('Outdoor seating')
      break
    default:
      break
  }
  if (p.state === 'open' && p.hasEvent && v.events[day]) reasons.unshift(v.events[day].title)
  return { score, reasons: reasons.slice(0, 3) }
}

/** Rank venues for a vibe and moment; closed venues go to a separate list. */
export function rank(venues, { vibe, day, h, live, reportsById = {}, filters = {} }) {
  const open = []
  const later = []
  const flagged = []
  for (const v of venues) {
    if (!passesFilters(v, filters)) continue
    const p = pulse(v, { day, h, live, reports: reportsById[v.id] })
    if (p.state === 'reported_closed') {
      const fit = vibeFit(v, { state: 'closed' }, vibe, day)
      if (fit) flagged.push({ v, p, fit })
      continue
    }
    const fit = vibeFit(v, p, vibe, day)
    if (!fit) continue
    if (filters.crowd?.length && p.state === 'open' && !filters.crowd.includes(LEVELS[p.level].id)) continue
    if (p.state === 'open') open.push({ v, p, fit })
    else later.push({ v, p, fit })
  }
  open.sort((a, b) => b.fit.score - a.fit.score)
  later.sort((a, b) => b.fit.score - a.fit.score)
  return { open, later, flagged }
}

export function passesFilters(v, f) {
  if (f.area?.length && !f.area.includes(v.area)) return false
  if (f.music?.length && !v.music.some((m) => f.music.includes(m))) return false
  if (f.budget?.length && !f.budget.includes(v.price)) return false
  if (f.tags?.length && !f.tags.every((t) => v.tags.includes(t))) return false
  return true
}

export function similarVenues(venues, v, ctx, n = 3) {
  return venues
    .filter((x) => x.id !== v.id && (x.kind === v.kind || x.tags.some((t) => v.tags.includes(t))))
    .map((x) => ({ v: x, p: pulse(x, { ...ctx, reports: ctx.reportsById?.[x.id] }) }))
    .filter((x) => x.p.state === 'open')
    .sort((a, b) => (a.v.area === v.area ? -1 : 0) - (b.v.area === v.area ? -1 : 0) || b.v.rating - a.v.rating)
    .slice(0, n)
}

// ---- "Describe your night" ----------------------------------------------------

const KEYWORDS = [
  [/(date|romantic|anniversary|partner|bae|girlfriend|boyfriend)/i, { vibe: 'date' }],
  [/(dinner|eat|food|restaurant|suya|small chops)/i, { vibe: 'dinner' }],
  [/(brunch|breakfast|morning|mimosa|bottomless)/i, { vibe: 'brunch' }],
  [/(packed|popping|turn ?up|rave|party|dance|club|lit)/i, { vibe: 'popping' }],
  [/(quiet|calm|chill|relax|low.?key|not (too )?(loud|busy|crowded)|avoid crowds|hate crowd)/i, { vibe: 'chill' }],
  [/(friends|mingle|social|hang ?out|catch up|after work)/i, { vibe: 'social' }],
]

export function parseQuery(q, { areas, music }) {
  const out = { vibe: null, area: [], music: [], budget: [], tags: [] }
  for (const [re, val] of KEYWORDS) if (re.test(q)) { out.vibe = val.vibe; break }
  for (const a of areas) if (new RegExp(a.replace(' ', '\\s*'), 'i').test(q)) out.area.push(a)
  for (const m of music) {
    const key = m.split(' ')[0].replace('/', '')
    if (new RegExp(key, 'i').test(q)) out.music.push(m)
  }
  if (/(cheap|budget|affordable|broke)/i.test(q)) out.budget = [1, 2]
  if (/(fancy|upscale|bougie|classy|luxury)/i.test(q)) out.budget = [3, 4]
  if (/(outdoor|outside|garden|terrace|rooftop|poolside)/i.test(q)) out.tags.push('outdoor')
  if (/(live (music|band))/i.test(q)) out.tags.push('live music')
  if (/(shisha|hookah)/i.test(q)) out.tags.push('shisha')
  return out
}
