import { useState, useMemo } from 'react'
import Navbar from '../../components/ui/Navbar'
import { useFetch } from '../../hooks/useFetch'
import ExpenseModal from './ExpenseModal'
import api from '../../api/axios'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.substring(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export default function ExpensesPage() {
  const [categoryId, setCategoryId] = useState('')
  const [month, setMonth]           = useState('')
  const [year, setYear]             = useState('')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const { data: categories } = useFetch('/categories')

  const expensesUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId)
    if (month)      params.append('month', month)
    if (year)       params.append('year', year)
    const qs = params.toString()
    return qs ? `/expenses?${qs}` : '/expenses'
  }, [categoryId, month, year])

  const { data: expenses, loading, error, refetch } = useFetch(expensesUrl)

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta despesa?')) return
    await api.delete(`/expenses/${id}`)
    refetch()
  }

  function handleEdit(expense) {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  function handleNew() {
    setEditingExpense(null)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingExpense(null)
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  const MONTHS = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  const hasFilters = categoryId || month || year

  return (
    <>
      <Navbar />
      <div className="container">

        <div className="page-header">
          <h2>Despesas</h2>
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={handleNew}
          >
            + Nova despesa
          </button>
        </div>

        {/* Filtros */}
        <div className="card mb-3">
          <div className="filter-bar">
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label>Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Todas</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
              <label>Mês</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Todos</option>
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: 100 }}>
              <label>Ano</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Todos</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => { setCategoryId(''); setMonth(''); setYear('') }}
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>
        </div>

        {loading && <p className="text-muted">Carregando...</p>}
        {error   && <div className="alert alert-error">⚠️ {error}</div>}

        {expenses && (
          expenses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <p>Nenhuma despesa encontrada.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th className="text-right">Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
                        {formatDate(expense.expense_date)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{expense.description}</td>
                      <td>
                        <span className="category-badge">
                          <span
                            className="category-dot"
                            style={{ background: expense.category?.color }}
                          />
                          {expense.category?.name}
                        </span>
                      </td>
                      <td className="text-right font-bold">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEdit(expense)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          onClose={handleModalClose}
          onSuccess={() => { handleModalClose(); refetch() }}
        />
      )}
    </>
  )
}