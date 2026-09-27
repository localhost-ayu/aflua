import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useI18n } from '../../i18n/I18nContext'

function CategoryTooltip({ active, payload, currency, categoryName }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return <div className="chart-tooltip"><strong>{categoryName(item.name)}</strong><div>{currency(item.value)}</div></div>
}

export default function ExpensesByCategory({ data }) {
  const { t, currency, categoryName } = useI18n()
  if (!data?.length) return <p className="chart-empty">{t('noExpensesMonth')}</p>
  const localized = data.map(item => ({ ...item, category: categoryName(item.category) }))
  return <ResponsiveContainer width="100%" height={280}><PieChart>
    <Pie data={localized} dataKey="total" nameKey="category" cx="50%" cy="47%" outerRadius={88} innerRadius={55} paddingAngle={2} stroke="var(--surface)">{localized.map((item, index) => <Cell key={index} fill={item.color} />)}</Pie>
    <Tooltip content={<CategoryTooltip currency={currency} categoryName={name => name} />} />
    <Legend formatter={value => <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{value}</span>} />
  </PieChart></ResponsiveContainer>
}
