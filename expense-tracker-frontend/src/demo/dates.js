// Datas como o Laravel as trata nesta API: dias são strings 'YYYY-MM-DD' (sem fuso),
// e o JSON as devolve no formato do cast `date` ('YYYY-MM-DDT00:00:00.000000Z').

const pad = (value) => String(value).padStart(2, '0')

export const ymd = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`

export function todayYmd(now = new Date()) {
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function parseYmd(value) {
  const [year, month, day] = String(value).substring(0, 10).split('-').map(Number)
  return { year, month, day }
}

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function startOfMonth(value) {
  const { year, month } = parseYmd(value)
  return ymd(year, month, 1)
}

export function addMonths(year, month, delta) {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export const isValidYmd = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const { year, month, day } = parseYmd(value)
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

/** como o cast `date` do Eloquent serializa */
export const asDateJson = (value) => (value ? `${String(value).substring(0, 10)}T00:00:00.000000Z` : null)

export const nowIso = (now = new Date()) => now.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z')
