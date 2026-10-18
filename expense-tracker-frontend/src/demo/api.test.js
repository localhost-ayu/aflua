import { describe, expect, it } from 'vitest'
import { createDemoApi, HttpError, toCents } from './api'
import { emptyDb, seedDb } from './seed'
import { exportDb, importDb, isValidDb } from './store'

// relógio controlável: cada teste "vive" em datas fixas
function setup(start = '2026-08-03T10:00:00') {
  const db = emptyDb(new Date(start))
  let clock = new Date(start)
  const api = createDemoApi(db, { now: () => clock })
  const call = (method, path, body = {}, query = {}) => api.handle({ method, path, body, query, authenticated: true })
  const at = (iso) => { clock = new Date(iso) }
  const food = call('POST', '/categories', { name: 'Alimentação' }).data
  return { db, api, call, at, food }
}

const status = (fn) => {
  try {
    fn()
  } catch (error) {
    if (error instanceof HttpError) return error.status
    throw error
  }
  return 200
}

describe('dinheiro', () => {
  it('converte para centavos como o amountInCents() do Laravel', () => {
    expect(toCents('1450.00')).toBe(145000)
    expect(toCents('99.9')).toBe(9990)
    expect(toCents(0.1 + 0.2)).toBe(30)
  })
})

describe('recorrências', () => {
  it('a criação confirma o primeiro mês; os seguintes só existem a partir do mês seguinte', () => {
    const { call, db } = setup()
    const rule = call('POST', '/recurring-rules', { type: 'income', description: 'Salário', amount: '5200', day_of_month: 5, starts_on: '2026-08-05' }).data
    expect(rule.amount).toBe('5200.00')
    expect(db.incomes).toHaveLength(1)
    expect(db.recurring_occurrences[0]).toMatchObject({ status: 'confirmed', year: 2026, month: 8 })

    expect(call('POST', '/recurring-occurrences/prepare', { month: 8, year: 2026 }).data).toHaveLength(1)
    const september = call('POST', '/recurring-occurrences/prepare', { month: 9, year: 2026 }).data
    expect(september).toHaveLength(1)
    expect(september[0]).toMatchObject({ status: 'pending', expense: null, income: null })
    expect(september[0].rule.description).toBe('Salário')
  })

  it('o dia 31 cai no último dia de meses mais curtos', () => {
    const { call, db, api } = setup('2026-01-31T10:00:00')
    call('POST', '/recurring-rules', { type: 'expense', description: 'Aluguel', amount: '1000', day_of_month: 31, starts_on: '2026-01-31', category_id: 1 })
    const [occurrence] = call('POST', '/recurring-occurrences/prepare', { month: 2, year: 2026 }).data
    call('POST', `/recurring-occurrences/${occurrence.id}/confirm`)
    expect(db.expenses.at(-1).expense_date).toBe('2026-02-28')
    expect(api.effectiveDate(db.recurring_rules[0], 2028, 2)).toBe('2028-02-29')
  })

  it('o agendador confirma só o que venceu e respeita o "não confirmar de novo"', () => {
    const { call, api, at, db } = setup()
    call('POST', '/recurring-rules', { type: 'expense', description: 'Internet', amount: '99.90', day_of_month: 15, starts_on: '2026-08-15', category_id: 1 })
    at('2026-09-10T00:10:00')
    expect(api.processDue('2026-09-10')).toBe(0)
    at('2026-09-15T00:10:00')
    expect(api.processDue('2026-09-15')).toBe(1)
    const occurrence = db.recurring_occurrences.find((o) => o.month === 9)
    expect(occurrence.auto_confirmed_at).toBeTruthy()

    call('POST', `/recurring-occurrences/${occurrence.id}/undo`)
    expect(occurrence).toMatchObject({ status: 'pending', linked_expense_id: null, auto_confirm_suppressed: true })
    expect(api.processDue('2026-09-16')).toBe(0)
  })

  it('pular e reabrir; ações fora de ordem respondem 409', () => {
    const { call } = setup()
    call('POST', '/recurring-rules', { type: 'income', description: 'Salário', amount: '5200', day_of_month: 5, starts_on: '2026-08-05' })
    const [occurrence] = call('POST', '/recurring-occurrences/prepare', { month: 9, year: 2026 }).data
    expect(status(() => call('POST', `/recurring-occurrences/${occurrence.id}/reopen`))).toBe(409)
    expect(call('POST', `/recurring-occurrences/${occurrence.id}/skip`).data.status).toBe('skipped')
    expect(status(() => call('POST', `/recurring-occurrences/${occurrence.id}/confirm`))).toBe(409)
    expect(call('POST', `/recurring-occurrences/${occurrence.id}/reopen`).data).toMatchObject({ status: 'pending', auto_confirm_suppressed: true })
  })

  it('ajustar o valor muda só o lançamento confirmado', () => {
    const { call, db } = setup()
    call('POST', '/recurring-rules', { type: 'expense', description: 'Luz', amount: '180', day_of_month: 18, starts_on: '2026-08-18', category_id: 1 })
    const [occurrence] = call('POST', '/recurring-occurrences/prepare', { month: 9, year: 2026 }).data
    call('POST', `/recurring-occurrences/${occurrence.id}/confirm`, { amount: '201.37' })
    call('PATCH', `/recurring-occurrences/${occurrence.id}/amount`, { amount: '199.99' })
    expect(db.expenses.at(-1).amount).toBe('199.99')
    expect(db.recurring_rules[0].amount).toBe('180.00')
  })

  it('excluir a regra mantém ou apaga os lançamentos vinculados', () => {
    for (const [mode, remaining] of [['keep_entries', 1], ['delete_entries', 0]]) {
      const { call, db } = setup()
      call('POST', '/recurring-rules', { type: 'expense', description: 'Academia', amount: '109.90', day_of_month: 7, starts_on: '2026-08-07', category_id: 1 })
      expect(call('GET', '/recurring-rules').data[0].linked_entries_count).toBe(1)
      call('DELETE', `/recurring-rules/${db.recurring_rules[0].id}`, { mode })
      expect(db.recurring_rules).toHaveLength(0)
      expect(db.recurring_occurrences).toHaveLength(0)
      expect(db.expenses).toHaveLength(remaining)
    }
  })
})

describe('lançamentos', () => {
  it('excluir um lançamento recorrente pode deixar o mês pendente', () => {
    const { call, db } = setup()
    call('POST', '/recurring-rules', { type: 'expense', description: 'Aluguel', amount: '1450', day_of_month: 10, starts_on: '2026-08-10', category_id: 1 })
    call('DELETE', `/expenses/${db.expenses[0].id}`, { occurrence_action: 'pending' })
    expect(db.expenses).toHaveLength(0)
    expect(db.recurring_occurrences[0]).toMatchObject({ status: 'pending', linked_expense_id: null, auto_confirm_suppressed: true })
  })

  it('um lançamento recorrente não muda de mês; desligar a recorrência desativa a regra', () => {
    const { call, db } = setup()
    call('POST', '/recurring-rules', { type: 'expense', description: 'Aluguel', amount: '1450', day_of_month: 10, starts_on: '2026-08-10', category_id: 1 })
    const id = db.expenses[0].id
    expect(status(() => call('PUT', `/expenses/${id}`, { expense_date: '2026-09-10' }))).toBe(422)
    const updated = call('PUT', `/expenses/${id}`, { expense_date: '2026-09-10', recurrence: { enabled: false } }).data
    expect(updated.expense_date).toBe('2026-09-10T00:00:00.000000Z')
    expect(updated.recurring_occurrence).toBeNull()
    expect(db.recurring_rules[0].active).toBe(false)
  })

  it('transformar um lançamento avulso em recorrente não o duplica', () => {
    const { call, db, food } = setup()
    const expense = call('POST', '/expenses', { category_id: food.id, description: 'Feira', amount: '80', expense_date: '2026-08-03' }).data
    const updated = call('PUT', `/expenses/${expense.id}`, { recurrence: { enabled: true, day_of_month: 3 } }).data
    expect(db.expenses).toHaveLength(1)
    expect(updated.recurring_occurrence.rule).toMatchObject({ description: 'Feira', day_of_month: 3, active: true })
  })

  it('valida como o Laravel: 422 com os campos, 401 sem login, 409 em categoria usada', () => {
    const { api, call, food } = setup()
    expect(status(() => call('POST', '/expenses', { category_id: food.id, description: 'X', amount: '0', expense_date: '2026-08-03' }))).toBe(422)
    expect(status(() => call('POST', '/expenses', { category_id: 999, description: 'X', amount: '10', expense_date: '2026-08-03' }))).toBe(422)
    expect(status(() => api.handle({ method: 'GET', path: '/dashboard' }))).toBe(401)
    call('POST', '/expenses', { category_id: food.id, description: 'Mercado', amount: '10', expense_date: '2026-08-03' })
    expect(status(() => call('DELETE', `/categories/${food.id}`))).toBe(409)
  })
})

describe('dashboard', () => {
  it('soma em centavos e projeta o mês com as pendências', () => {
    const { call, food } = setup()
    call('POST', '/recurring-rules', { type: 'income', description: 'Salário', amount: '5200', day_of_month: 5, starts_on: '2026-08-05' })
    call('POST', '/recurring-rules', { type: 'expense', description: 'Aluguel', amount: '1450', day_of_month: 10, starts_on: '2026-08-10', category_id: food.id })
    call('POST', '/expenses', { category_id: food.id, description: 'Mercado', amount: '0.10', expense_date: '2026-09-02' })
    call('POST', '/expenses', { category_id: food.id, description: 'Mercado', amount: '0.20', expense_date: '2026-09-03' })
    call('POST', '/recurring-occurrences/prepare', { month: 9, year: 2026 })

    const data = call('GET', '/dashboard', {}, { month: '9', year: '2026' }).data
    expect(data.total_this_month).toBe(0.3)
    expect(data.realized_balance).toBe(-0.3)
    expect(data.pending_income).toBe(5200)
    expect(data.pending_expense).toBe(1450)
    expect(data.projected_balance).toBe(3749.7)
    expect(data.pending_incomes.map((p) => p.due_date)).toEqual(['2026-09-05'])
    expect(data.by_category).toEqual([{ category: 'Alimentação', color: food.color, total: 0.3 }])
    expect(data.last_six_months.map((m) => m.month)).toEqual([4, 5, 6, 7, 8, 9])
    expect(data.last_six_months[4]).toMatchObject({ total_income: 5200, total_expenses: 1450, realized_balance: 3750 })
  })
})

describe('dados de exemplo', () => {
  const now = new Date('2026-10-18T12:00:00')

  it('geram seis meses até hoje, sem nada no futuro, e de forma reproduzível', () => {
    const db = seedDb({ now })
    expect(isValidDb(db)).toBe(true)
    const dates = [...db.expenses.map((e) => e.expense_date), ...db.incomes.map((i) => i.received_at)].sort()
    expect(dates[0] >= '2026-05-01').toBe(true)
    expect(dates.at(-1) <= '2026-10-18').toBe(true)
    expect(JSON.stringify(seedDb({ now }))).toBe(JSON.stringify(db))
  })

  it('o mês atual tem o já vencido confirmado e o resto previsto, com o saldo projetado coerente', () => {
    const db = seedDb({ now })
    const api = createDemoApi(db, { now: () => now })
    const data = api.handle({ method: 'GET', path: '/dashboard', authenticated: true }).data
    expect(data.month).toBe(10)
    expect(data.total_income).toBeGreaterThan(5000)
    expect(data.pending_expenses.map((p) => p.description)).toContain('Streaming')
    const projected = Math.round((data.realized_balance + data.pending_income - data.pending_expense) * 100)
    expect(Math.round(data.projected_balance * 100)).toBe(projected)
    expect(db.recurring_occurrences.some((o) => o.status === 'skipped')).toBe(true)
  })

  it('usam descrições em inglês quando a interface está em inglês', () => {
    const db = seedDb({ now, locale: 'en' })
    expect(db.recurring_rules.map((r) => r.description)).toContain('Salary')
  })

  it('exportar e importar devolvem o mesmo banco; arquivo estranho é recusado', () => {
    const db = seedDb({ now })
    expect(importDb(exportDb(db))).toEqual(db)
    expect(() => importDb('{"app":"outra-coisa"}')).toThrow('invalid_backup')
    expect(() => importDb('não é json')).toThrow('invalid_json')
  })
})
