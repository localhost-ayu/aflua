import { useEffect, useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { useFormErrors } from '../../hooks/useFormErrors'
import { useI18n } from '../../i18n/I18nContext'
import api from '../../api/axios'

export default function ExpenseModal({ expense, onClose, onSuccess }) {
  const isEditing = !!expense
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? '')
  const [amount, setAmount] = useState(expense?.amount ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date?.substring(0, 10) ?? new Date().toISOString().substring(0, 10))
  const [loading, setLoading] = useState(false)
  const { data: categories } = useFetch('/categories')
  const { errors, globalError, handleApiError } = useFormErrors()
  const { t, categoryName } = useI18n()

  useEffect(() => {
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    const payload = { category_id: Number(categoryId), amount: Number(amount), description, expense_date: expenseDate }
    try {
      if (isEditing) await api.put(`/expenses/${expense.id}`, payload)
      else await api.post('/expenses', payload)
      onSuccess(isEditing ? 'updated' : 'created')
    } catch (error) { handleApiError(error) }
    finally { setLoading(false) }
  }

  return <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
    <div className="modal-header"><h3 id="expense-modal-title">{t(isEditing ? 'editExpense' : 'newExpense')}</h3><button type="button" className="icon-button" onClick={onClose} aria-label={t('cancel')}>×</button></div>
    {globalError && <div className="alert alert-error" role="alert">{globalError}</div>}
    <form onSubmit={handleSubmit}>
      <div className="form-group"><label htmlFor="expense-category">{t('category')}</label><select id="expense-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} required><option value="">{t('chooseCategory')}</option>{categories?.map(cat => <option key={cat.id} value={cat.id}>{categoryName(cat.name)}</option>)}</select>{errors.category_id && <span className="error">{errors.category_id}</span>}</div>
      <div className="form-group"><label htmlFor="expense-description">{t('description')}</label><input id="expense-description" type="text" value={description} onChange={event => setDescription(event.target.value)} placeholder={t('descriptionExample')} required />{errors.description && <span className="error">{errors.description}</span>}</div>
      <div className="modal-fields"><div className="form-group"><label htmlFor="expense-amount">{t('amountBrl')}</label><input id="expense-amount" type="number" step="0.01" min="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" required />{errors.amount && <span className="error">{errors.amount}</span>}</div><div className="form-group"><label htmlFor="expense-date">{t('date')}</label><input id="expense-date" type="date" value={expenseDate} onChange={event => setExpenseDate(event.target.value)} required />{errors.expense_date && <span className="error">{errors.expense_date}</span>}</div></div>
      <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('saving') : t(isEditing ? 'saveChanges' : 'add')}</button></div>
    </form>
  </div></div>
}
