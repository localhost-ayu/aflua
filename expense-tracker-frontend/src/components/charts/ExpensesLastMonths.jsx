import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useI18n } from '../../i18n/I18nContext'

function HistoryTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{label}</strong><div>{currency(payload[0].value)}</div></div>
}

export default function ExpensesLastMonths({ data }) {
  const { t, currency, locale } = useI18n()
  if (!data?.length) return <p className="chart-empty">{t('noChartData')}</p>
  const localized = data.map(item => {
    const match = item.label?.match(/^([A-Za-zç]{3})\/(\d{2})$/)
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const index = match ? months.indexOf(match[1]) : -1
    return index >= 0 ? { ...item, label: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(2000 + Number(match[2]), index, 1)) } : item
  })
  return <ResponsiveContainer width="100%" height={280}><BarChart data={localized} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)} width={48} />
    <Tooltip content={<HistoryTooltip currency={currency} />} cursor={{ fill: 'var(--surface-3)' }} />
    <Bar dataKey="total" fill="var(--brand)" radius={[5, 5, 0, 0]} />
  </BarChart></ResponsiveContainer>
}
