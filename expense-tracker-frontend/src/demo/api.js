// A API do aflua reescrita para rodar no navegador, só no modo demonstração.
//
// Espelha o Laravel em expense-tracker-api: mesmas rotas, regras de negócio (serviços de
// recorrência, dashboard), códigos de erro (404, 409, 422) e formato do JSON (valores
// como texto com 2 casas, datas no formato do cast `date`). Não conhece React nem
// localStorage: recebe o "banco" (um objeto) e o altera; quem chama decide onde guardar.
// Ao mudar uma regra no PHP, mude aqui também — os testes em api.test.js cobrem as duas.
import { addMonths, asDateJson, daysInMonth, isValidYmd, nowIso, parseYmd, startOfMonth, todayYmd, ymd } from './dates'
import { DEFAULT_CATEGORY_COLORS } from './categories'

export class HttpError extends Error {
  constructor(status, data) {
    super(data?.message ?? `HTTP ${status}`)
    this.status = status
    this.data = data
  }
}

const abort = (status, message) => { throw new HttpError(status, { message }) }
const invalid = (errors) => {
  throw new HttpError(422, { message: Object.values(errors)[0][0], errors })
}

// ── dinheiro: centavos inteiros, como o amountInCents() do DashboardController ──
export function toCents(amount) {
  const decimal = typeof amount === 'string' ? amount : Number(amount).toFixed(2)
  const [units, fraction = '0'] = decimal.split('.')
  const sign = units.startsWith('-') ? -1 : 1
  return sign * (Math.abs(parseInt(units, 10) || 0) * 100 + parseInt(fraction.padEnd(2, '0').substring(0, 2), 10))
}
const fromCents = (cents) => (cents / 100).toFixed(2)
const centsToNumber = (cents) => cents / 100

// ── validação (o subconjunto das regras do Laravel que esta API usa) ──
function requireAmount(value, field = 'amount') {
  const text = String(value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) invalid({ [field]: [`The ${field} field must be a number with up to 2 decimals.`] })
  const cents = toCents(text)
  if (cents < 1 || cents > 9999999999) invalid({ [field]: [`The ${field} field must be between 0.01 and 99999999.99.`] })
  return fromCents(cents)
}
function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) invalid({ [field]: [`The ${field} field is required.`] })
  if (value.length > 255) invalid({ [field]: [`The ${field} field must not be greater than 255 characters.`] })
  return value
}
function requireDate(value, field) {
  if (!isValidYmd(value)) invalid({ [field]: [`The ${field} field must be a valid date.`] })
  return String(value)
}
function requireDay(value, field = 'day_of_month') {
  const day = Number(value)
  if (!Number.isInteger(day) || day < 1 || day > 31) invalid({ [field]: [`The ${field} field must be between 1 and 31.`] })
  return day
}
const has = (object, key) => object != null && Object.prototype.hasOwnProperty.call(object, key)

export function createDemoApi(db, { now = () => new Date() } = {}) {
  const stamp = () => nowIso(now())
  const today = () => todayYmd(now())
  const nextId = (table) => (db.seq[table] = (db.seq[table] ?? 0) + 1)
  const insert = (table, row) => {
    const record = { id: nextId(table), ...row, created_at: row.created_at ?? stamp(), updated_at: row.updated_at ?? stamp() }
    db[table].push(record)
    return record
  }
  const touch = (record, changes) => Object.assign(record, changes, { updated_at: stamp() })
  const remove = (table, record) => { db[table] = db[table].filter((row) => row !== record) }
  const find = (table, id) => db[table].find((row) => row.id === Number(id))
  const findOr404 = (table, id) => find(table, id) ?? abort(404, 'Not found.')
  const user = () => db.users[0]

  // ── serialização: o que o Eloquent devolveria com cada `with()` ──
  const categoryJson = (category) => (category ? { ...category } : null)
  const ruleJson = (rule, { withCategory = false } = {}) => ({
    ...rule,
    amount: rule.amount,
    starts_on: asDateJson(rule.starts_on),
    ends_on: asDateJson(rule.ends_on),
    ...(withCategory ? { category: categoryJson(find('categories', rule.category_id)) } : {}),
  })
  const occurrenceOf = (field, id) => db.recurring_occurrences.find((occurrence) => occurrence[field] === id)
  const expenseJson = (expense, { relations = true } = {}) => {
    const json = { ...expense, expense_date: asDateJson(expense.expense_date) }
    if (!relations) return json
    const occurrence = occurrenceOf('linked_expense_id', expense.id)
    return {
      ...json,
      category: categoryJson(find('categories', expense.category_id)),
      recurring_occurrence: occurrence ? { ...occurrence, rule: ruleJson(find('recurring_rules', occurrence.recurring_rule_id)) } : null,
    }
  }
  const incomeJson = (income, { relations = true } = {}) => {
    const json = { ...income, received_at: asDateJson(income.received_at) }
    if (!relations) return json
    const occurrence = occurrenceOf('linked_income_id', income.id)
    return { ...json, recurring_occurrence: occurrence ? { ...occurrence, rule: ruleJson(find('recurring_rules', occurrence.recurring_rule_id)) } : null }
  }
  const occurrenceJson = (occurrence, { entries = true } = {}) => {
    const expense = occurrence.linked_expense_id ? find('expenses', occurrence.linked_expense_id) : null
    const income = occurrence.linked_income_id ? find('incomes', occurrence.linked_income_id) : null
    return {
      ...occurrence,
      rule: ruleJson(find('recurring_rules', occurrence.recurring_rule_id), { withCategory: true }),
      ...(entries ? { expense: expense ? expenseJson(expense, { relations: false }) : null, income: income ? incomeJson(income, { relations: false }) : null } : {}),
    }
  }

  // ── RecurringOccurrenceService ──
  function effectiveDate(rule, year, month) {
    return ymd(year, month, Math.min(rule.day_of_month, daysInMonth(year, month)))
  }

  function prepareRule(rule, year, month) {
    const periodStart = ymd(year, month, 1)
    const effective = effectiveDate(rule, year, month)
    if (!rule.active
      || periodStart <= startOfMonth(rule.starts_on)
      || periodStart <= startOfMonth(rule.created_at)
      || (rule.ends_on && effective > rule.ends_on)) return null
    return db.recurring_occurrences.find((o) => o.recurring_rule_id === rule.id && o.year === year && o.month === month)
      ?? insert('recurring_occurrences', {
        recurring_rule_id: rule.id, year, month, status: 'pending',
        linked_expense_id: null, linked_income_id: null, auto_confirmed_at: null, auto_confirm_suppressed: false,
      })
  }

  const prepareForUser = (year, month) => db.recurring_rules.filter((rule) => rule.active).forEach((rule) => prepareRule(rule, year, month))

  function confirm(occurrence, amount = null, automatic = false) {
    if (occurrence.status !== 'pending') abort(409, 'occurrence_not_pending')
    const rule = find('recurring_rules', occurrence.recurring_rule_id)
    if (!rule.active) abort(409, 'rule_inactive')
    const date = effectiveDate(rule, occurrence.year, occurrence.month)
    if (rule.ends_on && date > rule.ends_on) abort(409, 'rule_expired')
    const entryAmount = amount ?? rule.amount
    if (rule.type === 'expense') {
      const entry = insert('expenses', { user_id: user().id, category_id: rule.category_id, description: rule.description, amount: entryAmount, expense_date: date })
      occurrence.linked_expense_id = entry.id
    } else {
      const entry = insert('incomes', { user_id: user().id, description: rule.description, amount: entryAmount, received_at: date })
      occurrence.linked_income_id = entry.id
    }
    touch(occurrence, { status: 'confirmed', auto_confirmed_at: automatic ? stamp() : null })
    return occurrence
  }

  function skip(occurrence) {
    if (occurrence.status !== 'pending') abort(409, 'occurrence_not_pending')
    return touch(occurrence, { status: 'skipped' })
  }

  function linkedEntry(occurrence) {
    const rule = find('recurring_rules', occurrence.recurring_rule_id)
    return rule.type === 'expense' ? find('expenses', occurrence.linked_expense_id) : find('incomes', occurrence.linked_income_id)
  }

  function adjust(occurrence, amount) {
    if (occurrence.status !== 'confirmed') abort(409, 'occurrence_not_confirmed')
    const entry = linkedEntry(occurrence) ?? abort(409, 'linked_entry_missing')
    touch(entry, { amount })
    return occurrence
  }

  function reopen(occurrence) {
    if (occurrence.status !== 'skipped') abort(409, 'occurrence_not_skipped')
    const rule = find('recurring_rules', occurrence.recurring_rule_id)
    if (rule.ends_on && effectiveDate(rule, occurrence.year, occurrence.month) > rule.ends_on) abort(409, 'rule_expired')
    return touch(occurrence, { status: 'pending', auto_confirm_suppressed: true })
  }

  function undoConfirmation(occurrence) {
    if (occurrence.status !== 'confirmed') abort(409, 'occurrence_not_confirmed')
    const rule = find('recurring_rules', occurrence.recurring_rule_id)
    const entry = linkedEntry(occurrence) ?? abort(409, 'linked_entry_missing')
    touch(occurrence, { status: 'pending', linked_expense_id: null, linked_income_id: null, auto_confirmed_at: null, auto_confirm_suppressed: true })
    remove(rule.type === 'expense' ? 'expenses' : 'incomes', entry)
    return occurrence
  }

  /** o que o agendador do Laravel faz todo dia às 00:10 (recurrences:process) */
  function processDue(day = today()) {
    const { year, month } = parseYmd(day)
    let confirmed = 0
    for (const rule of db.recurring_rules.filter((r) => r.active)) {
      const occurrence = prepareRule(rule, year, month)
      if (occurrence && rule.auto_confirm && occurrence.status === 'pending' && !occurrence.auto_confirm_suppressed
        && effectiveDate(rule, year, month) <= day) {
        try {
          confirm(occurrence, null, true)
          confirmed++
        } catch (error) {
          if (!(error instanceof HttpError) || error.status !== 409) throw error
        }
      }
    }
    return confirmed
  }

  // ── EntryRecurrenceService ──
  function detach(occurrence, status = 'skipped') {
    touch(occurrence, { status, linked_expense_id: null, linked_income_id: null, auto_confirmed_at: null, auto_confirm_suppressed: true })
  }

  function updateEntry(entry, kind, attributes, recurrence) {
    const field = kind === 'expense' ? 'linked_expense_id' : 'linked_income_id'
    const dateField = kind === 'expense' ? 'expense_date' : 'received_at'
    const occurrence = occurrenceOf(field, entry.id)
    const enabled = recurrence?.enabled ?? null
    const date = parseYmd(attributes[dateField] ?? entry[dateField])

    if (occurrence && enabled !== false && (occurrence.year !== date.year || occurrence.month !== date.month)) {
      invalid({ [dateField]: ['A recurring entry must remain in its original month.'] })
    }
    if (occurrence && enabled === false) {
      touch(find('recurring_rules', occurrence.recurring_rule_id), { active: false })
      detach(occurrence)
    }
    touch(entry, attributes)
    if (recurrence && enabled === true) {
      const details = {
        description: entry.description,
        amount: entry.amount,
        day_of_month: recurrence.day_of_month,
        category_id: kind === 'expense' ? entry.category_id : null,
        auto_confirm: recurrence.auto_confirm ?? true,
        active: true,
      }
      if (occurrence) touch(find('recurring_rules', occurrence.recurring_rule_id), details)
      else {
        const rule = insert('recurring_rules', { user_id: user().id, ...details, type: kind, starts_on: entry[dateField], ends_on: null })
        insert('recurring_occurrences', {
          recurring_rule_id: rule.id, year: date.year, month: date.month, status: 'confirmed',
          linked_expense_id: kind === 'expense' ? entry.id : null, linked_income_id: kind === 'income' ? entry.id : null,
          auto_confirmed_at: null, auto_confirm_suppressed: false,
        })
      }
    }
    return entry
  }

  function deleteEntry(entry, kind, action = 'skipped') {
    const occurrence = occurrenceOf(kind === 'expense' ? 'linked_expense_id' : 'linked_income_id', entry.id)
    if (occurrence) detach(occurrence, action)
    remove(kind === 'expense' ? 'expenses' : 'incomes', entry)
  }

  // ── DashboardController ──
  const inMonth = (date, year, month) => { const d = parseYmd(date); return d.year === year && d.month === month }

  function dashboard(query) {
    const current = parseYmd(today())
    const month = query.month ? Number(query.month) : current.month
    const year = query.year ? Number(query.year) : current.year
    if (!(month >= 1 && month <= 12)) invalid({ month: ['The month field must be between 1 and 12.'] })

    const expenses = db.expenses.filter((e) => inMonth(e.expense_date, year, month))
    const incomes = db.incomes.filter((i) => inMonth(i.received_at, year, month))
    const expenseCents = expenses.reduce((sum, e) => sum + toCents(e.amount), 0)
    const incomeCents = incomes.reduce((sum, i) => sum + toCents(i.amount), 0)
    const realizedCents = incomeCents - expenseCents

    const pending = db.recurring_occurrences
      .filter((o) => o.year === year && o.month === month && o.status === 'pending')
      .map((o) => ({ occurrence: o, rule: find('recurring_rules', o.recurring_rule_id) }))
      .filter(({ rule }) => rule?.active)
      .filter(({ rule }) => {
        const due = effectiveDate(rule, year, month)
        return startOfMonth(due) >= startOfMonth(rule.starts_on) && (!rule.ends_on || due <= rule.ends_on)
      })
      .map(({ occurrence, rule }) => {
        const category = find('categories', rule.category_id)
        return {
          id: occurrence.id,
          rule_id: rule.id,
          type: rule.type,
          description: rule.description,
          amount: rule.amount,
          due_date: effectiveDate(rule, year, month),
          category: category ? { id: category.id, name: category.name, color: category.color } : null,
        }
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date))

    const pendingIncomes = pending.filter((p) => p.type === 'income')
    const pendingExpenses = pending.filter((p) => p.type === 'expense')
    const pendingIncomeCents = pendingIncomes.reduce((sum, p) => sum + toCents(p.amount), 0)
    const pendingExpenseCents = pendingExpenses.reduce((sum, p) => sum + toCents(p.amount), 0)

    const totals = new Map()
    for (const e of expenses) totals.set(e.category_id, (totals.get(e.category_id) ?? 0) + toCents(e.amount))
    const byCategory = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoryId, cents]) => {
        const category = find('categories', categoryId)
        return { category: category?.name ?? '', color: category?.color ?? '#999999', total: centsToNumber(cents) }
      })

    const history = []
    for (let offset = -5; offset <= 0; offset++) {
      const period = addMonths(year, month, offset)
      const out = db.expenses.filter((e) => inMonth(e.expense_date, period.year, period.month)).reduce((sum, e) => sum + toCents(e.amount), 0)
      const inc = db.incomes.filter((i) => inMonth(i.received_at, period.year, period.month)).reduce((sum, i) => sum + toCents(i.amount), 0)
      history.push({
        year: period.year, month: period.month,
        total: centsToNumber(out), total_expenses: centsToNumber(out), total_income: centsToNumber(inc),
        realized_balance: centsToNumber(inc - out),
      })
    }

    return {
      month, year,
      total_this_month: centsToNumber(expenseCents),
      total_income: centsToNumber(incomeCents),
      net_balance: centsToNumber(realizedCents),
      realized_balance: centsToNumber(realizedCents),
      projected_balance: centsToNumber(realizedCents + pendingIncomeCents - pendingExpenseCents),
      pending_income: centsToNumber(pendingIncomeCents),
      pending_expense: centsToNumber(pendingExpenseCents),
      pending_incomes: pendingIncomes,
      pending_expenses: pendingExpenses,
      by_category: byCategory,
      last_six_months: history,
    }
  }

  // ── RecurringOccurrenceController ──
  function period(input) {
    const month = Number(input.month)
    const year = Number(input.year)
    if (!Number.isInteger(month) || month < 1 || month > 12) invalid({ month: ['The month field must be between 1 and 12.'] })
    if (!Number.isInteger(year) || year < 1 || year > 9999) invalid({ year: ['The year field must be between 1 and 9999.'] })
    return { month, year }
  }

  function occurrenceIndex(input) {
    const { month, year } = period(input)
    return db.recurring_occurrences
      .filter((o) => o.year === year && o.month === month)
      .sort((a, b) => a.id - b.id)
      .filter((o) => {
        const rule = find('recurring_rules', o.recurring_rule_id)
        return o.status !== 'pending' || !rule.ends_on || effectiveDate(rule, o.year, o.month) <= rule.ends_on
      })
      .map((o) => occurrenceJson(o))
  }

  // ── RecurringRuleController ──
  function ruleIndex() {
    return [...db.recurring_rules].sort((a, b) => b.id - a.id).map((rule) => ({
      ...ruleJson(rule, { withCategory: true }),
      linked_entries_count: db.recurring_occurrences.filter((o) => o.recurring_rule_id === rule.id && o.status === 'confirmed'
        && (o.linked_expense_id || o.linked_income_id)).length,
    }))
  }

  function categoryFor(value, field = 'category_id') {
    const category = find('categories', value)
    if (!category) invalid({ [field]: ['The selected category id is invalid.'] })
    return category.id
  }

  function storeRule(body) {
    if (!['expense', 'income'].includes(body.type)) invalid({ type: ['The selected type is invalid.'] })
    const data = {
      type: body.type,
      description: requireText(body.description, 'description'),
      amount: requireAmount(body.amount),
      day_of_month: requireDay(body.day_of_month),
      category_id: body.type === 'expense' ? categoryFor(body.category_id) : null,
      starts_on: requireDate(body.starts_on, 'starts_on'),
      ends_on: body.ends_on ? requireDate(body.ends_on, 'ends_on') : null,
      auto_confirm: has(body, 'auto_confirm') ? Boolean(body.auto_confirm) : true,
      active: true,
    }
    if (data.ends_on && data.ends_on < data.starts_on) invalid({ ends_on: ['The ends on field must be a date after or equal to starts on.'] })
    const rule = insert('recurring_rules', { user_id: user().id, ...data })
    const first = parseYmd(data.starts_on)
    const entry = data.type === 'expense'
      ? insert('expenses', { user_id: user().id, category_id: data.category_id, description: data.description, amount: data.amount, expense_date: data.starts_on })
      : insert('incomes', { user_id: user().id, description: data.description, amount: data.amount, received_at: data.starts_on })
    insert('recurring_occurrences', {
      recurring_rule_id: rule.id, year: first.year, month: first.month, status: 'confirmed',
      linked_expense_id: data.type === 'expense' ? entry.id : null, linked_income_id: data.type === 'income' ? entry.id : null,
      auto_confirmed_at: null, auto_confirm_suppressed: false,
    })
    return {
      ...ruleJson(rule, { withCategory: true }),
      occurrences: db.recurring_occurrences.filter((o) => o.recurring_rule_id === rule.id).map((o) => ({ ...o })),
    }
  }

  function updateRule(rule, body) {
    if (has(body, 'type')) invalid({ type: ['The type field is prohibited.'] })
    if (has(body, 'starts_on')) invalid({ starts_on: ['The starts on field is prohibited.'] })
    const changes = {}
    if (has(body, 'description')) changes.description = requireText(body.description, 'description')
    if (has(body, 'amount')) changes.amount = requireAmount(body.amount)
    if (has(body, 'day_of_month')) changes.day_of_month = requireDay(body.day_of_month)
    if (has(body, 'category_id')) {
      if (rule.type !== 'expense') invalid({ category_id: ['The category id field is prohibited.'] })
      changes.category_id = categoryFor(body.category_id)
    }
    if (has(body, 'ends_on')) {
      changes.ends_on = body.ends_on ? requireDate(body.ends_on, 'ends_on') : null
      if (changes.ends_on && changes.ends_on < rule.starts_on) invalid({ ends_on: [`The ends on field must be a date after or equal to ${rule.starts_on}.`] })
    }
    if (has(body, 'active')) changes.active = Boolean(body.active)
    if (has(body, 'auto_confirm')) changes.auto_confirm = Boolean(body.auto_confirm)
    touch(rule, changes)
    return ruleJson(rule, { withCategory: true })
  }

  function destroyRule(rule, body) {
    if (!['keep_entries', 'delete_entries'].includes(body?.mode)) invalid({ mode: ['The selected mode is invalid.'] })
    const occurrences = db.recurring_occurrences.filter((o) => o.recurring_rule_id === rule.id)
    const expenseIds = new Set(occurrences.map((o) => o.linked_expense_id).filter(Boolean))
    const incomeIds = new Set(occurrences.map((o) => o.linked_income_id).filter(Boolean))
    db.recurring_occurrences = db.recurring_occurrences.filter((o) => o.recurring_rule_id !== rule.id)
    if (body.mode === 'delete_entries') {
      db.expenses = db.expenses.filter((e) => !expenseIds.has(e.id))
      db.incomes = db.incomes.filter((i) => !incomeIds.has(i.id))
    }
    remove('recurring_rules', rule)
  }

  // ── despesas e ganhos ──
  function expenseAttributes(body, partial) {
    const attributes = {}
    if (!partial || has(body, 'category_id')) attributes.category_id = categoryFor(body.category_id)
    if (!partial || has(body, 'amount')) attributes.amount = requireAmount(body.amount)
    if (!partial || has(body, 'description')) attributes.description = requireText(body.description, 'description')
    if (!partial || has(body, 'expense_date')) attributes.expense_date = requireDate(body.expense_date, 'expense_date')
    return attributes
  }
  function incomeAttributes(body, partial) {
    const attributes = {}
    if (!partial || has(body, 'description')) attributes.description = requireText(body.description, 'description')
    if (!partial || has(body, 'amount')) attributes.amount = requireAmount(body.amount)
    if (!partial || has(body, 'received_at')) attributes.received_at = requireDate(body.received_at, 'received_at')
    return attributes
  }
  function recurrenceInput(body) {
    if (!has(body, 'recurrence')) return null
    const recurrence = body.recurrence ?? {}
    if (typeof recurrence.enabled !== 'boolean') invalid({ 'recurrence.enabled': ['The recurrence.enabled field is required.'] })
    if (recurrence.enabled) recurrence.day_of_month = requireDay(recurrence.day_of_month, 'recurrence.day_of_month')
    return recurrence
  }
  function occurrenceAction(body) {
    const action = body?.occurrence_action ?? 'skipped'
    if (!['pending', 'skipped'].includes(action)) invalid({ occurrence_action: ['The selected occurrence action is invalid.'] })
    return action
  }

  // ── categorias ──
  function storeCategory(body) {
    const name = requireText(body.name, 'name')
    let color = body.color
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) invalid({ color: ['The color field format is invalid.'] })
    if (color === undefined) {
      const index = db.categories.length
      color = DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length]
      if (db.categories.at(-1)?.color === color) color = DEFAULT_CATEGORY_COLORS[(index + 1) % DEFAULT_CATEGORY_COLORS.length]
    }
    return insert('categories', { user_id: user().id, name, color, icon: null })
  }

  // ── rotas: o routes/api.php ──
  const routes = [
    ['POST', /^\/register$/, false, () => ({ status: 201, data: { user: user(), token: 'demo' } })],
    ['POST', /^\/login$/, false, () => ({ data: { user: user(), token: 'demo' } })],
    ['POST', /^\/logout$/, true, () => ({ data: { message: 'Logout realizado com sucesso.' } })],
    ['GET', /^\/me$/, true, () => ({ data: user() })],

    ['GET', /^\/categories$/, true, () => ({ data: [...db.categories].sort((a, b) => a.id - b.id) })],
    ['POST', /^\/categories$/, true, (_, body) => ({ status: 201, data: storeCategory(body) })],
    ['GET', /^\/categories\/(\d+)$/, true, (m) => ({ data: findOr404('categories', m[1]) })],
    ['PUT', /^\/categories\/(\d+)$/, true, (m, body) => {
      const category = findOr404('categories', m[1])
      const changes = {}
      if (has(body, 'name')) changes.name = requireText(body.name, 'name')
      if (has(body, 'color')) {
        if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) invalid({ color: ['The color field format is invalid.'] })
        changes.color = body.color
      }
      return { data: touch(category, changes) }
    }],
    ['DELETE', /^\/categories\/(\d+)$/, true, (m) => {
      const category = findOr404('categories', m[1])
      if (db.expenses.some((e) => e.category_id === category.id) || db.recurring_rules.some((r) => r.category_id === category.id)) abort(409, 'category_in_use')
      remove('categories', category)
      return { status: 204, data: null }
    }],

    ['GET', /^\/expenses$/, true, (_, __, query) => {
      let rows = db.expenses
      if (query.category_id) rows = rows.filter((e) => e.category_id === Number(query.category_id))
      if (query.month) rows = rows.filter((e) => parseYmd(e.expense_date).month === Number(query.month))
      if (query.year) rows = rows.filter((e) => parseYmd(e.expense_date).year === Number(query.year))
      return { data: [...rows].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.id - a.id).map((e) => expenseJson(e)) }
    }],
    ['POST', /^\/expenses$/, true, (_, body) => ({ status: 201, data: expenseJson(insert('expenses', { user_id: user().id, ...expenseAttributes(body, false) })) })],
    ['GET', /^\/expenses\/(\d+)$/, true, (m) => ({ data: expenseJson(findOr404('expenses', m[1])) })],
    ['PUT', /^\/expenses\/(\d+)$/, true, (m, body) => {
      const expense = findOr404('expenses', m[1])
      return { data: expenseJson(updateEntry(expense, 'expense', expenseAttributes(body, true), recurrenceInput(body))) }
    }],
    ['DELETE', /^\/expenses\/(\d+)$/, true, (m, body) => {
      deleteEntry(findOr404('expenses', m[1]), 'expense', occurrenceAction(body))
      return { status: 204, data: null }
    }],

    ['GET', /^\/incomes$/, true, (_, __, query) => {
      let rows = db.incomes
      if (query.month) rows = rows.filter((i) => parseYmd(i.received_at).month === Number(query.month))
      if (query.year) rows = rows.filter((i) => parseYmd(i.received_at).year === Number(query.year))
      return { data: [...rows].sort((a, b) => b.received_at.localeCompare(a.received_at) || b.id - a.id).map((i) => incomeJson(i)) }
    }],
    ['POST', /^\/incomes$/, true, (_, body) => ({ status: 201, data: incomeJson(insert('incomes', { user_id: user().id, ...incomeAttributes(body, false) }), { relations: false }) })],
    ['GET', /^\/incomes\/(\d+)$/, true, (m) => ({ data: incomeJson(findOr404('incomes', m[1])) })],
    ['PUT', /^\/incomes\/(\d+)$/, true, (m, body) => {
      const income = findOr404('incomes', m[1])
      return { data: incomeJson(updateEntry(income, 'income', incomeAttributes(body, true), recurrenceInput(body)), { relations: false }) }
    }],
    ['DELETE', /^\/incomes\/(\d+)$/, true, (m, body) => {
      deleteEntry(findOr404('incomes', m[1]), 'income', occurrenceAction(body))
      return { status: 204, data: null }
    }],

    ['GET', /^\/recurring-rules$/, true, () => ({ data: ruleIndex() })],
    ['POST', /^\/recurring-rules$/, true, (_, body) => ({ status: 201, data: storeRule(body) })],
    ['PATCH', /^\/recurring-rules\/(\d+)$/, true, (m, body) => ({ data: updateRule(findOr404('recurring_rules', m[1]), body) })],
    ['DELETE', /^\/recurring-rules\/(\d+)$/, true, (m, body) => { destroyRule(findOr404('recurring_rules', m[1]), body); return { status: 204, data: null } }],

    ['GET', /^\/recurring-occurrences$/, true, (_, __, query) => ({ data: occurrenceIndex(query) })],
    ['POST', /^\/recurring-occurrences\/prepare$/, true, (_, body) => {
      const { month, year } = period(body)
      prepareForUser(year, month)
      return { data: occurrenceIndex({ month, year }) }
    }],
    ['POST', /^\/recurring-occurrences\/(\d+)\/confirm$/, true, (m, body) => {
      const amount = has(body, 'amount') ? requireAmount(body.amount) : null
      return { data: occurrenceJson(confirm(findOr404('recurring_occurrences', m[1]), amount)) }
    }],
    ['POST', /^\/recurring-occurrences\/(\d+)\/skip$/, true, (m) => ({ data: occurrenceJson(skip(findOr404('recurring_occurrences', m[1])), { entries: false }) })],
    ['PATCH', /^\/recurring-occurrences\/(\d+)\/amount$/, true, (m, body) => ({ data: occurrenceJson(adjust(findOr404('recurring_occurrences', m[1]), requireAmount(body.amount))) })],
    ['POST', /^\/recurring-occurrences\/(\d+)\/undo$/, true, (m) => ({ data: occurrenceJson(undoConfirmation(findOr404('recurring_occurrences', m[1])), { entries: false }) })],
    ['POST', /^\/recurring-occurrences\/(\d+)\/reopen$/, true, (m) => ({ data: occurrenceJson(reopen(findOr404('recurring_occurrences', m[1])), { entries: false }) })],

    ['GET', /^\/dashboard$/, true, (_, __, query) => ({ data: dashboard(query) })],
  ]

  /**
   * Atende uma requisição como o Laravel atenderia. `authenticated` faz o papel do
   * middleware auth:sanctum. Lança HttpError para respostas de erro.
   */
  function handle({ method, path, query = {}, body = {}, authenticated = false }) {
    const verb = method.toUpperCase()
    for (const [routeMethod, pattern, protectedRoute, run] of routes) {
      const match = verb === routeMethod && pattern.exec(path)
      if (!match) continue
      if (protectedRoute && !authenticated) abort(401, 'Unauthenticated.')
      const { status = 200, data } = run(match, body ?? {}, query)
      return { status, data }
    }
    abort(404, `The route ${path} could not be found.`)
  }

  return { handle, processDue, prepareForUser, confirm, effectiveDate }
}
