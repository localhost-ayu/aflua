import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'

function PendingList({ entries, type }) {
  const { t, currency, date, categoryName } = useI18n()
  return <div>
    <h3>{t(type === 'income' ? 'pendingIncomeLabel' : 'pendingExpenseLabel')}</h3>
    {entries.length ? <ul className="pending-entry-list">{entries.map(entry => <li key={entry.id}>
      <div><strong>{entry.description}</strong><span className="text-muted">{date(entry.due_date)}{entry.category && <> · <span className="category-dot" style={{ background: entry.category.color }} /> {categoryName(entry.category.name)}</>}</span></div>
      <span className={`font-bold ${type === 'income' ? 'income-amount' : ''}`}>{type === 'income' ? '+' : '−'}{currency(entry.amount)}</span>
    </li>)}</ul> : <p className="page-subtitle">{t('noPendingOfType')}</p>}
  </div>
}

export default function PendingCashFlow({ data }) {
  const { t, currency } = useI18n()
  const count = data.pending_incomes.length + data.pending_expenses.length
  if (!count) return null

  return <section className="card cash-flow-pending mb-3" aria-labelledby="pending-cash-flow-title">
    <div className="pending-banner-heading"><div><h3 id="pending-cash-flow-title">{t('pendingForMonth')} <span className="pending-count">{t(count === 1 ? 'pendingCountOne' : 'pendingCountMany', { count })}</span></h3><p className="page-subtitle">{t('pendingProjectionHelp')}</p></div><Link className="btn btn-secondary btn-sm" to={`/expenses?month=${data.month}&year=${data.year}&panel=recurrences`}>{t('reviewPending')}</Link></div>
    <div className="pending-totals"><span>{t('pendingIncomeLabel')} <strong className="income-amount">+{currency(data.pending_income)}</strong></span><span>{t('pendingExpenseLabel')} <strong>−{currency(data.pending_expense)}</strong></span></div>
    <details className="pending-breakdown"><summary>{t('viewPendingDetails')}</summary><div className="grid-2"><PendingList entries={data.pending_incomes} type="income" /><PendingList entries={data.pending_expenses} type="expense" /></div></details>
  </section>
}
