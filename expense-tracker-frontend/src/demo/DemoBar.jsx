import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { forgetSession } from './adapter'
import { exportDb, importDb, loadDb, resetDb } from './store'

/** faixa do modo demonstração: deixa claro onde os dados ficam e permite levá-los ou recomeçar */
export default function DemoBar() {
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [error, setError] = useState(false)

  function download() {
    const blob = new Blob([exportDb(loadDb())], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `aflua-demo-${new Date().toISOString().substring(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      importDb(await file.text())
      forgetSession()
      window.location.reload()
    } catch {
      setError(true)
    }
  }

  function startOver() {
    if (!window.confirm(t('demoResetConfirm'))) return
    resetDb()
    forgetSession()
    window.location.reload()
  }

  return <aside className="demo-bar" aria-label={t('demoBadge')}><div className="container demo-bar-inner">
    <p><span className="demo-pill">{t('demoBadge')}</span>{error ? <span className="demo-error" role="alert">{t('demoImportError')}</span> : t('demoNotice')}</p>
    <div className="demo-actions">
      <button type="button" className="btn btn-ghost btn-sm" onClick={download}>{t('demoExport')}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setError(false); fileRef.current?.click() }}>{t('demoImport')}</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={upload} />
      <button type="button" className="btn btn-ghost btn-sm" onClick={startOver}>{t('demoReset')}</button>
    </div>
  </div></aside>
}
