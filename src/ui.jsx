import { useLayoutEffect, useRef } from 'react'

// The design's icon set: one hidden SVG sprite, used via <Icon name="…" />.
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></symbol>
      <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5.5M5.8 11.4 12 5.2l6.2 6.2" /></symbol>
      <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v13.5M5.8 12.6 12 18.8l6.2-6.2" /></symbol>
      <symbol id="i-stop" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2.2" /></symbol>
      <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7.5h9M18.5 7.5H20M4 16.5h2.5M12 16.5h8" /><circle cx="15.7" cy="7.5" r="2.4" /><circle cx="9.2" cy="16.5" r="2.4" /></symbol>
      <symbol id="i-chev" viewBox="0 0 24 24"><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></symbol>
      <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.35-5.65L20 8.7" /><path d="M20 4v4.7h-4.7" /></symbol>
      <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4.5 19.5l.9-4.1L16.2 4.6a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.6 18.6l-4.1.9z" /><path d="m14.5 6.5 3 3" /></symbol>
      <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.6 4.4 4.4L19 7.4" /></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h10" /></symbol>
      <symbol id="i-book" viewBox="0 0 24 24"><path d="M12 7c-1.6-1.4-4-2-7.5-2v12.5c3.5 0 5.9.6 7.5 2 1.6-1.4 4-2 7.5-2V5c-3.5 0-5.9.6-7.5 2zM12 7v12.5" /></symbol>
    </svg>
  )
}

// Top-centre notice with an optional action (Undo). Stays mounted so it can slide away.
export function Toast({ toast, onAct }) {
  return (
    <div className={'toast' + (toast?.show ? ' show' : '')} role="status" aria-live="polite">
      <span>{toast?.text}</span>
      {toast?.undo && (
        <button type="button" onClick={onAct}>
          Undo
        </button>
      )}
    </div>
  )
}

export function Icon({ name, className = '' }) {
  return (
    <svg className={'ic ' + className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

// Positioned like the design: above the anchor, left-aligned; below if there's no room above;
// kept inside the viewport. Always mounted (so it can animate out); inert while closed.
// Outside clicks and Esc are handled by the app, which owns which popover is open.
export function Popover({ id, open, anchorRef, label, className = '', children }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const pop = ref.current
      const a = anchorRef.current?.getBoundingClientRect()
      if (!pop || !a) return
      const pw = pop.offsetWidth
      const ph = pop.offsetHeight
      const gap = 10
      let x = a.left
      let y = a.top - ph - gap
      let origin = 'bottom left'
      if (y < 10) {
        y = a.bottom + gap
        origin = 'top left'
      }
      x = Math.max(10, Math.min(x, innerWidth - pw - 10))
      y = Math.max(10, Math.min(y, innerHeight - ph - 10))
      pop.style.left = x + 'px'
      pop.style.top = y + 'px'
      pop.style.transformOrigin = origin
    }
    place()
    addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [open, anchorRef])

  return (
    <div
      id={id}
      ref={ref}
      className={'pop ' + className + (open ? ' open' : '')}
      role="dialog"
      aria-label={label}
      inert={!open}
    >
      {children}
    </div>
  )
}
