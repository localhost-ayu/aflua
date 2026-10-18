// Adapter do axios para o modo demonstração: em vez de ir à rede, cada requisição é
// respondida pela API local (api.js) sobre os dados do localStorage. O resto do app —
// telas, hooks, tratamento de erro — não sabe a diferença.
import { AxiosError } from 'axios'
import { createDemoApi, HttpError } from './api'
import { todayYmd } from './dates'
import { loadDb, saveDb } from './store'

const LATENCY_MS = 120 // o bastante para os skeletons aparecerem, como numa API de verdade

let state = null

function session() {
  if (!state) {
    const db = loadDb()
    state = { db, api: createDemoApi(db) }
  }
  // o agendador do Laravel roda uma vez por dia; aqui, na primeira requisição do dia
  const today = todayYmd()
  if (state.db.processed_on !== today) {
    state.api.processDue(today)
    state.db.processed_on = today
    saveDb(state.db)
  }
  return state
}

/** depois de importar ou restaurar dados, a próxima requisição relê o storage */
export function forgetSession() {
  state = null
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function demoAdapter(config) {
  await wait(LATENCY_MS)
  const url = new URL(config.url, 'http://aflua.demo')
  const query = { ...Object.fromEntries(url.searchParams), ...(config.params ?? {}) }
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {})
  const authorization = config.headers?.get?.('Authorization') ?? config.headers?.Authorization
  const { db, api } = session()

  try {
    const { status, data } = api.handle({ method: config.method ?? 'get', path: url.pathname, query, body, authenticated: Boolean(authorization) })
    saveDb(db)
    return { data, status, statusText: String(status), headers: {}, config, request: {} }
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
    const response = { data: error.data, status: error.status, statusText: String(error.status), headers: {}, config, request: {} }
    throw new AxiosError(error.message, error.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, {}, response)
  }
}
