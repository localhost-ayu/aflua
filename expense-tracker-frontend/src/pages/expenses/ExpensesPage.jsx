import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../../components/ui/Navbar'
import { useFetch } from '../../hooks/useFetch'
import { useI18n } from '../../i18n/I18nContext'
import ExpenseModal from './ExpenseModal'
import CategoryManager from './CategoryManager'
import RecurringPanel from './RecurringPanel'
import ChoiceDialog from '../../components/ui/ChoiceDialog'
import api from '../../api/axios'

export default function ExpensesPage() {
  const [searchParams] = useSearchParams()
  const linkedMonth = Number(searchParams.get('month'))
  const linkedYear = Number(searchParams.get('year'))
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryId, setCategoryId] = useState('')
  const [month, setMonth] = useState(Number.isInteger(linkedMonth) && linkedMonth >= 1 && linkedMonth <= 12 ? String(linkedMonth) : '')
  const [year, setYear] = useState(Number.isInteger(linkedYear) && linkedYear >= 1 && linkedYear <= 9999 ? String(linkedYear) : '')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [modalType, setModalType] = useState('expense')
  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState(null)
  const [recurringRefresh, setRecurringRefresh] = useState(0)
  const [deletingEntry, setDeletingEntry] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [activeTool, setActiveTool] = useState(searchParams.get('panel') === 'recurrences' ? 'recurrences' : null)
  const { t, monthName, categoryName, currency, date } = useI18n()
  const { data: categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useFetch('/categories')
  const expensesUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId)
    if (month) params.append('month', month)
    if (year) params.append('year', year)
    return params.size ? `/expenses?${params}` : '/expenses'
  }, [categoryId, month, year])
  const incomesUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (month) params.append('month', month)
    if (year) params.append('year', year)
    return params.size ? `/incomes?${params}` : '/incomes'
  }, [month, year])
  const { data: expenses, loading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useFetch(expensesUrl)
  const { data: incomes, loading: incomesLoading, error: incomesError, refetch: refetchIncomes } = useFetch(incomesUrl)
  const entries = useMemo(() => [
    ...(typeFilter === 'income' ? [] : (expenses ?? []).map(entry => ({ ...entry, entryType: 'expense', entryDate: entry.expense_date }))),
    ...(typeFilter === 'expense' || categoryId ? [] : (incomes ?? []).map(entry => ({ ...entry, entryType: 'income', entryDate: entry.received_at }))),
  ].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.id - a.id), [expenses, incomes, typeFilter, categoryId])
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const years = [...new Set([currentYear + 1, currentYear, currentYear - 1, currentYear - 2, ...(year ? [Number(year)] : [])])].sort((a, b) => b - a)
  const hasFilters = typeFilter !== 'all' || categoryId || month || year
  const loading = expensesLoading || incomesLoading

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  function handleDelete(entry) {
    if (entry.recurring_occurrence) { setDeletingEntry(entry); return }
    if (window.confirm(t(entry.entryType === 'expense' ? 'deleteConfirm' : 'deleteIncomeConfirm'))) performDelete(entry)
  }
  async function performDelete(entry, occurrenceAction) {
    setDeleteBusy(true)
    try {
      await api.delete(`/${entry.entryType === 'expense' ? 'expenses' : 'incomes'}/${entry.id}`, occurrenceAction ? { data: { occurrence_action: occurrenceAction } } : undefined)
      setToast({ message: t(occurrenceAction === 'pending' ? 'entryLeftPending' : occurrenceAction === 'skipped' ? 'entryMonthSkipped' : entry.entryType === 'expense' ? 'deleted' : 'incomeDeleted') })
      if (entry.entryType === 'expense') refetchExpenses()
      else refetchIncomes()
      setRecurringRefresh(value => value + 1)
    } catch (error) { setToast({ message: t(error.response?.status === 409 ? 'recurringEntryInUse' : entry.entryType === 'expense' ? 'deleteError' : 'incomeDeleteError'), error: true }) }
    finally { setDeleteBusy(false); setDeletingEntry(null) }
  }
  function handleCategoryChanged(deletedId) {
    if (String(deletedId) === categoryId) setCategoryId('')
    refetchCategories()
    refetchExpenses()
  }
  function handleCategoryFeedback(key, error = false) { setToast({ message: t(key), error }) }
  const handleModalClose = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => { setModalOpen(false); setClosing(false); setEditingEntry(null) }, 180)
  }, [])
  function openModal(entry = null, entryType = 'expense') {
    setEditingEntry(entry)
    setModalType(entry?.entryType ?? entryType)
    setClosing(false)
    setModalOpen(true)
  }

  return <><Navbar /><main className="container">
    <div className="page-header"><div><p className="page-kicker">{t('recordsKicker')}</p><h2>{t('records')}</h2></div><button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openModal(null, typeFilter === 'income' ? 'income' : 'expense')}>+ {t('newEntry')}</button></div>
    <div className="card mb-3"><div className="filter-bar">
      <div className="form-group"><label htmlFor="filter-type">{t('entryType')}</label><select id="filter-type" value={typeFilter} onChange={event => { setTypeFilter(event.target.value); setCategoryId('') }}><option value="all">{t('allEntries')}</option><option value="expense">{t('expenseType')}</option><option value="income">{t('incomeType')}</option></select></div>
      {typeFilter !== 'income' && <div className="form-group"><label htmlFor="filter-category">{t('category')}</label><select id="filter-category" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">{t('allCategories')}</option>{categories?.map(cat => <option key={cat.id} value={cat.id}>{categoryName(cat.name)}</option>)}</select></div>}
      <div className="form-group"><label htmlFor="filter-month">{t('month')}</label><select id="filter-month" value={month} onChange={event => setMonth(event.target.value)}><option value="">{t('allMonths')}</option>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{monthName(index)}</option>)}</select></div>
      <div className="form-group"><label htmlFor="filter-year">{t('year')}</label><select id="filter-year" value={year} onChange={event => setYear(event.target.value)}><option value="">{t('allYears')}</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { setTypeFilter('all'); setCategoryId(''); setMonth(''); setYear('') }}>{t('clearFilters')}</button>}
    </div></div>
    <div className="entry-tools mb-3">
      <CategoryManager expanded={activeTool === 'categories'} onToggle={() => setActiveTool(value => value === 'categories' ? null : 'categories')} categories={categories ?? []} loading={categoriesLoading} error={categoriesError} onChanged={handleCategoryChanged} onFeedback={handleCategoryFeedback} />
      <RecurringPanel expanded={activeTool === 'recurrences'} onToggle={() => setActiveTool(value => value === 'recurrences' ? null : 'recurrences')} month={Number(month) || currentMonth} year={Number(year) || currentYear} refreshToken={recurringRefresh} onChanged={() => { refetchExpenses(); refetchIncomes() }} onFeedback={handleCategoryFeedback} />
    </div>
    {(expensesError || incomesError) && <div className="alert alert-error" role="alert">{expensesError || incomesError}</div>}
    {loading && (!expenses || !incomes) && <div className="table-wrap skeleton-table" aria-label={t('loading')}>{Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton skeleton-row" />)}</div>}
    {expenses && incomes && <div className="expenses-content" aria-busy={loading}>{entries.length === 0 ? <div className="empty-state"><span className="empty-state-icon" aria-hidden="true">○</span><p>{t('noEntries')}</p></div> : <div className="table-wrap"><table><thead><tr><th>{t('date')}</th><th>{t('description')}</th><th>{t('entryType')}</th><th>{t('category')}</th><th className="text-right">{t('amount')}</th><th className="text-right">{t('actions')}</th></tr></thead><tbody>{entries.map(entry => <tr key={`${entry.entryType}-${entry.id}`}>
      <td className="text-muted">{date(entry.entryDate)}</td><td className="font-bold">{entry.description}{entry.recurring_occurrence && <span className="entry-recurring-tag">{t('recurringBadge')}</span>}</td><td><span className={`entry-kind ${entry.entryType}`}>{t(entry.entryType === 'expense' ? 'expenseType' : 'incomeType')}</span></td><td>{entry.entryType === 'expense' ? <span className="category-badge"><span className="category-dot" style={{ background: entry.category?.color }} />{categoryName(entry.category?.name || '')}</span> : <span className="text-muted">—</span>}</td><td className={`text-right font-bold ${entry.entryType === 'income' ? 'income-amount' : ''}`}>{entry.entryType === 'income' ? '+' : '−'}{currency(entry.amount)}</td><td><div className="row-actions"><button className="btn btn-secondary btn-sm" onClick={() => openModal(entry)}>{t('edit')}</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(entry)}>{t('delete')}</button></div></td>
    </tr>)}</tbody></table></div>}</div>}
  </main>{modalOpen && <ExpenseModal entry={editingEntry} entryType={modalType} closing={closing} onClose={handleModalClose} onSuccess={(type, result) => { handleModalClose(); setToast({ message: t(result.startsWith('recurring') ? result : type === 'expense' ? result : result === 'created' ? 'incomeCreated' : 'incomeUpdated') }); if (type === 'expense') refetchExpenses(); else refetchIncomes(); setRecurringRefresh(value => value + 1) }} />}{deletingEntry && <ChoiceDialog title={t('removeRecurringEntryTitle')} description={t('removeRecurringEntryHelp')} busy={deleteBusy} onClose={() => { if (!deleteBusy) setDeletingEntry(null) }} choices={[{ label: t('leaveMonthPending'), onClick: () => performDelete(deletingEntry, 'pending') }, { label: t('skipThisMonth'), variant: 'btn-danger', onClick: () => performDelete(deletingEntry, 'skipped') }]} />}{toast && <div className={`toast ${toast.error ? 'error' : ''}`} role="status">{toast.message}<button type="button" onClick={() => setToast(null)} aria-label={t('cancel')}>×</button></div>}</>
}
