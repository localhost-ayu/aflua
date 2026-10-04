import { useState } from 'react'
import Navbar from '../components/ui/Navbar'
import ExpensesByCategory from '../components/charts/ExpensesByCategory'
import ExpensesLastMonths from '../components/charts/ExpensesLastMonths'
import PendingCashFlow from '../components/ui/PendingCashFlow'
import { useDashboard } from '../hooks/useDashboard'
import { useI18n } from '../i18n/I18nContext'

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { t, locale, monthName, currency } = useI18n()
  const { data, loading, error, refetch } = useDashboard(month, year)
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]
  const period = locale === 'en' ? `${monthName(month - 1)} ${year}` : `${monthName(month - 1)} de ${year}`

  return <><Navbar /><main className="container">
    <div className="page-header"><div><p className="page-kicker">{t('overviewKicker')}</p><h2>{t('dashboard')}</h2><p className="page-subtitle">{period}</p></div>
      <div className="period-filters"><div className="form-group"><label htmlFor="dashboard-month">{t('month')}</label><select id="dashboard-month" value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{monthName(index)}</option>)}</select></div><div className="form-group"><label htmlFor="dashboard-year">{t('year')}</label><select id="dashboard-year" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div></div>
    </div>
    {error && <div className="alert alert-error dashboard-error" role="alert"><span>{error}</span><button className="btn btn-secondary btn-sm" onClick={refetch} disabled={loading}>{t('retry')}</button></div>}
    {data && <div className="dashboard-content" aria-busy={loading}>
      <div className="balance-grid cash-flow-grid mb-3">
        <div className="stat-card"><p className="card-title">{t('receivedLabel')}</p><p className="stat-value">{currency(data.total_income)}</p><p className="stat-help">{t('receivedHelp')}</p></div>
        <div className="stat-card balance-card spent-card"><p className="card-title">{t('spentLabel')}</p><p className="stat-value">{currency(data.total_this_month)}</p><p className="stat-help">{t('spentHelp')}</p></div>
        <div className={`stat-card balance-card ${data.realized_balance < 0 ? 'is-negative' : ''}`}><p className="card-title">{t('realizedBalance')}</p><p className="stat-value">{currency(data.realized_balance)}</p><p className="stat-help">{t('realizedHelp')}</p></div>
        <div className={`stat-card balance-card projection-card ${data.projected_balance < 0 ? 'is-negative' : ''}`}><p className="card-title">{t('projectedBalance')} <span className="projection-tag">{t('estimate')}</span></p><p className="stat-value">{currency(data.projected_balance)}</p><p className="stat-help">{t(data.projected_balance < 0 ? 'projectedDeficit' : data.projected_balance > 0 ? 'projectedSurplus' : 'projectedBalanced')}</p></div>
      </div>
      <PendingCashFlow data={data} />
      {!data.pending_incomes.length && !data.pending_expenses.length && <p className="projection-empty-note">{t('noPendingProjection')}</p>}
      <div className="grid-2"><section className="card" aria-labelledby="category-chart-title"><h3 className="card-title" id="category-chart-title">{t('byCategory')}</h3><ExpensesByCategory data={data.by_category} /></section><section className="card" aria-labelledby="history-chart-title"><h3 className="card-title" id="history-chart-title">{t('cashFlowHistory')}</h3><p className="chart-period-note">{t('sixMonthsThrough', { period })}</p><ExpensesLastMonths data={data.last_six_months} /></section></div>
    </div>}
    {loading && !data && <div className="dashboard-skeleton" role="status" aria-label={t('loading')}><div className="balance-grid cash-flow-grid mb-3">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton skeleton-stat" />)}</div><div className="skeleton skeleton-pending mb-3" /><div className="grid-2"><div className="skeleton skeleton-chart" /><div className="skeleton skeleton-chart" /></div></div>}
  </main></>
}
