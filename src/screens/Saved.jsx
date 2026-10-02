import { useApp } from '../store.jsx'
import { Icon, PulseBadge, VenueArt, SourceTag } from '../components.jsx'

export default function Saved() {
  const app = useApp()
  const { venues, saved, follows, toggleFollow, push, setTab } = app
  const list = venues.filter((v) => saved.has(v.id) || follows.has(v.id))
  return (
    <div className="screen saved">
      <header className="topbar">
        <h1 className="display display--md">Saved</h1>
      </header>
      {list.length === 0 ? (
        <div className="empty">
          <p>
            <b>Nothing saved yet.</b>
          </p>
          <p className="muted">Tap the heart on any venue to keep it here and check its vibe before you leave home.</p>
          <button className="btn btn--primary" onClick={() => setTab('discover')}>
            Find places
          </button>
        </div>
      ) : (
        <ul className="saved-list">
          {list.map((v) => {
            const p = app.pulseOf(v)
            return (
              <li key={v.id} className="saved-row">
                <button className="saved-row__main" onClick={() => push({ name: 'venue', id: v.id })}>
                  <VenueArt v={v} className="mini-row__art" />
                  <span className="saved-row__body">
                    <b>{v.name}</b>
                    <PulseBadge p={p} size="sm" />
                    <SourceTag p={p} />
                  </span>
                </button>
                <label className="toggle">
                  <input type="checkbox" id={`follow-${v.id}`} checked={follows.has(v.id)} onChange={() => toggleFollow(v.id)} />
                  <span className="toggle__track" aria-hidden="true" />
                  <span className="toggle__label">
                    <Icon name="bell" size={14} /> Alert when busy
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
