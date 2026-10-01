import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/axios'
import { useI18n } from '../../i18n/I18nContext'
import ChoiceDialog from '../../components/ui/ChoiceDialog'

function OccurrenceItem({ occurrence, onAction, busy, recentCutoff }) {
  const { t, currency } = useI18n()
  const rule = occurrence.rule
  const actualAmount = occurrence.expense?.amount ?? occurrence.income?.amount
  const [amount, setAmount] = useState(actualAmount ?? rule.amount)
  const isPending = occurrence.status === 'pending'
  const isConfirmed = occurrence.status === 'confirmed'
  const isSkipped = occurrence.status === 'skipped'
  const showAutomatic = isConfirmed && occurrence.auto_confirmed_at && new Date(occurrence.auto_confirmed_at).getTime() >= recentCutoff

  return <li className="recurring-item"><div><strong>{rule.description}</strong><span className="text-muted">{t(rule.type === 'expense' ? 'expenseType' : 'incomeType')} · {currency(actualAmount ?? rule.amount)}</span>{showAutomatic ? <span className="auto-note">{t('confirmedAutomatically')}</span> : <span className="text-muted">{t(isPending ? 'pendingStatus' : isSkipped ? 'skippedStatus' : 'confirmedStatus')}</span>}</div>
    {isPending && (rule.active ? <form className="recurring-actions" onSubmit={event => { event.preventDefault(); onAction('confirm', occurrence.id, { amount }) }}><label className="sr-only" htmlFor={`occurrence-amount-${occurrence.id}`}>{t('confirmAmount')}</label><input id={`occurrence-amount-${occurrence.id}`} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /><button className="btn btn-primary btn-sm" disabled={busy}>{t('confirmOccurrence')}</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('skip', occurrence.id)}>{t('skipOccurrence')}</button></form> : <span className="text-muted">{t('rulePausedHint')}</span>)}
    {isConfirmed && <form className="recurring-actions" onSubmit={event => { event.preventDefault(); onAction('adjust', occurrence.id, { amount }) }}><label className="sr-only" htmlFor={`adjust-amount-${occurrence.id}`}>{t('adjustAmount')}</label><input id={`adjust-amount-${occurrence.id}`} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /><button className="btn btn-secondary btn-sm" disabled={busy}>{t('adjustAmount')}</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { if (window.confirm(t('undoConfirmationQuestion'))) onAction('undo', occurrence.id) }}>{t('undoConfirmation')}</button></form>}
    {isSkipped && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onAction('reopen', occurrence.id)}>{t('reopenMonth')}</button>}
  </li>
}

function RuleItem({ rule, onSave, onDelete, busy }) {
  const { t, currency } = useI18n()
  const [description, setDescription] = useState(rule.description)
  const [amount, setAmount] = useState(rule.amount)
  const [day, setDay] = useState(rule.day_of_month)
  const [autoConfirm, setAutoConfirm] = useState(rule.auto_confirm)
  const [endsOn, setEndsOn] = useState(rule.ends_on?.substring(0, 10) ?? '')

  return <li className="recurring-rule"><details><summary><span>{rule.description} <small>· {t(rule.type === 'expense' ? 'expenseType' : 'incomeType')} · {currency(rule.amount)} · {t('monthlyDay', { day: rule.day_of_month })}</small></span><span className="text-muted">{t(rule.active ? 'activeRule' : 'inactiveRule')}</span></summary><form className="rule-editor" onSubmit={event => { event.preventDefault(); onSave(rule.id, { description, amount, day_of_month: Number(day), auto_confirm: autoConfirm, ends_on: endsOn || null }) }}><div className="form-group"><label htmlFor={`rule-description-${rule.id}`}>{t('description')}</label><input id={`rule-description-${rule.id}`} value={description} onChange={event => setDescription(event.target.value)} required /></div><div className="rule-fields"><div className="form-group"><label htmlFor={`rule-amount-${rule.id}`}>{t('amountBrl')}</label><input id={`rule-amount-${rule.id}`} type="number" step="0.01" min="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></div><div className="form-group"><label htmlFor={`rule-day-${rule.id}`}>{t('dayOfMonth')}</label><input id={`rule-day-${rule.id}`} type="number" min="1" max="31" value={day} onChange={event => setDay(event.target.value)} required /></div><div className="form-group"><label htmlFor={`rule-end-${rule.id}`}>{t('endsOn')}</label><input id={`rule-end-${rule.id}`} type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} /></div></div><label className="check-row"><input type="checkbox" checked={autoConfirm} onChange={event => setAutoConfirm(event.target.checked)} />{t('autoConfirm')}</label><div className="rule-buttons"><button className="btn btn-secondary btn-sm" disabled={busy}>{t('saveChanges')}</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onSave(rule.id, { active: !rule.active })}>{t(rule.active ? 'deactivateRule' : 'reactivateRule')}</button><button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onDelete(rule)}>{t('deleteRecurrence')}</button></div></form></details></li>
}

export default function RecurringPanel({ month, year, refreshToken, onChanged, onFeedback }) {
  const { t, monthName } = useI18n()
  const [rules, setRules] = useState(null)
  const [occurrences, setOccurrences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recentCutoff, setRecentCutoff] = useState(0)
  const [deletingRule, setDeletingRule] = useState(null)
  const requestId = useRef(0)
  const periodUrl = `/recurring-occurrences?month=${month}&year=${year}`

  const load = useCallback(async (prepare = false) => {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [occurrenceResponse, ruleResponse] = await Promise.all([
        prepare ? api.post('/recurring-occurrences/prepare', { month, year }) : api.get(periodUrl),
        api.get('/recurring-rules'),
      ])
      if (current === requestId.current) { setOccurrences(occurrenceResponse.data); setRules(ruleResponse.data); setRecentCutoff(Date.now() - 7 * 86400000) }
    } catch {
      if (current === requestId.current) setError(t('loadError'))
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [month, year, periodUrl, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true)
    const sequence = requestId
    return () => { sequence.current++ }
  }, [load, refreshToken])

  async function handleAction(action, id, payload) {
    setBusy(true)
    try {
      if (action === 'adjust') await api.patch(`/recurring-occurrences/${id}/amount`, payload)
      else await api.post(`/recurring-occurrences/${id}/${action}`, payload)
      await load()
      onChanged()
      onFeedback(action === 'confirm' ? 'occurrenceConfirmed' : action === 'skip' ? 'occurrenceSkipped' : action === 'adjust' ? 'occurrenceAdjusted' : action === 'reopen' ? 'monthReopened' : 'confirmationUndone')
    } catch { onFeedback('recurringActionError', true) }
    finally { setBusy(false) }
  }

  async function handleRuleSave(id, payload) {
    setBusy(true)
    try {
      await api.patch(`/recurring-rules/${id}`, payload)
      await load(true)
      onFeedback('ruleUpdated')
    } catch { onFeedback('recurringActionError', true) }
    finally { setBusy(false) }
  }

  async function handleRuleDelete(mode) {
    setBusy(true)
    try {
      await api.delete(`/recurring-rules/${deletingRule.id}`, { data: { mode } })
      await load(true)
      onChanged()
      onFeedback(mode === 'keep_entries' ? 'ruleDeletedKeepEntries' : 'ruleDeletedWithEntries')
      setDeletingRule(null)
    } catch { onFeedback('recurringActionError', true) }
    finally { setBusy(false) }
  }

  const visible = occurrences ?? []
  const pendingCount = visible.filter(occurrence => occurrence.status === 'pending').length

  return <section className="card recurring-panel mb-3" aria-busy={loading}><div className="recurring-heading"><div><p className="page-kicker">{t('monthlyFlow')}</p><h3>{t('recurringFor', { period: `${monthName(month - 1)} ${year}` })}</h3></div>{pendingCount > 0 && <span className="pending-count">{t(pendingCount === 1 ? 'pendingCountOne' : 'pendingCountMany', { count: pendingCount })}</span>}</div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && !occurrences && <div aria-label={t('loading')}><div className="skeleton skeleton-row" /><div className="skeleton skeleton-row" /></div>}
    {occurrences && <>{visible.length ? <ul className="recurring-list">{visible.map(occurrence => <OccurrenceItem key={`${occurrence.id}-${occurrence.status}-${occurrence.rule.amount}-${occurrence.expense?.amount ?? occurrence.income?.amount ?? ''}`} occurrence={occurrence} busy={busy} recentCutoff={recentCutoff} onAction={handleAction} />)}</ul> : <p className="page-subtitle">{t('noOccurrencesThisMonth')}</p>}</>}
    {rules && <details className="rules-manager"><summary>{t('manageRecurringRules')} ({rules.length})</summary>{rules.length ? <ul className="recurring-list">{rules.map(rule => <RuleItem key={`${rule.id}-${rule.description}-${rule.amount}-${rule.day_of_month}-${rule.auto_confirm}-${rule.active}-${rule.ends_on}`} rule={rule} busy={busy} onSave={handleRuleSave} onDelete={setDeletingRule} />)}</ul> : <p className="page-subtitle">{t('noRecurringRules')}</p>}</details>}
    {deletingRule && <ChoiceDialog title={t('deleteRecurrenceQuestion', { name: deletingRule.description })} description={t(deletingRule.linked_entries_count === 0 ? 'deleteRecurrenceHelpNone' : deletingRule.linked_entries_count === 1 ? 'deleteRecurrenceHelpOne' : 'deleteRecurrenceHelpMany', { count: deletingRule.linked_entries_count })} busy={busy} onClose={() => { if (!busy) setDeletingRule(null) }} choices={deletingRule.linked_entries_count === 0 ? [{ label: t('deleteRecurrence'), variant: 'btn-danger', onClick: () => handleRuleDelete('keep_entries') }] : [{ label: t('keepLinkedEntries'), onClick: () => handleRuleDelete('keep_entries') }, { label: t('deleteLinkedEntries'), variant: 'btn-danger', onClick: () => handleRuleDelete('delete_entries') }]} />}
  </section>
}
