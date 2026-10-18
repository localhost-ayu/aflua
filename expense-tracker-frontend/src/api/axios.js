import axios from 'axios'
import { demoAdapter } from '../demo/adapter'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Modo demonstração (build com VITE_DEMO=true): as requisições são respondidas no
  // próprio navegador, com dados no localStorage. Fora dele, o adapter nem entra no build.
  ...(import.meta.env.VITE_DEMO === 'true' ? { adapter: demoAdapter } : {}),
})

// Interceptor de request — injeta o token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de response — trata erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api