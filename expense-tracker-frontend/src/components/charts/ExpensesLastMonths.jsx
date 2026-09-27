import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function ExpensesLastMonths({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="chart-empty">
        Nenhum dado disponível.
      </p>
    )
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
      <div className="chart-tooltip">
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ color: 'var(--accent)' }}>{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--text-3)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--text-3)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${v}`}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-3)' }} />
        <Bar dataKey="total" fill="var(--brand)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
