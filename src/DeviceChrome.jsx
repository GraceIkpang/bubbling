// iPhone mockup chrome (iPhone 16 Pro, per Apple's HIG device specs):
// 54pt status bar with the Dynamic Island, 34pt home-indicator safe area.
// Decorative only; hidden on real touch phones, which draw their own (see .statusbar in styles.css).

// iOS hides AM/PM in the status bar: "10:30", not "10:30 PM"
function statusTime(h) {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h % 1) * 60)
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`
}

export function StatusBar({ h, light }) {
  return (
    <div className={`statusbar ${light ? 'is-light' : ''}`} aria-hidden="true">
      <span className="statusbar__time">{statusTime(h)}</span>
      <span className="statusbar__island" />
      <span className="statusbar__icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
          <rect x="5" y="5" width="3" height="7" rx="1" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M1.4 4.4a9.3 9.3 0 0 1 13.2 0" />
          <path d="M4.1 7.1a5.5 5.5 0 0 1 7.8 0" />
          <path d="M8 11.1 6.3 9.4a2.4 2.4 0 0 1 3.4 0z" fill="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="9" rx="2.5" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  )
}

export function HomeIndicator() {
  return <span className="home-indicator" aria-hidden="true" />
}
