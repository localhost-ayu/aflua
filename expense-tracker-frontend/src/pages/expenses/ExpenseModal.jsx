import { useEffect, useRef, useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { useFormErrors } from '../../hooks/useFormErrors'
import { useI18n } from '../../i18n/I18nContext'
import api from '../../api/axios'

export default function ExpenseModal({ entry, entryType = 'expense', closing, onClose, onSuccess }) {
  const isEditing = !!entry
  const [type, setType] = useState(entryType)
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? '')
  const [amount, setAmount] = useState(entry?.amount ?? '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [entryDate, setEntryDate] = useState(() => {
    if (entry) return (entry.expense_date ?? entry.received_at).substring(0, 10)
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [repeatsMonthly, setRepeatsMonthly] = useState(false)
  const [repeatDay, setRepeatDay] = useState(() => Number((entry?.expense_date ?? entry?.received_at)?.substring(8, 10) ?? new Date().getDate()))
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef(null)
  const { data: categories, error: categoriesError } = useFetch('/categories')
  const { errors, globalError, handleApiError, clearErrors } = useFormErrors()
  const { t, categoryName } = useI18n()

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('input, select, button')?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    clearErrors()
    const isExpense = type === 'expense'
    const resource = isExpense ? 'expenses' : 'incomes'
    const payload = {
      amount,
      description,
      ...(isExpense ? { category_id: Number(categoryId), expense_date: entryDate } : { received_at: entryDate }),
    }
    try {
      if (isEditing) await api.put(`/${resource}/${entry.id}`, payload)
      else if (repeatsMonthly) await api.post('/recurring-rules', {
        type,
        description,
        amount,
        starts_on: entryDate,
        day_of_month: Number(repeatDay),
        auto_confirm: autoConfirm,
        ...(isExpense ? { category_id: Number(categoryId) } : {}),
      })
      else await api.post(`/${resource}`, payload)
      onSuccess(type, isEditing ? 'updated' : repeatsMonthly ? 'recurringCreated' : 'created')
    } catch (error) { handleApiError(error) }
    finally { setLoading(false) }
  }

  function handleDateChange(value) {
    if (Number(repeatDay) === Number(entryDate.substring(8, 10))) {
      setRepeatDay(Number(value.substring(8, 10)))
    }
    setEntryDate(value)
  }

  return <div className={`modal-overlay ${closing ? 'is-closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div ref={dialogRef} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
    <div className="modal-header"><h3 id="expense-modal-title">{t(isEditing ? (type === 'expense' ? 'editExpense' : 'editIncome') : 'newEntry')}</h3><button type="button" className="icon-button" onClick={onClose} aria-label={t('cancel')}>×</button></div>
    {!isEditing && <fieldset className="entry-type-toggle"><legend>{t('entryType')}</legend><label className={type === 'expense' ? 'active' : ''}><input type="radio" name="entry-type" value="expense" checked={type === 'expense'} onChange={() => { setType('expense'); clearErrors() }} />{t('expenseType')}</label><label className={type === 'income' ? 'active' : ''}><input type="radio" name="entry-type" value="income" checked={type === 'income'} onChange={() => { setType('income'); clearErrors() }} />{t('incomeType')}</label></fieldset>}
    {globalError && <div className="alert alert-error" role="alert">{globalError}</div>}
    <form onSubmit={handleSubmit}>
      {type === 'expense' && <div className="form-group"><label htmlFor="entry-category">{t('category')}</label><select id="entry-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} required><option value="">{t('chooseCategory')}</option>{categories?.map(cat => <option key={cat.id} value={cat.id}>{categoryName(cat.name)}</option>)}</select>{categoriesError && <span className="error" role="alert">{categoriesError}</span>}{errors.category_id && <span className="error">{errors.category_id}</span>}</div>}
      <div className="form-group"><label htmlFor="entry-description">{t('description')}</label><input id="entry-description" type="text" value={description} onChange={event => setDescription(event.target.value)} placeholder={t(type === 'expense' ? 'descriptionExample' : 'incomeDescriptionExample')} required />{errors.description && <span className="error">{errors.description}</span>}</div>
      <div className="modal-fields"><div className="form-group"><label htmlFor="entry-amount">{t('amountBrl')}</label><input id="entry-amount" type="number" step="0.01" min="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" required />{errors.amount && <span className="error">{errors.amount}</span>}</div><div className="form-group"><label htmlFor="entry-date">{t(type === 'expense' ? 'expenseDate' : 'receivedDate')}</label><input id="entry-date" type="date" value={entryDate} onChange={event => handleDateChange(event.target.value)} required />{(errors.expense_date || errors.received_at) && <span className="error">{errors.expense_date || errors.received_at}</span>}</div></div>
      {!isEditing && <div className="repeat-options"><label className="check-row"><input type="checkbox" checked={repeatsMonthly} onChange={event => setRepeatsMonthly(event.target.checked)} />{t('repeatsMonthly')}</label>{repeatsMonthly && <div className="repeat-details"><p className="page-subtitle">{t('firstOccurrenceHelp')}</p><div className="form-group"><label htmlFor="repeat-day">{t('dayOfMonth')}</label><input id="repeat-day" type="number" min="1" max="31" value={repeatDay} onChange={event => setRepeatDay(event.target.value)} required />{errors.day_of_month && <span className="error">{errors.day_of_month}</span>}</div><label className="check-row"><input type="checkbox" checked={autoConfirm} onChange={event => setAutoConfirm(event.target.checked)} />{t('autoConfirm')}</label></div>}</div>}
      <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('saving') : t(isEditing ? 'saveChanges' : type === 'expense' ? 'add' : 'addIncome')}</button></div>
    </form>
  </div></div>
}
