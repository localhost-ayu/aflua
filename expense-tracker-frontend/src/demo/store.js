// Onde a demonstração guarda o "banco": só no localStorage deste navegador.
import { DB_VERSION, seedDb } from './seed'

const KEY = 'aflua-demo-db'
const TABLES = ['users', 'categories', 'expenses', 'incomes', 'recurring_rules', 'recurring_occurrences']

const currentLocale = () => {
  try {
    return localStorage.getItem('aflua-locale') === 'en' ? 'en' : 'pt-BR'
  } catch {
    return 'pt-BR'
  }
}

export function isValidDb(db) {
  return Boolean(db) && typeof db === 'object' && db.version === DB_VERSION
    && TABLES.every((table) => Array.isArray(db[table])) && db.users.length > 0
    && db.seq && typeof db.seq === 'object'
}

export function loadDb() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY))
    if (isValidDb(db)) return db
  } catch {
    // sem dados ou dados ilegíveis: começa de novo com o exemplo
  }
  return saveDb(seedDb({ locale: currentLocale() }))
}

export function saveDb(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // sem storage (aba anônima com cota zero): a demo segue só em memória
  }
  return db
}

export function resetDb() {
  return saveDb(seedDb({ locale: currentLocale() }))
}

/** o arquivo que "Exportar" baixa e "Importar" aceita */
export function exportDb(db) {
  return JSON.stringify({ app: 'aflua-demo', exported_at: new Date().toISOString(), db }, null, 2)
}

export function importDb(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('invalid_json')
  }
  const db = parsed?.app === 'aflua-demo' ? parsed.db : parsed
  if (!isValidDb(db)) throw new Error('invalid_backup')
  return saveDb(db)
}
