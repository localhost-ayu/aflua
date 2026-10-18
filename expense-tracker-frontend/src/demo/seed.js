// Dados de exemplo da demonstração: seis meses de uma vida financeira fictícia, sempre
// terminando no mês atual. Os meses passados são "vividos" pela própria API (preparar,
// confirmar, pular), com o relógio andando, para o histórico ter o mesmo formato que o
// Laravel produziria. Nenhum dado é de uma pessoa real.
import { createDemoApi } from './api'
import { DEFAULT_CATEGORIES } from './categories'
import { addMonths, daysInMonth, todayYmd, ymd } from './dates'

export const DB_VERSION = 1

export function emptyDb(now = new Date()) {
  return {
    version: DB_VERSION,
    processed_on: null,
    users: [{ id: 1, name: 'Visitante', email: 'visitante@aflua.demo', email_verified_at: null, created_at: now.toISOString(), updated_at: now.toISOString() }],
    categories: [],
    expenses: [],
    incomes: [],
    recurring_rules: [],
    recurring_occurrences: [],
    seq: {},
  }
}

// gerador pseudoaleatório com semente: os mesmos meses geram os mesmos lançamentos
function random(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const text = (locale, pt, en) => (locale === 'en' ? en : pt)

// [categoria, descrição pt, descrição en, vezes por mês [min, max], valor [min, max]]
const ONE_OFF_EXPENSES = [
  ['Alimentação', 'Mercado', 'Groceries', [3, 4], [140, 380]],
  ['Alimentação', 'Padaria', 'Bakery', [2, 4], [14, 42]],
  ['Alimentação', 'Delivery', 'Takeout', [1, 3], [38, 96]],
  ['Transporte', 'Combustível', 'Fuel', [2, 2], [150, 230]],
  ['Transporte', 'Corrida de aplicativo', 'Ride-hailing', [0, 2], [16, 42]],
  ['Saúde', 'Farmácia', 'Pharmacy', [0, 1], [28, 120]],
  ['Lazer', 'Cinema', 'Movies', [0, 1], [36, 74]],
  ['Lazer', 'Bar com amigos', 'Drinks with friends', [1, 2], [55, 160]],
  ['Outros', 'Corte de cabelo', 'Haircut', [1, 1], [45, 60]],
  ['Outros', 'Presente', 'Gift', [0, 1], [60, 180]],
]

export function seedDb({ now = new Date(), locale = 'pt-BR' } = {}) {
  const db = emptyDb(now)
  let clock = now
  const api = createDemoApi(db, { now: () => clock })
  const at = (date, hour = 10) => { clock = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`) }

  const current = { year: now.getFullYear(), month: now.getMonth() + 1 }
  const today = todayYmd(now)
  const start = addMonths(current.year, current.month, -5)
  const months = Array.from({ length: 6 }, (_, offset) => addMonths(start.year, start.month, offset))
  const dayIn = (period, day) => ymd(period.year, period.month, Math.min(day, daysInMonth(period.year, period.month)))

  // categorias padrão, como no cadastro
  at(dayIn(start, 1), 8)
  const categoryId = {}
  for (const category of DEFAULT_CATEGORIES) {
    const { id } = api.handle({ method: 'POST', path: '/categories', body: { name: category.name, color: category.color }, authenticated: true }).data
    categoryId[category.name] = id
  }

  // recorrências, criadas no primeiro mês (o primeiro lançamento já nasce confirmado)
  const rules = [
    { type: 'income', description: text(locale, 'Salário', 'Salary'), amount: '5200.00', day: 5, auto: true },
    { type: 'expense', description: text(locale, 'Aluguel', 'Rent'), amount: '1450.00', day: 10, auto: true, category: 'Moradia' },
    { type: 'expense', description: text(locale, 'Internet', 'Internet'), amount: '99.90', day: 15, auto: true, category: 'Moradia' },
    { type: 'expense', description: text(locale, 'Conta de luz', 'Electricity bill'), amount: '180.00', day: 18, auto: false, category: 'Moradia', varies: [142, 226] },
    { type: 'expense', description: text(locale, 'Academia', 'Gym'), amount: '109.90', day: 7, auto: false, category: 'Saúde' },
    { type: 'expense', description: text(locale, 'Streaming', 'Streaming'), amount: '39.90', day: 22, auto: true, category: 'Lazer' },
  ]
  const ruleIds = []
  for (const rule of rules) {
    const date = dayIn(start, rule.day)
    at(date, 9)
    const created = api.handle({
      method: 'POST', path: '/recurring-rules', authenticated: true, body: {
        type: rule.type, description: rule.description, amount: rule.amount, day_of_month: rule.day,
        auto_confirm: rule.auto, starts_on: date, ...(rule.category ? { category_id: categoryId[rule.category] } : {}),
      },
    }).data
    ruleIds.push(created.id)
  }

  months.forEach((period, index) => {
    const isCurrent = index === months.length - 1
    const rand = random(period.year * 100 + period.month)
    const lastDay = isCurrent ? Number(today.substring(8, 10)) : daysInMonth(period.year, period.month)

    // meses passados: o que o usuário (e o agendador) fizeram em cada recorrência
    if (index > 0 && !isCurrent) {
      at(dayIn(period, 1), 0)
      api.prepareForUser(period.year, period.month)
      rules.forEach((rule, ruleIndex) => {
        const occurrence = db.recurring_occurrences.find((o) => o.recurring_rule_id === ruleIds[ruleIndex] && o.year === period.year && o.month === period.month)
        if (!occurrence || occurrence.status !== 'pending') return
        const due = dayIn(period, rule.day)
        // um mês sem academia, para o histórico ter um "pulado"
        if (rule.description === rules[4].description && index === 2) {
          at(due, 20)
          api.handle({ method: 'POST', path: `/recurring-occurrences/${occurrence.id}/skip`, authenticated: true })
          return
        }
        at(due, rule.auto ? 0 : 19)
        const amount = rule.varies ? (rule.varies[0] + rand() * (rule.varies[1] - rule.varies[0])).toFixed(2) : null
        api.confirm(occurrence, amount, rule.auto)
      })
    }

    // gastos e ganhos avulsos do mês
    for (const [category, pt, en, [minTimes, maxTimes], [minValue, maxValue]] of ONE_OFF_EXPENSES) {
      const times = minTimes + Math.floor(rand() * (maxTimes - minTimes + 1))
      for (let n = 0; n < times; n++) {
        const day = 1 + Math.floor(rand() * lastDay)
        const amount = (minValue + rand() * (maxValue - minValue)).toFixed(2)
        at(dayIn(period, day), 18)
        api.handle({ method: 'POST', path: '/expenses', authenticated: true, body: { category_id: categoryId[category], description: text(locale, pt, en), amount, expense_date: dayIn(period, day) } })
      }
    }
    if (rand() < 0.5) {
      const day = 1 + Math.floor(rand() * lastDay)
      at(dayIn(period, day), 16)
      api.handle({ method: 'POST', path: '/incomes', authenticated: true, body: { description: text(locale, 'Freela de design', 'Design freelance'), amount: (700 + Math.round(rand() * 9) * 100).toFixed(2), received_at: dayIn(period, day) } })
    }
  })

  // o mês atual: o agendador confirma o que já venceu; o resto fica previsto
  clock = now
  api.processDue(today)
  db.processed_on = today
  return db
}
