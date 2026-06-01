import { useState, useEffect } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { useFormErrors } from '../../hooks/useFormErrors'
import api from '../../api/axios'

export default function ExpenseModal({ expense, onClose, onSuccess }) {
  const isEditing = !!expense

  const [categoryId, setCategoryId]   = useState(expense?.category_id ?? '')
  const [amount, setAmount]           = useState(expense?.amount ?? '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [expenseDate, setExpenseDate] = useState(
    expense?.expense_date
      ? expense.expense_date.substring(0, 10)
      : new Date().toISOString().substring(0, 10)
  )
  const [loading, setLoading] = useState(false)

  const { data: categories }                     = useFetch('/categories')
  const { errors, globalError, handleApiError }  = useFormErrors()

  // Fecha ao pressionar Esc
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      category_id:  Number(categoryId),
      amount:       Number(amount),
      description,
      expense_date: expenseDate,
    }
    try {
      if (isEditing) {
        await api.put(`/expenses/${expense.id}`, payload)
      } else {
        await api.post('/expenses', payload)
      }
      onSuccess()
    } catch (error) {
      handleApiError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      {/* Card — stopPropagation evita fechar ao clicar dentro */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12,
          padding: '2rem', width: '100%', maxWidth: 460,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700 }}>
            {isEditing ? 'Editar despesa' : 'Nova despesa'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9ca3af' }}
          >
            ✕
          </button>
        </div>

        {globalError && <div className="alert alert-error">{globalError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Selecione...</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.category_id && <span className="error">{errors.category_id}</span>}
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço no restaurante"
            />
            {errors.description && <span className="error">{errors.description}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
              {errors.amount && <span className="error">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
              {errors.expense_date && <span className="error">{errors.expense_date}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}