import { useMemo, useState } from 'react'
import Navbar from '../components/ui/Navbar'
import ExpensesByCategory from '../components/charts/ExpensesByCategory'
import ExpensesLastMonths from '../components/charts/ExpensesLastMonths'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/I18nContext'

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { t, locale, monthName, currency } = useI18n()
  const dashboardUrl = useMemo(() => `/dashboard?month=${month}&year=${year}`, [month, year])
  const { data, loading, error } = useFetch(dashboardUrl)
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]
  const period = locale === 'en' ? `${monthName(month - 1)} ${year}` : `${monthName(month - 1)} de ${year}`

  return <><Navbar /><main className="container">
    <div className="page-header"><div><p className="page-kicker">{t('overviewKicker')}</p><h2>{t('dashboard')}</h2></div>
      <div className="period-filters"><div className="form-group"><label htmlFor="dashboard-month">{t('month')}</label><select id="dashboard-month" value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{monthName(index)}</option>)}</select></div><div className="form-group"><label htmlFor="dashboard-year">{t('year')}</label><select id="dashboard-year" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></div></div>
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {data && <div className="dashboard-content" aria-busy={loading}>
      <div className="stat-card mb-3"><p className="card-title">{t('totalSpent', { period })}</p><p className="stat-value">{currency(data.total_this_month)}</p></div>
      <div className="grid-2"><div className="card"><p className="card-title">{t('byCategory')}</p><ExpensesByCategory data={data.by_category} /></div><div className="card"><p className="card-title">{t('lastSixMonths')}</p><ExpensesLastMonths data={data.last_six_months} /></div></div>
    </div>}
    {loading && !data && <div className="dashboard-skeleton" aria-label={t('loading')}><div className="skeleton skeleton-stat" /><div className="grid-2"><div className="skeleton skeleton-chart" /><div className="skeleton skeleton-chart" /></div></div>}
  </main></>
}
