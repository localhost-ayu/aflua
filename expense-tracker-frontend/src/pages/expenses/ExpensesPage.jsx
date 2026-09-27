import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/ui/Navbar'
import { useFetch } from '../../hooks/useFetch'
import { useI18n } from '../../i18n/I18nContext'
import ExpenseModal from './ExpenseModal'
import api from '../../api/axios'

export default function ExpensesPage() {
  const [categoryId, setCategoryId] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState(null)
  const { t, monthName, categoryName, currency, date } = useI18n()
  const { data: categories } = useFetch('/categories')
  const expensesUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId)
    if (month) params.append('month', month)
    if (year) params.append('year', year)
    return params.size ? `/expenses?${params}` : '/expenses'
  }, [categoryId, month, year])
  const { data: expenses, loading, error, refetch } = useFetch(expensesUrl)
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]
  const hasFilters = categoryId || month || year

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function handleDelete(id) {
    if (!window.confirm(t('deleteConfirm'))) return
    try { await api.delete(`/expenses/${id}`); setToast({ message: t('deleted') }); refetch() }
    catch { setToast({ message: t('deleteError'), error: true }) }
  }
  const handleModalClose = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => { setModalOpen(false); setClosing(false); setEditingExpense(null) }, 180)
  }, [])
  function openModal(expense = null) { setEditingExpense(expense); setClosing(false); setModalOpen(true) }

  return <><Navbar /><main className="container">
    <div className="page-header"><div><p className="page-kicker">{t('recordsKicker')}</p><h2>{t('expenses')}</h2></div><button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openModal()}>+ {t('newExpense')}</button></div>
    <div className="card mb-3"><div className="filter-bar">
      <div className="form-group"><label htmlFor="filter-category">{t('category')}</label><select id="filter-category" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">{t('allCategories')}</option>{categories?.map(cat => <option key={cat.id} value={cat.id}>{categoryName(cat.name)}</option>)}</select></div>
      <div className="form-group"><label htmlFor="filter-month">{t('month')}</label><select id="filter-month" value={month} onChange={event => setMonth(event.target.value)}><option value="">{t('allMonths')}</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{monthName(index)}</option>)}</select></div>
      <div className="form-group"><label htmlFor="filter-year">{t('year')}</label><select id="filter-year" value={year} onChange={event => setYear(event.target.value)}><option value="">{t('allYears')}</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setCategoryId(''); setMonth(''); setYear('') }}>{t('clearFilters')}</button>}
    </div></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && !expenses && <div className="table-wrap skeleton-table" aria-label={t('loading')}>{Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton skeleton-row" />)}</div>}
    {expenses && <div className="expenses-content" aria-busy={loading}>{expenses.length === 0 ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">○</span><p>{t('noExpenses')}</p></div> : <div className="table-wrap"><table><thead><tr><th>{t('date')}</th><th>{t('description')}</th><th>{t('category')}</th><th className="text-right">{t('amount')}</th><th className="text-right">{t('actions')}</th></tr></thead><tbody>{expenses.map(expense => <tr key={expense.id}>
      <td className="text-muted">{date(expense.expense_date)}</td><td className="font-bold">{expense.description}</td><td><span className="category-badge"><span className="category-dot" style={{ background: expense.category?.color }} />{categoryName(expense.category?.name || '')}</span></td><td className="text-right font-bold">{currency(expense.amount)}</td><td><div className="row-actions"><button className="btn btn-secondary btn-sm" onClick={() => openModal(expense)}>{t('edit')}</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(expense.id)}>{t('delete')}</button></div></td>
    </tr>)}</tbody></table></div>}</div>}
  </main>{modalOpen && <ExpenseModal expense={editingExpense} closing={closing} onClose={handleModalClose} onSuccess={result => { handleModalClose(); setToast({ message: t(result) }); refetch() }} />}{toast && <div className={`toast ${toast.error ? 'error' : ''}`} role="status">{toast.message}<button type="button" onClick={() => setToast(null)} aria-label={t('cancel')}>×</button></div>}</>
}
