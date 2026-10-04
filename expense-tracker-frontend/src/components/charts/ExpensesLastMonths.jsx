import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useI18n } from '../../i18n/I18nContext'

function HistoryTooltip({ active, payload, currency, t }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return <div className="chart-tooltip"><strong>{item.period}</strong>{payload.map(series => <div key={series.dataKey}>{series.name}: {currency(series.value)}</div>)}<div className="tooltip-balance">{t('realizedBalance')}: {currency(item.realized_balance)}</div></div>
}

export default function ExpensesLastMonths({ data }) {
  const { t, currency, locale } = useI18n()
  if (!data?.length) return <p className="chart-empty">{t('noChartData')}</p>
  const localized = data.map(item => {
    const date = new Date(0)
    date.setFullYear(item.year, item.month - 1, 1)
    return { ...item, label: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(date), period: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date) }
  })
  return <><ResponsiveContainer width="100%" height={280}><BarChart data={localized} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)} width={48} />
    <Tooltip content={<HistoryTooltip currency={currency} t={t} />} cursor={{ fill: 'var(--surface-3)' }} />
    <Legend formatter={value => <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{value}</span>} />
    <Bar dataKey="total_income" name={t('incomeType')} fill="var(--brand)" radius={[4, 4, 0, 0]} />
    <Bar dataKey="total_expenses" name={t('expenseType')} fill="var(--accent)" radius={[4, 4, 0, 0]} />
  </BarChart></ResponsiveContainer><table className="sr-only"><caption>{t('cashFlowHistory')}</caption><thead><tr><th scope="col">{t('month')}</th><th scope="col">{t('receivedLabel')}</th><th scope="col">{t('spentLabel')}</th><th scope="col">{t('realizedBalance')}</th></tr></thead><tbody>{localized.map(item => <tr key={`${item.year}-${item.month}`}><th scope="row">{item.period}</th><td>{currency(item.total_income)}</td><td>{currency(item.total_expenses)}</td><td>{currency(item.realized_balance)}</td></tr>)}</tbody></table></>
}
