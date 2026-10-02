import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/I18nContext'

export default function ChoiceDialog({ title, description, choices, onClose, busy = false }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const { t } = useI18n()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current() }
      if (event.key !== 'Tab') return
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [])

  return <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div ref={dialogRef} className="modal-card choice-dialog" role="dialog" aria-modal="true" aria-labelledby="choice-dialog-title" aria-describedby="choice-dialog-description"><h3 id="choice-dialog-title">{title}</h3><p id="choice-dialog-description" className="page-subtitle">{description}</p><div className="choice-actions">{choices.map(choice => <button key={choice.label} type="button" className={`btn ${choice.variant ?? 'btn-secondary'}`} disabled={busy} onClick={choice.onClick}>{choice.label}</button>)}<button type="button" className="btn btn-ghost" aria-disabled={busy} onClick={onClose}>{t('cancel')}</button></div></div></div>
}
