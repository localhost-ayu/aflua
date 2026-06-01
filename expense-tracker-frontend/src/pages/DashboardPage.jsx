import { useState, useMemo } from 'react'
import Navbar from '../components/ui/Navbar'
import ExpensesByCategory from '../components/charts/ExpensesByCategory'
import ExpensesLastMonths from '../components/charts/ExpensesLastMonths'
import { useFetch } from '../hooks/useFetch'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0)
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())

  const dashboardUrl = useMemo(
    () => `/dashboard?month=${month}&year=${year}`,
    [month, year]
  )

  const { data, loading, error } = useFetch(dashboardUrl)

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  const monthLabel = `${MONTHS[month - 1]} de ${year}`

  return (
    <>
      <Navbar />
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <h2>Dashboard</h2>

          {/* Filtro de mês/ano */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && <p className="text-muted">Carregando...</p>}
        {error   && <div className="alert alert-error">⚠️ {error}</div>}

        {data && (
          <>
            {/* Stat card */}
            <div className="stat-card mb-3" style={{ maxWidth: 320 }}>
              <p className="card-title">Total gasto em {monthLabel}</p>
              <p className="stat-value">{formatCurrency(data.total_this_month)}</p>
            </div>

            {/* Gráficos */}
            <div className="grid-2">
              <div className="card">
                <p className="card-title">Gastos por categoria</p>
                <ExpensesByCategory data={data.by_category} />
              </div>
              <div className="card">
                <p className="card-title">Últimos 6 meses</p>
                <ExpensesLastMonths data={data.last_six_months} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}