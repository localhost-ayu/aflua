import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function ExpensesByCategory({ data }) {
  if (!data || data.length === 0) {
    return (
      <p className="chart-empty">
        Nenhuma despesa este mês.
      </p>
    )
  }

  // Formata o valor no tooltip: R$ 1.234,56
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Tooltip personalizado
  function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
      <div className="chart-tooltip">
        <p style={{ fontWeight: 600 }}>{item.name}</p>
        <p style={{ color: item.payload.color }}>{formatCurrency(item.value)}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
