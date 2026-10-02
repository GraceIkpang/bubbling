import { useEffect, useState } from 'react'
import { LEVELS, fmtHour, dayForecast, DAYS } from './engine.js'

export const levelId = (l) => (l == null ? 'none' : LEVELS[l].id)

/* Five-bubble meter: the core "how busy" glyph used everywhere. */
export function Bubbles({ level, live = false, size = 'md' }) {
  return (
    <span className={`bubbles bubbles--${size} lvl-${levelId(level)} ${live ? 'is-live' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} style={{ '--i': i }} />
      ))}
    </span>
  )
}

export function PulseBadge({ p, size = 'md' }) {
  if (p.state === 'reported_closed') return <span className="pill pill--warn">Reported closed tonight</span>
  if (p.state === 'closed') return <span className="pill pill--muted">Closed · {p.opens}</span>
  const L = LEVELS[p.level]
  const live = p.source === 'live'
  const low = p.confidence === 'Low'
  return (
    <span className={`pulse pulse--${size} lvl-${L.id} ${live ? '' : 'is-expected'}`}>
      <Bubbles level={p.level} live={live} size={size === 'lg' ? 'lg' : 'sm'} />
      <span className="pulse__label">{low ? `Likely ${L.word}` : L.label}</span>
    </span>
  )
}

export function SourceTag({ p }) {
  if (p.state !== 'open') return null
  if (p.source === 'live')
    return (
      <span className="src src--live">
        <span className="dot-live" /> Live · {p.reports} reports
      </span>
    )
  return <span className="src">Expected · {p.confidence} confidence</span>
}

export function VenueArt({ v, className = '', children }) {
  const h = v.hue
  return (
    <div
      className={`art ${className}`}
      style={{
        '--h1': `${h}`,
        '--h2': `${(h + 40) % 360}`,
      }}
    >
      <span className="art__mono" aria-hidden="true">
        {v.name.replace(/^The /, '').split(' ').slice(0, 2).map((w) => w[0]).join('')}
      </span>
      {children}
    </div>
  )
}

export function Price({ n }) {
  return (
    <span className="price" aria-label={`Price level ${n} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''}>₦</span>
      ))}
    </span>
  )
}

export function Chip({ active, onClick, children, ...rest }) {
  return (
    <button type="button" className={`chip ${active ? 'is-active' : ''}`} aria-pressed={!!active} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

export function Sheet({ open, onClose, title, children, footer, tall }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className={`sheet ${tall ? 'sheet--tall' : ''}`}>
        <div className="sheet__grip" />
        <div className="sheet__head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>
  )
}

// liveLevel: live crowd level for the current hour, drawn over the usual bar (Google Maps "Live" pattern)
export function ForecastChart({ v, day, nowH, live, liveLevel = null, compact = false }) {
  const f = dayForecast(v, day)
  const [sel, setSel] = useState(null)
  useEffect(() => setSel(null), [day, v.id])
  if (!f.length) return <p className="muted small">Closed on {DAYS[day]}s.</p>
  const nowIdx = live ? f.findIndex((x) => nowH >= x.h && nowH < x.h + 1) : -1
  const active = sel ?? (nowIdx >= 0 ? nowIdx : null)
  return (
    <div className={`chart ${compact ? 'chart--compact' : ''}`}>
      <div className="chart__tip" aria-live="polite">
        {active != null ? (
          <>
            <b>{fmtHour(f[active].h)}</b>
            {active === nowIdx && sel == null ? ' · now' : ''}
            {active === nowIdx && liveLevel != null ? (
              <>
                {' '}· <span className="chart__live">Live</span> {LEVELS[liveLevel].word}, usually {LEVELS[f[active].level].word}
              </>
            ) : (
              <> · usually {LEVELS[f[active].level].word}</>
            )}
          </>
        ) : (
          <span className="muted">Tap a bar to see the hour</span>
        )}
      </div>
      <div className="chart__bars" role="list">
        {f.map((x, i) => (
          <button
            key={x.h}
            role="listitem"
            className={`bar lvl-${levelId(i === nowIdx && liveLevel != null ? liveLevel : x.level)} ${i === active ? 'is-sel' : ''} ${i === nowIdx ? 'is-now' : ''} ${i === nowIdx && liveLevel != null ? 'has-live' : ''}`}
            style={{ '--v': (x.level + 1) / 5, '--live': ((liveLevel ?? 0) + 1) / 5 }}
            onClick={() => setSel(i)}
            aria-label={`${fmtHour(x.h)}: ${i === nowIdx && liveLevel != null ? `live ${LEVELS[liveLevel].label}, usually ` : ''}${LEVELS[x.level].label}`}
          >
            <span />
            {i === nowIdx && liveLevel != null && <i className="bar__live" />}
          </button>
        ))}
      </div>
      <div className="chart__axis">
        {f.map((x, i) => (
          <span key={x.h}>{i % 2 === 0 || f.length < 8 ? fmtHour(x.h, { short: true }) : ''}</span>
        ))}
      </div>
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  )
}

const PATHS = {
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4.2-4.2',
  filter: 'M4 6h16M7 12h10M10 18h4',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5l-2 5-5 2 2-5 5-2z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0',
  nav: 'M3 11l18-8-8 18-2-8-8-2z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01',
  alert: 'M12 4l9 16H3L12 4zm0 6v4m0 3h.01',
  chev: 'M9 6l6 6-6 6',
  check: 'M5 12l5 5 9-10',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  shirt: 'M8 4l-5 3 2 4 2-1v10h10V10l2 1 2-4-5-3a4 4 0 0 1-8 0z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0M17 3a4 4 0 0 1 0 8m5 9a7 7 0 0 0-4-6.3',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
}

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
