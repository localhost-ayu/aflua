import axios from 'axios'
import { describe, expect, it } from 'vitest'
import { demoAdapter } from './adapter'

// o mesmo caminho que as telas usam: um cliente axios com o adapter da demonstração
const client = (token) => axios.create({ adapter: demoAdapter, headers: token ? { Authorization: `Bearer ${token}` } : {} })

describe('adapter da demonstração', () => {
  it('responde como a API: login, dados com token e 401 sem ele', async () => {
    const login = await client().post('/login', { email: 'visitante@aflua.demo', password: 'demo' })
    expect(login.data.user.name).toBe('Visitante')

    const dashboard = await client(login.data.token).get('/dashboard')
    expect(dashboard.status).toBe(200)
    expect(dashboard.data.last_six_months).toHaveLength(6)

    await expect(client().get('/dashboard')).rejects.toMatchObject({ response: { status: 401 } })
  })

  it('erros de validação chegam como 422 com os campos, como o useFormErrors espera', async () => {
    const error = await client('demo').post('/expenses', { amount: '-1' }).catch((e) => e)
    expect(error.response.status).toBe(422)
    expect(Object.keys(error.response.data.errors)).toContain('category_id')
  })

  it('lê filtros da URL e de params', async () => {
    const all = (await client('demo').get('/expenses')).data
    const filtered = (await client('demo').get('/expenses?month=1&year=1999')).data
    const viaParams = (await client('demo').get('/expenses', { params: { month: 1, year: 1999 } })).data
    expect(all.length).toBeGreaterThan(0)
    expect(filtered).toEqual([])
    expect(viaParams).toEqual([])
  })
})
